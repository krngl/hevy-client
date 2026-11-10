import { z } from 'zod';

import { nullish, SetType, TimestampSchema } from './common';

const RepRangeSchema = z.object({
  start: nullish(z.number()),
  end: nullish(z.number()),
});

const RoutineSetSchema = z
  .object({
    index: z.number(),
    type: z.enum(SetType),
    weight_kg: nullish(z.number()),
    reps: nullish(z.number()),
    rep_range: nullish(RepRangeSchema),
    distance_meters: nullish(z.number()),
    duration_seconds: nullish(z.number()),
    custom_metric: nullish(z.number()),
  })
  .transform((set) => ({
    index: set.index,
    type: set.type,
    weightKg: set.weight_kg,
    reps: set.reps,
    repRange: set.rep_range,
    distanceMeters: set.distance_meters,
    durationSeconds: set.duration_seconds,
    /** floors or steps on stair machine exercises */
    customMetric: set.custom_metric,
  }));

const RoutineExerciseSchema = z
  .object({
    index: z.number(),
    title: z.string(),
    rest_seconds: nullish(z.number()),
    notes: nullish(z.string()),
    exercise_template_id: z.string(),
    superset_id: nullish(z.number()),
    sets: z.array(RoutineSetSchema),
  })
  .transform((exercise) => ({
    index: exercise.index,
    title: exercise.title,
    restSeconds: exercise.rest_seconds,
    notes: exercise.notes,
    exerciseTemplateId: exercise.exercise_template_id,
    /** exercises sharing a superset id are performed as a superset, null when not part of one */
    supersetId: exercise.superset_id,
    sets: exercise.sets,
  }));

export const RoutineSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    folder_id: nullish(z.number()),
    updated_at: TimestampSchema,
    created_at: TimestampSchema,
    exercises: z.array(RoutineExerciseSchema),
  })
  .transform((routine) => ({
    id: routine.id,
    title: routine.title,
    /** null when the routine lives in the default "My Routines" folder */
    folderId: routine.folder_id,
    updatedAt: routine.updated_at,
    createdAt: routine.created_at,
    exercises: routine.exercises,
  }));

const RoutineSetInputSchema = z
  .object({
    type: z.enum(SetType).default(SetType.NORMAL),
    weightKg: z.number().nullish(),
    reps: z.number().int().nullish(),
    repRange: z.object({ start: z.number(), end: z.number() }).nullish(),
    distanceMeters: z.number().int().nullish(),
    durationSeconds: z.number().int().nullish(),
    /** floors or steps on stair machine exercises */
    customMetric: z.number().nullish(),
  })
  .transform((set) => ({
    type: set.type,
    weight_kg: set.weightKg ?? null,
    reps: set.reps ?? null,
    rep_range: set.repRange ?? null,
    distance_meters: set.distanceMeters ?? null,
    duration_seconds: set.durationSeconds ?? null,
    custom_metric: set.customMetric ?? null,
  }));

const RoutineExerciseInputSchema = z
  .object({
    exerciseTemplateId: z.string(),
    supersetId: z.number().int().nullish(),
    restSeconds: z.number().int().nullish(),
    notes: z.string().nullish(),
    sets: z.array(RoutineSetInputSchema),
  })
  .transform((exercise) => ({
    exercise_template_id: exercise.exerciseTemplateId,
    superset_id: exercise.supersetId ?? null,
    rest_seconds: exercise.restSeconds ?? null,
    notes: exercise.notes ?? null,
    sets: exercise.sets,
  }));

export const RoutineInputSchema = z
  .object({
    title: z.string(),
    /** null puts the routine into the default "My Routines" folder, leaving it out on update keeps the current folder */
    folderId: z.number().int().nullish(),
    notes: z.string().nullish(),
    exercises: z.array(RoutineExerciseInputSchema),
  })
  .transform((routine) => ({
    title: routine.title,
    folder_id: routine.folderId,
    notes: routine.notes,
    exercises: routine.exercises,
  }));

export type Routine = z.infer<typeof RoutineSchema>;
export type RoutineExercise = Routine['exercises'][number];
export type RoutineSet = RoutineExercise['sets'][number];
export type RoutineInput = z.input<typeof RoutineInputSchema>;
