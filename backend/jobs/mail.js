const MailJob = require("../models/MailJob"),
  User = require("../models/User");
const mail = require("../lib/mail");
async function queue(user, purpose) {
  await MailJob.create({ user: user._id, purpose });
}
async function deliver() {
  if (!mail.configured()) return;
  for (let i = 0; i < 25; i++) {
    const job = await MailJob.findOneAndUpdate(
      { dueAt: { $lte: new Date() }, attempts: { $lt: 5 } },
      { $set: { dueAt: new Date(Date.now() + 300000) }, $inc: { attempts: 1 } },
      { sort: { dueAt: 1 }, returnDocument: "after" },
    );
    if (!job) break;
    try {
      const user = await User.findById(job.user);
      if (user && !user.deletedAt) await mail.sendAction(user, job.purpose);
      await MailJob.deleteOne({ _id: job._id });
    } catch {
      console.error("Email delivery retry scheduled");
    }
  }
}
module.exports = { queue, deliver };
