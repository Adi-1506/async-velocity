const router = require("express").Router(),
  moment = require("moment-timezone");
const Standup = require("../models/Standup"),
  User = require("../models/User");
const auth = require("../middleware/authUser.middleware"),
  member = require("../middleware/teamMember.middleware");
const { z } = require("../lib/validation");
router.get("/team/:teamId", auth, member, async (req, res) => {
  const days = z.coerce
      .number()
      .int()
      .min(1)
      .max(90)
      .default(7)
      .parse(req.query.days),
    team = req.team;
  const end = moment().tz(team.timezone).endOf("day"),
    start = end
      .clone()
      .startOf("day")
      .subtract(days - 1, "days");
  const rows = await Standup.aggregate([
    {
      $match: {
        team: team._id,
        date: { $gte: start.toDate(), $lte: end.toDate() },
      },
    },
    {
      $project: {
        user: 1,
        blockers: 1,
        blockerStatus: 1,
        day: {
          $dateToString: {
            date: "$date",
            format: "%Y-%m-%d",
            timezone: team.timezone,
          },
        },
      },
    },
  ]).option({ maxTimeMS: 5000 });
  const participants = [
    ...new Set([...team.members, ...team.admins].map(String)),
  ];
  const users = await User.find({ _id: { $in: participants } }).select(
    "_id createdAt",
  );
  const chart = [];
  let expected = 0,
    actual = 0;
  for (let i = 0; i < days; i++) {
    const day = start.clone().add(i, "days"),
      key = day.format("YYYY-MM-DD");
    const eligible = users.filter(
      (u) =>
        u.createdAt <= day.clone().endOf("day").toDate() &&
        team.createdAt <= day.clone().endOf("day").toDate(),
    );
    const count = new Set(
      rows.filter((r) => r.day === key).map((r) => String(r.user)),
    ).size;
    chart.push({ date: key, count });
    if (team.workdays.includes(day.isoWeekday())) {
      expected += eligible.length;
      actual += new Set(
        rows
          .filter(
            (r) =>
              r.day === key &&
              eligible.some((u) => String(u._id) === String(r.user)),
          )
          .map((r) => String(r.user)),
      ).size;
    }
  }
  const blockers = rows.filter(
    (r) =>
      r.blockers &&
      r.blockers.trim() &&
      r.blockers.trim().toLowerCase() !== "none",
  );
  res.json({
    checkInRate: expected
      ? Math.min(100, Math.round((actual / expected) * 100))
      : 0,
    blockersReported: blockers.length,
    blockersResolved: blockers.filter((r) => r.blockerStatus === "resolved")
      .length,
    consistencyChart: chart,
    days,
    participationBasis:
      "Current membership on configured workdays; membership history is not reconstructed",
  });
});
module.exports = router;
