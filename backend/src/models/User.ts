import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'member' | 'lead' | 'admin';
  title: string;
  avatar: string;
  uuid: string;
  timezone: string;
  teamId: mongoose.Types.ObjectId | null;
  githubConnected: boolean;
  githubReposType: 'all' | 'selected';
  selectedRepos: string[];
  slackConnected: boolean;
  teamsConnected: boolean;
  emailDigest: boolean;
  reminderTime: string;
  reminderFrequency: 'daily' | 'weekdays' | 'custom';
  onboardingCompleted: boolean;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['member', 'lead', 'admin'], default: 'member' },
    title: { type: String, default: 'Team Member' },
    avatar: { type: String, default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' },
    uuid: { type: String, required: true, unique: true, default: () => crypto.randomUUID() },
    timezone: { type: String, default: 'UTC+0' },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
    githubConnected: { type: Boolean, default: false },
    githubReposType: { type: String, enum: ['all', 'selected'], default: 'all' },
    selectedRepos: { type: [String], default: [] },
    slackConnected: { type: Boolean, default: false },
    teamsConnected: { type: Boolean, default: false },
    emailDigest: { type: Boolean, default: true },
    reminderTime: { type: String, default: '09:00' },
    reminderFrequency: { type: String, enum: ['daily', 'weekdays', 'custom'], default: 'weekdays' },
    onboardingCompleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        const obj = ret as any;
        obj.id = obj._id;
        if (obj.teamId) {
          const isObjectId = mongoose.Types.ObjectId.isValid(obj.teamId) && 
                             (obj.teamId instanceof mongoose.Types.ObjectId || typeof obj.teamId === 'string');
          if (!isObjectId) {
            if (obj.teamId.name) {
              obj.teamName = obj.teamId.name;
            }
            const idVal = obj.teamId._id || obj.teamId.id;
            obj.teamId = idVal ? idVal.toString() : obj.teamId.toString();
          } else {
            obj.teamId = obj.teamId.toString();
          }
        }
        delete obj._id;
        delete obj.__v;
        delete obj.passwordHash;
        return obj;
      },
    },
  }
);

UserSchema.methods.comparePassword = async function (password: string) {
  return await bcrypt.compare(password, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);
