import mongoose, { Schema } from 'mongoose';

const subTaskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    task: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

subTaskSchema.index({ _id: 1, project: 1 }, { unique: true });

export const SubTask = mongoose.model('SubTask', subTaskSchema);
