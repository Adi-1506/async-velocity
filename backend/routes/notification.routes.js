const router = require("express").Router();
const Notification = require("../models/Notification");
const auth = require("../middleware/authUser.middleware");
const { pagination, id } = require("../lib/validation");
router.use(auth);
const list = async (req, res) => {
  const { skip, limit } = pagination(req);
  res.json(
    await Notification.find({ user: req.user._id })
      .select("_id team type message isRead createdAt")
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit),
  );
};
router.get("/", list);
router.get("/admin", list);
const read = async (req, res) => {
  id.parse(req.params.id);
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: { isRead: true } },
    { returnDocument: "after" },
  );
  if (!n) return res.status(404).json({ message: "Notification not found" });
  res.json(n);
};
router.patch("/:id/read", read);
router.patch("/user/:id/read", read);
router.patch("/admin/:id/read", read);
module.exports = router;
