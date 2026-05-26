import mongoose, { Schema, Document } from 'mongoose';

export interface ITodo extends Document {
  id: string;
  title: string;
  dueDate: Date;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed';
  createdAt: Date;
}

const TodoSchema: Schema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  dueDate: {
    type: Date,
    required: false,
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

TodoSchema.index({ id: 1 });
TodoSchema.index({ title: 'text' });
TodoSchema.index({ status: 1 });
TodoSchema.index({ dueDate: 1 });

export const Todo = mongoose.model<ITodo>('Todo', TodoSchema);
