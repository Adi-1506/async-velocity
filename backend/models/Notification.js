const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    type: {
      type: String,
      enum: ["reminder", "digest_ready", "missed_standup", "promoted_to_admin"],
    },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    dedupeKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true },
);
notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
