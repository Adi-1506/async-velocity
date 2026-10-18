const router = require("express").Router();
const auth = require("../middleware/authUser.middleware"),
  { reauth } = require("./auth.routes");
const User = require("../models/User"),
  Team = require("../models/Team"),
  Standup = require("../models/Standup");
const { z, validate } = require("../lib/validation"),
  { revokeUser } = require("../lib/sessions");
const credentials = validate(
  z
    .object({
      password: z.string().min(1).max(200),
      code: z
        .string()
        .regex(/^\d{6}$/)
        .optional(),
    })
    .strict(),
);
router.use(auth);
router.post("/export", credentials, async (req, res) => {
  await reauth(req);
  res.set("Content-Type", "application/x-ndjson");
  res.set("Content-Disposition", 'attachment; filename="standup-data.ndjson"');
  res.write(
    JSON.stringify({
      profile: { name: req.user.name, email: req.user.email },
    }) + "\n",
  );
  const cursor = Standup.find({ user: req.user._id })
    .select("yesterday today blockers mood date blockerStatus")
    .lean()
    .cursor();
  res.on("close", () => cursor.close().catch(() => {}));
  for await (const row of cursor) {
    if (res.destroyed) break;
    if (!res.write(JSON.stringify({ standup: row }) + "\n"))
      await new Promise((resolve) => {
        res.once("drain", resolve);
        res.once("close", resolve);
      });
  }
  res.end();
});
router.post("/delete", credentials, async (req, res) => {
  await reauth(req);
  if (await Team.exists({ superAdmin: req.user._id, deletedAt: null }))
    return res
      .status(409)
      .json({
        message: "Archive the teams you own before deleting your account",
      });
  if (
    req.user.role === "superadmin" &&
    (await User.countDocuments({ role: "superadmin", deletedAt: null })) <= 1
  )
    return res
      .status(409)
      .json({
        message: "The last super administrator cannot delete their account",
      });
  await User.updateOne(
    { _id: req.user._id },
    { $set: { deletedAt: new Date() } },
  );
  await revokeUser(req.user._id, req.app.get("io"));
  await Team.updateMany(
    {},
    { $pull: { members: req.user._id, admins: req.user._id } },
  );
  res.json({
    message: "Account disabled. Personal data will be purged after 30 days.",
  });
});
module.exports = router;
