const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    publicId: { type: String, unique: true }, // TM-xxxx
    name: { type: String, required: true },
    superAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    standupTime: { type: String, default: "09:00" },
    timezone: { type: String, default: "Asia/Kolkata" },
    digestFrequency: {
      type: String,
      enum: ["daily", "weekly"],
      default: "daily",
    },
    workdays: { type: [Number], default: [1, 2, 3, 4, 5] },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Team", teamSchema);
