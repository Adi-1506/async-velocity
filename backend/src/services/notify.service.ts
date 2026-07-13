import mongoose from 'mongoose';

export const notifyMember = async (userId: mongoose.Types.ObjectId, message: string) => {
  // Stub for slack/teams notification
  console.log(`[Notification Service] Nudging User ${userId.toString()}: ${message}`);
  return true;
};

export const sendTestDigestEmail = async (userId: mongoose.Types.ObjectId) => {
  // Stub for email service
  console.log(`[Email Service] Sending test digest email to User ${userId.toString()}`);
  return true;
};
