import mongoose, { Document, Schema } from 'mongoose';

export interface IStandupEntry extends Document {
  userId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  done: string[];
  doing: string[];
  blockers: string[];
  comments: {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    text: string;
    createdAt: Date;
  }[];
  reactions: {
    emoji: string;
    userId: mongoose.Types.ObjectId;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const StandupEntrySchema = new Schema<IStandupEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    date: { type: String, required: true },
    done: { type: [String], default: [] },
    doing: { type: [String], default: [] },
    blockers: { type: [String], default: [] },
    comments: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    reactions: [
      {
        emoji: { type: String, required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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
        // The spec requires transforming this output into the flat shape:
        // This logic is better placed in the controller/service to avoid extra DB queries inside toJSON,
        // because toJSON is synchronous and cannot populate if not already populated.
        // But we will clean up id fields here just in case.
        return ret;
      },
    },
  }
);

StandupEntrySchema.index({ userId: 1, date: 1 }, { unique: true });

export const StandupEntry = mongoose.model<IStandupEntry>('StandupEntry', StandupEntrySchema);
