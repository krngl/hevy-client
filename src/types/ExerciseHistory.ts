import { z } from 'zod';

import { nullish, SetType, TimestampSchema } from './common';

export const ExerciseHistoryEntrySchema = z
  .object({
    workout_id: z.string(),
    workout_title: z.string(),
    workout_start_time: TimestampSchema,
    workout_end_time: TimestampSchema,
    exercise_template_id: z.string(),
    weight_kg: nullish(z.number()),
    reps: nullish(z.number()),
    distance_meters: nullish(z.number()),
    duration_seconds: nullish(z.number()),
    rpe: nullish(z.number()),
    custom_metric: nullish(z.number()),
    set_type: z.enum(SetType),
  })
  .transform((entry) => ({
    workoutId: entry.workout_id,
    workoutTitle: entry.workout_title,
    workoutStartTime: entry.workout_start_time,
    workoutEndTime: entry.workout_end_time,
    exerciseTemplateId: entry.exercise_template_id,
    setType: entry.set_type,
    weightKg: entry.weight_kg,
    reps: entry.reps,
    distanceMeters: entry.distance_meters,
    durationSeconds: entry.duration_seconds,
    rpe: entry.rpe,
    customMetric: entry.custom_metric,
  }));

export type ExerciseHistoryEntry = z.infer<typeof ExerciseHistoryEntrySchema>;
