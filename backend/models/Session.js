const mongoose = require("mongoose");
module.exports = mongoose.model(
  "Session",
  new mongoose.Schema(
    {
      tokenHash: { type: String, required: true, unique: true, select: false },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      kind: { type: String, enum: ["user", "admin"], required: true },
      device: { type: String, maxlength: 200 },
      expiresAt: { type: Date, required: true, expires: 0 },
    },
    { timestamps: true },
  ),
);
