const router = require("express").Router();
const Digest = require("../models/Digest"),
  Team = require("../models/Team");
const auth = require("../middleware/authUser.middleware"),
  member = require("../middleware/teamMember.middleware");
const { pagination, id } = require("../lib/validation");
const { canRead } = require("../lib/access");
router.use(auth);
router.get("/team/:teamId", member, async (req, res) => {
  const { skip, limit } = pagination(req);
  res.json(
    await Digest.find({ team: req.team._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
  );
});
router.get("/:id", async (req, res) => {
  id.parse(req.params.id);
  const d = await Digest.findById(req.params.id).populate({
    path: "standups",
    populate: { path: "user", select: "name publicId" },
  });
  const t = d && (await Team.findOne({ _id: d.team, deletedAt: null }));
  if (!canRead(t, req.user))
    return res.status(403).json({ message: "Access denied" });
  res.json(d);
});
module.exports = router;
