import { z } from 'zod';

// Shared base schema fields
const priorityEnum = z.enum(['low', 'medium', 'high']);
const statusEnum = z.enum(['pending', 'in-progress', 'completed']);

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  description: z.string().optional(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  category: z.string().trim().optional(),
  dueDate: z.coerce.date().optional(),
  remind: z.boolean().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').trim().optional(),
  description: z.string().optional(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  category: z.string().trim().optional(),
  dueDate: z.coerce.date().optional(),
  remind: z.boolean().optional(),
});
