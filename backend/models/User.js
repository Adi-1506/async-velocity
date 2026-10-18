const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    publicId: { type: String, unique: true }, // USR-xxxx
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    deletedAt: { type: Date, default: null },
    emailVerified: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false },
    mfaEnabled: { type: Boolean, default: false },
    mfaLastStep: { type: Number, default: 0, select: false },
    pendingMfaSecret: { type: String, select: false },
    role: {
      type: String,
      enum: ["member", "admin", "superadmin"],
      default: "member",
    },
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
