import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  description: z.string().optional(),
  date: z.coerce.date({ message: 'Date is required' }),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  remind: z.boolean().optional(),
});

export const updateEventSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').trim().optional(),
  description: z.string().optional(),
  date: z.coerce.date().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  remind: z.boolean().optional(),
});
