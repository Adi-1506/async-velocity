require("dotenv").config();
const mongoose = require("mongoose"),
  bcrypt = require("bcrypt"),
  crypto = require("crypto");
const User = require("../models/User");
const { email, password, z } = require("../lib/validation");
async function run() {
  const input = z
    .object({ email, password, name: z.string().trim().min(1).max(100) })
    .parse({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      name: process.env.ADMIN_NAME,
    });
  await mongoose.connect(
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/async-standup-bot",
  );
  if (await User.exists({ role: "superadmin" }))
    throw new Error(
      "A super administrator already exists; bootstrap will not modify existing users",
    );
  if (await User.exists({ email: input.email }))
    throw new Error("This email already belongs to a user");
  await User.create({
    ...input,
    password: await bcrypt.hash(input.password, 12),
    publicId: "USR-" + crypto.randomUUID(),
    role: "superadmin",
    emailVerified: true,
  });
  console.log(
    "Super administrator created. Remove ADMIN_PASSWORD from your environment now.",
  );
}
run()
  .catch((e) => {
    console.error(
      e.name === "ZodError"
        ? "Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD (12–72 bytes)."
        : e.message,
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
