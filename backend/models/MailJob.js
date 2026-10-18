const mongoose = require("mongoose");
module.exports = mongoose.model(
  "MailJob",
  new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    purpose: { type: String, enum: ["reset", "verify"] },
    dueAt: { type: Date, default: Date.now },
    attempts: { type: Number, default: 0 },
    expiresAt: {
      type: Date,
      expires: 0,
      default: () => new Date(Date.now() + 86400000),
    },
  }),
);
