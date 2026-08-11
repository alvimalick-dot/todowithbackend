import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEvent extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  remind: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema: Schema<IEvent> = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: [true, 'Event title is required'], trim: true },
    description: { type: String, default: '' },
    date: { type: Date, required: [true, 'Event date is required'], index: true },
    startTime: { type: String },
    endTime: { type: String },
    remind: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Event: Model<IEvent> = mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
export default Event;
