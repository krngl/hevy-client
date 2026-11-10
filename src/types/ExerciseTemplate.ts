import { z } from 'zod';

import { EquipmentCategory, ExerciseType, MuscleGroup, nullish } from './common';

export const ExerciseTemplateSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    primary_muscle_group: z.string(),
    secondary_muscle_groups: z.array(z.string()),
    equipment: z.enum(EquipmentCategory),
    is_custom: z.boolean(),
    thumbnail_url: nullish(z.string()),
  })
  .transform((template) => ({
    id: template.id,
    title: template.title,
    /** see ExerciseType, built-in exercises may use types that cannot be created through the API */
    type: template.type,
    primaryMuscleGroup: template.primary_muscle_group,
    secondaryMuscleGroups: template.secondary_muscle_groups,
    equipment: template.equipment,
    isCustom: template.is_custom,
    thumbnailUrl: template.thumbnail_url,
  }));

export const ExerciseTemplateInputSchema = z
  .object({
    title: z.string(),
    exerciseType: z.enum(ExerciseType),
    equipmentCategory: z.enum(EquipmentCategory),
    muscleGroup: z.enum(MuscleGroup),
    otherMuscles: z.array(z.enum(MuscleGroup)).default([]),
  })
  .transform((exercise) => ({
    title: exercise.title,
    exercise_type: exercise.exerciseType,
    equipment_category: exercise.equipmentCategory,
    muscle_group: exercise.muscleGroup,
    other_muscles: exercise.otherMuscles,
  }));

export const CreatedExerciseTemplateSchema = z.object({ id: z.coerce.string() }).transform(({ id }) => id);

export type ExerciseTemplate = z.infer<typeof ExerciseTemplateSchema>;
export type ExerciseTemplateInput = z.input<typeof ExerciseTemplateInputSchema>;
