import { z } from 'zod';

import { DateInputSchema } from './common';

// readable name → vendor field
const MEASUREMENT_FIELDS = {
  weightKg: 'weight_kg',
  leanMassKg: 'lean_mass_kg',
  fatPercent: 'fat_percent',
  neckCm: 'neck_cm',
  shoulderCm: 'shoulder_cm',
  chestCm: 'chest_cm',
  leftBicepCm: 'left_bicep_cm',
  rightBicepCm: 'right_bicep_cm',
  leftForearmCm: 'left_forearm_cm',
  rightForearmCm: 'right_forearm_cm',
  abdomen: 'abdomen',
  waist: 'waist',
  hips: 'hips',
  leftThigh: 'left_thigh',
  rightThigh: 'right_thigh',
  leftCalf: 'left_calf',
  rightCalf: 'right_calf',
} as const;

type MeasurementField = keyof typeof MEASUREMENT_FIELDS;
type VendorMeasurementField = (typeof MEASUREMENT_FIELDS)[MeasurementField];

type OptionalNumber = z.ZodOptional<z.ZodNullable<z.ZodNumber>>;

const optionalNumbers = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map((key) => [key, z.number().nullish()])) as Record<K, OptionalNumber>;

export type Measurements = Record<MeasurementField, number | null>;

const toMeasurements = (values: Partial<Record<VendorMeasurementField, number | null>>): Measurements =>
  Object.fromEntries(Object.entries(MEASUREMENT_FIELDS).map(([field, vendor]) => [field, values[vendor] ?? null])) as Measurements;

const toVendorMeasurements = (values: Partial<Record<MeasurementField, number | null>>) =>
  Object.fromEntries(
    Object.entries(MEASUREMENT_FIELDS).map(([field, vendor]) => [vendor, values[field as MeasurementField] ?? null]),
  ) as Record<VendorMeasurementField, number | null>;

export const BodyMeasurementSchema = z
  .object({
    date: z.string(),
    ...optionalNumbers(Object.values(MEASUREMENT_FIELDS)),
  })
  .transform(({ date, ...values }) => ({ date, ...toMeasurements(values) }));

/** every measurement left out is stored as null, also when updating */
export const MeasurementsInputSchema = z
  .object(optionalNumbers(Object.keys(MEASUREMENT_FIELDS) as MeasurementField[]))
  .transform(toVendorMeasurements);

export const BodyMeasurementInputSchema = z
  .object({
    /** YYYY-MM-DD */
    date: DateInputSchema,
    ...optionalNumbers(Object.keys(MEASUREMENT_FIELDS) as MeasurementField[]),
  })
  .transform(({ date, ...values }) => ({ date, ...toVendorMeasurements(values) }));

export type BodyMeasurement = z.infer<typeof BodyMeasurementSchema>;
export type MeasurementsInput = z.input<typeof MeasurementsInputSchema>;
export type BodyMeasurementInput = z.input<typeof BodyMeasurementInputSchema>;
