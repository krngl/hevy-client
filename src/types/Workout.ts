import { z } from 'zod';

import { nullish, RPE_VALUES, SetType, TimestampInputSchema, TimestampSchema } from './common';

const WorkoutSetSchema = z
  .object({
    index: z.number(),
    type: z.enum(SetType),
    weight_kg: nullish(z.number()),
    reps: nullish(z.number()),
    distance_meters: nullish(z.number()),
    duration_seconds: nullish(z.number()),
    rpe: nullish(z.number()),
    custom_metric: nullish(z.number()),
  })
  .transform((set) => ({
    index: set.index,
    type: set.type,
    weightKg: set.weight_kg,
    reps: set.reps,
    distanceMeters: set.distance_meters,
    durationSeconds: set.duration_seconds,
    rpe: set.rpe,
    /** floors or steps on stair machine exercises */
    customMetric: set.custom_metric,
  }));

const WorkoutExerciseSchema = z
  .object({
    index: z.number(),
    title: z.string(),
    notes: nullish(z.string()),
    exercise_template_id: z.string(),
    superset_id: nullish(z.number()),
    sets: z.array(WorkoutSetSchema),
  })
  .transform((exercise) => ({
    index: exercise.index,
    title: exercise.title,
    notes: exercise.notes,
    exerciseTemplateId: exercise.exercise_template_id,
    /** exercises sharing a superset id are performed as a superset, null when not part of one */
    supersetId: exercise.superset_id,
    sets: exercise.sets,
  }));

export const WorkoutSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    routine_id: nullish(z.string()),
    description: nullish(z.string()),
    start_time: TimestampSchema,
    end_time: TimestampSchema,
    updated_at: TimestampSchema,
    created_at: TimestampSchema,
    exercises: z.array(WorkoutExerciseSchema),
  })
  .transform((workout) => ({
    id: workout.id,
    title: workout.title,
    routineId: workout.routine_id,
    description: workout.description,
    startTime: workout.start_time,
    endTime: workout.end_time,
    updatedAt: workout.updated_at,
    createdAt: workout.created_at,
    exercises: workout.exercises,
  }));

const UpdatedWorkoutEventSchema = z.object({
  type: z.literal('updated'),
  workout: WorkoutSchema,
});

const DeletedWorkoutEventSchema = z
  .object({
    type: z.literal('deleted'),
    id: z.string(),
    deleted_at: nullish(TimestampSchema),
  })
  .transform(({ type, id, deleted_at }) => ({ type, id, deletedAt: deleted_at }));

export const WorkoutEventSchema = z.union([UpdatedWorkoutEventSchema, DeletedWorkoutEventSchema]);

const WorkoutSetInputSchema = z
  .object({
    type: z.enum(SetType).default(SetType.NORMAL),
    weightKg: z.number().nullish(),
    reps: z.number().int().nullish(),
    distanceMeters: z.number().int().nullish(),
    durationSeconds: z.number().int().nullish(),
    /** floors or steps on stair machine exercises */
    customMetric: z.number().nullish(),
    rpe: z.literal(RPE_VALUES).nullish(),
  })
  .transform((set) => ({
    type: set.type,
    weight_kg: set.weightKg ?? null,
    reps: set.reps ?? null,
    distance_meters: set.distanceMeters ?? null,
    duration_seconds: set.durationSeconds ?? null,
    custom_metric: set.customMetric ?? null,
    rpe: set.rpe ?? null,
  }));

const WorkoutExerciseInputSchema = z
  .object({
    exerciseTemplateId: z.string(),
    supersetId: z.number().int().nullish(),
    notes: z.string().nullish(),
    sets: z.array(WorkoutSetInputSchema),
  })
  .transform((exercise) => ({
    exercise_template_id: exercise.exerciseTemplateId,
    superset_id: exercise.supersetId ?? null,
    notes: exercise.notes ?? null,
    sets: exercise.sets,
  }));

export const WorkoutInputSchema = z
  .object({
    title: z.string(),
    description: z.string().nullish(),
    startTime: TimestampInputSchema,
    endTime: TimestampInputSchema,
    isPrivate: z.boolean().default(false),
    exercises: z.array(WorkoutExerciseInputSchema),
  })
  .transform((workout) => ({
    title: workout.title,
    description: workout.description ?? null,
    start_time: workout.startTime,
    end_time: workout.endTime,
    is_private: workout.isPrivate,
    exercises: workout.exercises,
  }));

export type Workout = z.infer<typeof WorkoutSchema>;
export type WorkoutExercise = Workout['exercises'][number];
export type WorkoutSet = WorkoutExercise['sets'][number];
export type WorkoutEvent = z.infer<typeof WorkoutEventSchema>;
export type UpdatedWorkoutEvent = z.infer<typeof UpdatedWorkoutEventSchema>;
export type DeletedWorkoutEvent = z.infer<typeof DeletedWorkoutEventSchema>;
export type WorkoutInput = z.input<typeof WorkoutInputSchema>;
