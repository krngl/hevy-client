import { z } from 'zod';

import { nullish } from './common';

export enum WeightUnit {
  KG = 'kg',
  LBS = 'lbs',
}

export enum DistanceUnit {
  KILOMETERS = 'kilometers',
  MILES = 'miles',
}

export const UserSchema = z
  .object({
    id: z.string(),
    username: z.string(),
    name: nullish(z.string()),
    url: z.string(),
    weight_unit: z.enum(WeightUnit),
    distance_unit: z.enum(DistanceUnit),
    is_pro: z.boolean(),
  })
  .transform(({ id, username, name, url, weight_unit, distance_unit, is_pro }) => ({
    id,
    username,
    name,
    profileUrl: url,
    weightUnit: weight_unit,
    distanceUnit: distance_unit,
    isPro: is_pro,
  }));

export type User = z.infer<typeof UserSchema>;
