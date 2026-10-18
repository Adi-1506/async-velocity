const mongoose = require("mongoose");
module.exports = mongoose.model(
  "Passkey",
  new mongoose.Schema(
    {
      credentialId: { type: String, unique: true, required: true },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      publicKey: { type: Buffer, required: true, select: false },
      counter: { type: Number, default: 0 },
      transports: [String],
    },
    { timestamps: true },
  ),
);
