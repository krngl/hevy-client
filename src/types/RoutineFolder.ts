import { z } from 'zod';

import { TimestampSchema } from './common';

export const RoutineFolderSchema = z
  .object({
    id: z.number(),
    index: z.number(),
    title: z.string(),
    updated_at: TimestampSchema,
    created_at: TimestampSchema,
  })
  .transform((folder) => ({
    id: folder.id,
    /** position of the folder in the list */
    index: folder.index,
    title: folder.title,
    updatedAt: folder.updated_at,
    createdAt: folder.created_at,
  }));

export const RoutineFolderInputSchema = z.object({
  title: z.string(),
});

export type RoutineFolder = z.infer<typeof RoutineFolderSchema>;
export type RoutineFolderInput = z.input<typeof RoutineFolderInputSchema>;
