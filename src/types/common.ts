import { z } from 'zod';

export enum SetType {
  WARMUP = 'warmup',
  NORMAL = 'normal',
  FAILURE = 'failure',
  DROPSET = 'dropset',
}

export enum ExerciseType {
  WEIGHT_REPS = 'weight_reps',
  REPS_ONLY = 'reps_only',
  BODYWEIGHT_REPS = 'bodyweight_reps',
  BODYWEIGHT_ASSISTED_REPS = 'bodyweight_assisted_reps',
  DURATION = 'duration',
  WEIGHT_DURATION = 'weight_duration',
  DISTANCE_DURATION = 'distance_duration',
  SHORT_DISTANCE_WEIGHT = 'short_distance_weight',
}

export enum MuscleGroup {
  ABDOMINALS = 'abdominals',
  SHOULDERS = 'shoulders',
  BICEPS = 'biceps',
  TRICEPS = 'triceps',
  FOREARMS = 'forearms',
  QUADRICEPS = 'quadriceps',
  HAMSTRINGS = 'hamstrings',
  CALVES = 'calves',
  GLUTES = 'glutes',
  ABDUCTORS = 'abductors',
  ADDUCTORS = 'adductors',
  LATS = 'lats',
  UPPER_BACK = 'upper_back',
  TRAPS = 'traps',
  LOWER_BACK = 'lower_back',
  CHEST = 'chest',
  CARDIO = 'cardio',
  NECK = 'neck',
  FULL_BODY = 'full_body',
  OTHER = 'other',
}

export enum EquipmentCategory {
  NONE = 'none',
  BARBELL = 'barbell',
  DUMBBELL = 'dumbbell',
  KETTLEBELL = 'kettlebell',
  MACHINE = 'machine',
  PLATE = 'plate',
  RESISTANCE_BAND = 'resistance_band',
  SUSPENSION = 'suspension',
  OTHER = 'other',
}

/** the RPE values the API accepts when logging a set */
export const RPE_VALUES = [6, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;
export type Rpe = (typeof RPE_VALUES)[number];

/** an optional vendor field, normalized to null when missing */
export const nullish = <T extends z.ZodType>(schema: T) => schema.nullish().transform((value) => value ?? null);

/** ISO 8601 timestamp from the vendor, decoded to a Date */
export const TimestampSchema = z.coerce.date();

/** a Date or ISO 8601 timestamp, encoded the way the vendor documents it (no milliseconds) */
export const TimestampInputSchema = z
  .union([z.date(), z.iso.datetime({ offset: true })])
  .transform((value) => new Date(value).toISOString().replace(/\.\d{3}Z$/, 'Z'));

/** a calendar date, YYYY-MM-DD */
export const DateInputSchema = z.iso.date();
