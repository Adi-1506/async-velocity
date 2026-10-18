const router = require("express").Router(),
  crypto = require("crypto");
const Team = require("../models/Team"),
  User = require("../models/User");
const auth = require("../middleware/authUser.middleware"),
  admin = require("../middleware/authAdmin.middleware"),
  superOnly = require("../middleware/superAdminOnly.middleware");
const { canManage, same } = require("../lib/access");
const { schemas, validate, pagination, id } = require("../lib/validation");
const { revokeUser } = require("../lib/sessions");
async function manage(req, res, next) {
  id.parse(req.params.teamId);
  const t = await Team.findOne({ _id: req.params.teamId, deletedAt: null });
  if (!canManage(t, req.user))
    return res.status(403).json({ message: "Team access denied" });
  req.team = t;
  next();
}
router.get("/", auth, async (req, res) => {
  const { limit, skip } = pagination(req),
    u = req.user;
  const filter = {
    deletedAt: null,
    ...(u.role === "superadmin"
      ? {}
      : {
          $or: [{ admins: u._id }, { members: u._id }, { superAdmin: u._id }],
        }),
  };
  res.json(
    await Team.find(filter)
      .sort({ _id: 1 })
      .skip(skip)
      .limit(limit)
      .populate("admins", "name email"),
  );
});
router.post("/", admin, superOnly, validate(schemas.team), async (req, res) =>
  res.status(201).json(
    await Team.create({
      ...req.body,
      publicId: "TM-" + crypto.randomUUID(),
      superAdmin: req.user._id,
      admins: [req.user._id],
    }),
  ),
);
router.get(
  "/:teamId",
  auth,
  require("../middleware/teamMember.middleware"),
  (req, res) => res.json(req.team),
);
router.get("/:teamId/members", admin, manage, async (req, res) => {
  const t = await Team.findById(req.team._id)
    .populate("admins", "name email publicId role")
    .populate("members", "name email publicId role");
  const { limit, skip } = pagination(req);
  res.json({
    admins: t.admins.slice(skip, skip + limit),
    members: t.members.slice(skip, skip + limit),
  });
});
router.post(
  "/:teamId/invite",
  admin,
  manage,
  validate(schemas.invite),
  async (req, res) => {
    const u = await User.findOne({ email: req.body.email });
    if (!u)
      return res.status(404).json({
        message:
          "No registered user with that email. Ask them to register first.",
      });
    if (req.team.admins.some((x) => same(x, u._id)))
      return res
        .status(409)
        .json({ message: "User is already an administrator" });
    await Team.updateOne(
      { _id: req.team._id },
      { $addToSet: { members: u._id } },
    );
    res.json({ message: "Member added" });
  },
);
router.delete("/:teamId/members/:userId", admin, manage, async (req, res) => {
  id.parse(req.params.userId);
  await Team.updateOne(
    { _id: req.team._id },
    { $pull: { members: req.params.userId } },
  );
  await revokeUser(req.params.userId, req.app.get("io"));
  res.json({ message: "Member removed" });
});
router.patch(
  "/:teamId/settings",
  admin,
  manage,
  validate(schemas.settings),
  async (req, res) => {
    Object.assign(req.team, req.body);
    await req.team.save();
    res.json(req.team);
  },
);
router.post(
  "/:teamId/promote/:userId",
  admin,
  superOnly,
  manage,
  async (req, res) => {
    id.parse(req.params.userId);
    if (!req.team.members.some((x) => same(x, req.params.userId)))
      return res.status(400).json({ message: "User is not a team member" });
    const u = await User.findById(req.params.userId);
    if (!u) return res.sendStatus(404);
    if (u.role !== "superadmin") {
      u.role = "admin";
      await u.save();
    }
    await Team.updateOne(
      { _id: req.team._id },
      { $pull: { members: u._id }, $addToSet: { admins: u._id } },
    );
    await revokeUser(u._id, req.app.get("io"));
    res.json({ message: "Member promoted; previous sessions revoked" });
  },
);
router.post(
  "/:teamId/demote/:userId",
  admin,
  superOnly,
  manage,
  async (req, res) => {
    id.parse(req.params.userId);
    const u = await User.findById(req.params.userId);
    if (!u || u.role === "superadmin" || same(req.team.superAdmin, u._id))
      return res.status(400).json({ message: "Cannot demote this user" });
    if (!req.team.admins.some((x) => same(x, u._id)))
      return res
        .status(400)
        .json({ message: "User is not a team administrator" });
    await Team.updateOne(
      { _id: req.team._id },
      { $pull: { admins: u._id }, $addToSet: { members: u._id } },
    );
    if (!(await Team.exists({ admins: u._id, deletedAt: null }))) {
      u.role = "member";
      await u.save();
    }
    await revokeUser(u._id, req.app.get("io"));
    res.json({ message: "Administrator demoted; previous sessions revoked" });
  },
);
router.delete("/:teamId", admin, superOnly, manage, async (req, res) => {
  // Archive first so all access checks fail immediately; retained data is purged by retention job.
  req.team.deletedAt = new Date();
  await req.team.save();
  req.app
    .get("io")
    ?.in("team:" + req.team._id)
    .socketsLeave("team:" + req.team._id);
  res.json({ message: "Team archived" });
});
module.exports = router;
