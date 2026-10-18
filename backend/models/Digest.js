const mongoose = require("mongoose");

const digestSchema = new mongoose.Schema(
  {
    publicId: { type: String, unique: true }, // DGT-xxxx
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    period: { from: Date, to: Date },
    standups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Standup" }],
    participationRate: { type: Number, default: 0 },
    blockerCount: { type: Number, default: 0 },
    summary: { type: String },
    periodKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Digest", digestSchema);
