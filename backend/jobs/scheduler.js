const cron = require("node-cron"),
  moment = require("moment-timezone"),
  crypto = require("crypto");
const Team = require("../models/Team"),
  Standup = require("../models/Standup"),
  Digest = require("../models/Digest"),
  Notification = require("../models/Notification");
async function notify(io, user, team, type, key, message) {
  const result = await Notification.updateOne(
    { dedupeKey: key },
    { $setOnInsert: { user, team, type, message, dedupeKey: key } },
    { upsert: true },
  );
  if (result.upsertedCount && io) {
    const n = await Notification.findOne({ dedupeKey: key }).select(
      "_id user team type message isRead createdAt",
    );
    io.to("user:" + user).emit("new_notification", n);
  }
}
async function processTeam(team, io, now = new Date()) {
  const local = moment(now).tz(team.timezone);
  // Catch up today's and yesterday's reminders, including deadlines crossing midnight.
  for (let offset = 1; offset >= 0; offset--) {
    const day = local.clone().startOf("day").subtract(offset, "days");
    if (
      day.isBefore(moment(team.createdAt).tz(team.timezone).startOf("day")) ||
      !team.workdays.includes(day.isoWeekday())
    )
      continue;
    const key = day.format("YYYY-MM-DD"),
      due = moment.tz(
        key + " " + team.standupTime,
        "YYYY-MM-DD HH:mm",
        team.timezone,
      );
    if (local.isBefore(due)) continue;
    const rows = await Standup.find({
      team: team._id,
      date: { $gte: day.toDate(), $lt: day.clone().add(1, "day").toDate() },
    }).select("user");
    const submitted = new Set(rows.map((s) => String(s.user)));
    for (const user of [
      ...new Set([...team.members, ...team.admins].map(String)),
    ]) {
      if (submitted.has(user)) continue;
      const missed = local.isSameOrAfter(due.clone().add(1, "hour"));
      const type = missed ? "missed_standup" : "reminder";
      await notify(
        io,
        user,
        team._id,
        type,
        [type, team._id, user, key].join(":"),
        missed
          ? "You didn't check in for " +
              team.name +
              " on " +
              day.format("dddd, D MMMM") +
              "."
          : "Time to check in for " + team.name + ".",
      );
    }
  }
  // Completed calendar periods only; rerunning fills missed notifications without duplicating digests.
  for (let offset = 1; offset <= 7; offset++) {
    const end = local
      .clone()
      .startOf("day")
      .subtract(offset - 1, "days");
    if (team.digestFrequency === "weekly" && end.isoWeekday() !== 1) continue;
    const start = end
      .clone()
      .subtract(team.digestFrequency === "weekly" ? 7 : 1, "days");
    if (end.isBefore(team.createdAt)) continue;
    const rows = await Standup.find({
      team: team._id,
      date: { $gte: start.toDate(), $lt: end.toDate() },
    }).select("_id user date blockers");
    let expected = 0;
    const participants = [
      ...new Set([...team.members, ...team.admins].map(String)),
    ];
    for (let d = start.clone(); d.isBefore(end); d.add(1, "day"))
      if (
        team.workdays.includes(d.isoWeekday()) &&
        !d.isBefore(moment(team.createdAt).tz(team.timezone).startOf("day"))
      )
        expected += participants.length;
    const actual = new Set(
      rows
        .filter(
          (s) =>
            participants.includes(String(s.user)) &&
            team.workdays.includes(
              moment(s.date).tz(team.timezone).isoWeekday(),
            ),
        )
        .map(
          (s) =>
            s.user +
            ":" +
            moment(s.date).tz(team.timezone).format("YYYY-MM-DD"),
        ),
    ).size;
    const blockerCount = rows.filter(
      (s) =>
        s.blockers &&
        s.blockers.trim() &&
        s.blockers.trim().toLowerCase() !== "none",
    ).length;
    const periodKey =
      team._id + ":" + team.digestFrequency + ":" + start.format("YYYY-MM-DD");
    await Digest.updateOne(
      { periodKey },
      {
        $setOnInsert: {
          periodKey,
          publicId: "DGT-" + crypto.randomUUID(),
          team: team._id,
          period: { from: start.toDate(), to: end.toDate() },
          standups: rows.map((s) => s._id),
          participationRate: expected
            ? Math.min(100, Math.round((actual / expected) * 100))
            : 0,
          blockerCount,
          summary:
            rows.length + " updates; " + blockerCount + " blockers reported.",
        },
      },
      { upsert: true },
    );
    for (const user of team.admins)
      await notify(
        io,
        user,
        team._id,
        "digest_ready",
        "digest:" + periodKey + ":" + user,
        "The " +
          team.digestFrequency +
          " summary for " +
          team.name +
          " is ready.",
      );
  }
}
async function retention(now = new Date()) {
  const before = new Date(now.getTime() - 30 * 86400000);
  const User = require("../models/User");
  for await (const user of User.find({
    deletedAt: { $ne: null, $lt: before },
  }).cursor()) {
    const standups = await Standup.find({ user: user._id }).select("_id");
    await Digest.updateMany(
      {},
      { $pull: { standups: { $in: standups.map((s) => s._id) } } },
    );
    await Standup.deleteMany({ user: user._id });
    await Notification.deleteMany({ user: user._id });
    for (const name of [
      "Session",
      "ActionToken",
      "Passkey",
      "MailJob",
      "Challenge",
    ]) {
      const model = require("../models/" + name);
      await model.deleteMany({ user: user._id });
    }
    await User.deleteOne({ _id: user._id });
  }
  for await (const team of Team.find({
    deletedAt: { $ne: null, $lt: before },
  }).cursor()) {
    await Standup.deleteMany({ team: team._id });
    await Digest.deleteMany({ team: team._id });
    await Notification.deleteMany({ team: team._id });
    await Team.deleteOne({ _id: team._id });
  }
  await Notification.deleteMany({
    createdAt: { $lt: new Date(now.getTime() - 90 * 86400000) },
  });
}
async function runJobs(io, now = new Date()) {
  for await (const team of Team.find({ deletedAt: null }).cursor()) {
    try {
      await processTeam(team, io, now);
    } catch (e) {
      if (e.code !== 11000)
        console.error("Scheduled team processing failed", { type: e.name });
    }
  }
  await retention(now);
  await require("./mail").deliver();
}
function startJobs(io) {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await runJobs(io);
    } catch {
      console.error("Scheduled processing failed");
    } finally {
      running = false;
    }
  };
  void run();
  return cron.schedule("* * * * *", run);
}
module.exports = { startJobs, runJobs, processTeam, retention };
