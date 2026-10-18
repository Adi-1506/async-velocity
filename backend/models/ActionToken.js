const mongoose = require("mongoose");
module.exports = mongoose.model(
  "ActionToken",
  new mongoose.Schema({
    tokenHash: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    purpose: { type: String, enum: ["reset", "verify"], required: true },
    expiresAt: { type: Date, expires: 0, required: true },
  }),
);
