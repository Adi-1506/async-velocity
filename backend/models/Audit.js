const mongoose = require("mongoose");
module.exports = mongoose.model(
  "Audit",
  new mongoose.Schema(
    {
      actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      event: { type: String, required: true },
      target: String,
      outcome: Number,
    },
    { timestamps: true },
  ),
);
