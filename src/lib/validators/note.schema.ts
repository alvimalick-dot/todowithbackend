import { z } from 'zod';

export const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  content: z.string().optional(),
  folder: z.string().optional(),
  pinned: z.boolean().optional(),
});

export const updateNoteSchema = createNoteSchema.partial();