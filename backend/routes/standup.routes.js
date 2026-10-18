const router = require("express").Router(),
  crypto = require("crypto"),
  moment = require("moment-timezone");
const Standup = require("../models/Standup"),
  Team = require("../models/Team");
const auth = require("../middleware/authUser.middleware"),
  member = require("../middleware/teamMember.middleware");
const {
  schemas,
  validate,
  pagination,
  dateKey,
  id,
  z,
} = require("../lib/validation");
const { canRead, canManage, same } = require("../lib/access");
router.use(auth);
router.post("/", validate(schemas.standup), member, async (req, res) => {
  const localDate = dateKey(undefined, req.team.timezone),
    now = moment().tz(req.team.timezone);
  const start = moment.tz(localDate, req.team.timezone).startOf("day"),
    end = start.clone().add(1, "day");
  if (
    await Standup.exists({
      user: req.user._id,
      team: req.team._id,
      date: { $gte: start.toDate(), $lt: end.toDate() },
    })
  )
    return res.status(409).json({ message: "You already checked in today" });
  const cutoff = moment.tz(
    localDate + " " + req.team.standupTime,
    "YYYY-MM-DD HH:mm",
    req.team.timezone,
  );
  const standup = await Standup.create({
    ...req.body,
    team: req.team._id,
    user: req.user._id,
    publicId: "STD-" + crypto.randomUUID(),
    localDate,
    isLate: now.isAfter(cutoff),
  });
  await standup.populate("user", "name publicId");
  req.app
    .get("io")
    ?.to("team:" + req.team._id)
    .emit("new_standup", standup);
  res.status(201).json(standup);
});
router.get("/mine", async (req, res) => {
  const { skip, limit } = pagination(req);
  const teams = await Team.find({
    deletedAt: null,
    $or: [
      { members: req.user._id },
      { admins: req.user._id },
      { superAdmin: req.user._id },
    ],
  }).select("_id");
  res.json(
    await Standup.find({
      user: req.user._id,
      team: { $in: teams.map((t) => t._id) },
    })
      .sort({ date: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name publicId"),
  );
});
router.get("/team/:teamId", member, async (req, res) => {
  const { skip, limit } = pagination(req),
    day = dateKey(req.query.date, req.team.timezone),
    start = moment.tz(day, req.team.timezone),
    end = start.clone().add(1, "day");
  const filter = {
    team: req.team._id,
    date: { $gte: start.toDate(), $lt: end.toDate() },
  };
  if (req.query.user) filter.user = id.parse(req.query.user);
  res.json(
    await Standup.find(filter)
      .sort({ date: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name publicId"),
  );
});
router.get("/search", member, async (req, res) => {
  const q = z.string().trim().min(1).max(100).parse(req.query.q);
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const { skip, limit } = pagination(req);
  res.json(
    await Standup.find({
      team: req.team._id,
      $or: ["yesterday", "today", "blockers"].map((field) => ({
        [field]: { $regex: escaped, $options: "i" },
      })),
    })
      .maxTimeMS(2000)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name publicId"),
  );
});
router.patch(
  "/:id/blocker",
  validate(z.object({ status: z.enum(["open", "resolved"]) }).strict()),
  async (req, res) => {
    id.parse(req.params.id);
    const s = await Standup.findById(req.params.id);
    const t = s && (await Team.findOne({ _id: s.team, deletedAt: null }));
    if (
      !canRead(t, req.user) ||
      (!same(s.user, req.user._id) && !canManage(t, req.user))
    )
      return res.status(403).json({ message: "Access denied" });
    if (!s.blockers || s.blockers.trim().toLowerCase() === "none")
      return res.status(400).json({ message: "This standup has no blocker" });
    s.blockerStatus = req.body.status;
    s.resolvedAt = req.body.status === "resolved" ? new Date() : undefined;
    await s.save();
    res.json(s);
  },
);
router.get("/:id", async (req, res) => {
  id.parse(req.params.id);
  const s = await Standup.findById(req.params.id).populate(
    "user",
    "name publicId",
  );
  const t = s && (await Team.findOne({ _id: s.team, deletedAt: null }));
  if (!canRead(t, req.user))
    return res.status(403).json({ message: "Access denied" });
  res.json(s);
});
module.exports = router;
