import mongoose, { Document, Schema } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  category: 'Active' | 'Underperforming' | 'Archived';
  scheduleHour: string;
  timezone: string;
  questions: { _id: mongoose.Types.ObjectId; text: string }[];
}

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, unique: true },
    category: { type: String, enum: ['Active', 'Underperforming', 'Archived'], default: 'Active' },
    scheduleHour: { type: String, required: true },
    timezone: { type: String, required: true },
    questions: [
      {
        text: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        const obj = ret as any;
        obj.id = obj._id;
        delete obj._id;
        delete obj.__v;
        return obj;
      },
    },
  }
);

export const Team = mongoose.model<ITeam>('Team', TeamSchema);
