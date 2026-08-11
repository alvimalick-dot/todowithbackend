import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INote extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  content: string;
  folder?: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema: Schema<INote> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Note title is required'],
      trim: true,
    },
    content: {
      type: String,
      default: '',
    },
    folder: {
      type: String,
      trim: true,
      default: 'general',
    },
    pinned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Note: Model<INote> =
  mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);

export default Note;