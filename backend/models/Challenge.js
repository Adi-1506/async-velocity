const mongoose = require("mongoose");
module.exports = mongoose.model(
  "Challenge",
  new mongoose.Schema({
    tokenHash: { type: String, unique: true },
    challenge: String,
    purpose: { type: String, enum: ["register", "login"] },
    user: mongoose.Schema.Types.ObjectId,
    session: mongoose.Schema.Types.ObjectId,
    expiresAt: { type: Date, expires: 0 },
  }),
);
