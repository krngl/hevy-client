import { Url } from '../../src/HevyClient';
import createWorkout from './createWorkout.json';
import getBodyMeasurements from './getBodyMeasurements.json';
import getExerciseHistory from './getExerciseHistory.json';
import getExerciseTemplates from './getExerciseTemplates.json';
import getRoutine from './getRoutine.json';
import getRoutineFolders from './getRoutineFolders.json';
import getRoutines from './getRoutines.json';
import getUserInfo from './getUserInfo.json';
import getWorkoutEvents from './getWorkoutEvents.json';
import getWorkouts from './getWorkouts.json';
import workout from './workout.json';

export const responseMock = {
  [Url.USER_INFO]: getUserInfo,
  [Url.WORKOUTS]: getWorkouts,
  [Url.WORKOUT_EVENTS]: getWorkoutEvents,
  [Url.ROUTINES]: getRoutines,
  [Url.ROUTINE_FOLDERS]: getRoutineFolders,
  [Url.EXERCISE_TEMPLATES]: getExerciseTemplates,
  [Url.EXERCISE_HISTORY]: getExerciseHistory,
  [Url.BODY_MEASUREMENTS]: getBodyMeasurements,
};

export { createWorkout, getRoutine, workout };
