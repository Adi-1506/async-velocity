const mongoose = require("mongoose");

const standupSchema = new mongoose.Schema(
  {
    publicId: { type: String, unique: true }, // STD-xxxx
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    yesterday: { type: String, required: true },
    today: { type: String, required: true },
    blockers: { type: String, default: "None" },
    mood: {
      type: String,
      enum: ["great", "good", "meh", "blocked"],
      default: "good",
    },
    isLate: { type: Boolean, default: false },
    date: { type: Date, default: Date.now },
    localDate: String,
    blockerStatus: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
    },
    resolvedAt: Date,
  },
  { timestamps: true },
);
standupSchema.index(
  { user: 1, team: 1, localDate: 1 },
  { unique: true, partialFilterExpression: { localDate: { $type: "string" } } },
);
standupSchema.index({ team: 1, date: -1 });

module.exports = mongoose.model("Standup", standupSchema);
