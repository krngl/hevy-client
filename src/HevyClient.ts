import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { z } from 'zod';

import { ApiError, AuthenticationError } from './errors';
import type {
  BodyMeasurement,
  BodyMeasurementInput,
  ExerciseHistoryEntry,
  ExerciseTemplate,
  ExerciseTemplateInput,
  MeasurementsInput,
  Page,
  PageParams,
  Routine,
  RoutineFolder,
  RoutineFolderInput,
  RoutineInput,
  User,
  Workout,
  WorkoutEvent,
  WorkoutInput,
} from './types';
import {
  BodyMeasurementInputSchema,
  BodyMeasurementSchema,
  CreatedExerciseTemplateSchema,
  ExerciseHistoryEntrySchema,
  ExerciseTemplateInputSchema,
  ExerciseTemplateSchema,
  MeasurementsInputSchema,
  parsePage,
  RoutineFolderInputSchema,
  RoutineFolderSchema,
  RoutineInputSchema,
  RoutineSchema,
  UserSchema,
  WorkoutEventSchema,
  WorkoutInputSchema,
  WorkoutSchema,
} from './types';
import { DateInputSchema, TimestampInputSchema } from './types/common';

export enum Url {
  USER_INFO = '/user/info',
  WORKOUTS = '/workouts',
  WORKOUT_COUNT = '/workouts/count',
  WORKOUT_EVENTS = '/workouts/events',
  ROUTINES = '/routines',
  ROUTINE_FOLDERS = '/routine_folders',
  EXERCISE_TEMPLATES = '/exercise_templates',
  EXERCISE_HISTORY = '/exercise_history',
  BODY_MEASUREMENTS = '/body_measurements',
}

export interface HevyClientParams {
  /** the API key from https://hevy.com/settings?developer, requires Hevy Pro */
  apiKey: string;
  /** request timeout in milliseconds, defaults to 10 seconds */
  timeout?: number;
}

export interface WorkoutParams {
  workoutId: string;
}

export interface WorkoutEventsParams extends PageParams {
  /** only events after this point in time, defaults to the beginning of time */
  since?: Date | string;
}

export interface CreateWorkoutParams {
  workout: WorkoutInput;
}

export interface UpdateWorkoutParams extends WorkoutParams {
  workout: WorkoutInput;
}

export interface RoutineParams {
  routineId: string;
}

export interface CreateRoutineParams {
  routine: RoutineInput;
}

export interface UpdateRoutineParams extends RoutineParams {
  routine: RoutineInput;
}

export interface RoutineFolderParams {
  folderId: number;
}

export interface ExerciseTemplateParams {
  exerciseTemplateId: string;
}

export interface CreateExerciseTemplateParams {
  exercise: ExerciseTemplateInput;
}

export interface ExerciseHistoryParams extends ExerciseTemplateParams {
  startDate?: Date | string;
  endDate?: Date | string;
}

export interface BodyMeasurementParams {
  /** YYYY-MM-DD */
  date: string;
}

export interface CreateBodyMeasurementParams {
  measurement: BodyMeasurementInput;
}

export interface UpdateBodyMeasurementParams extends BodyMeasurementParams {
  measurement: MeasurementsInput;
}

const OptionalTimestampSchema = TimestampInputSchema.optional();

const path = (url: Url, id: string | number) => `${url}/${encodeURIComponent(id)}`;

// single resources come back bare, wrapped in an object, or wrapped in a single-element array depending on the endpoint
const unwrap = (data: unknown, key: string): unknown => {
  const value = data !== null && typeof data === 'object' && key in data ? (data as Record<string, unknown>)[key] : data;
  return Array.isArray(value) ? value[0] : value;
};

const errorMessage = (data: unknown): string | undefined => {
  if (typeof data === 'string') {
    return data || undefined;
  }
  if (data !== null && typeof data === 'object') {
    const { message, error } = data as Record<string, unknown>;
    return [message, error].find((value): value is string => typeof value === 'string');
  }
  return undefined;
};

class HevyClient {
  constructor({ apiKey, timeout = 10000 }: HevyClientParams) {
    this.api = axios.create({
      timeout,
      baseURL: 'https://api.hevyapp.com/v1',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      // status codes are turned into ApiError in request()
      validateStatus: () => true,
    });
  }

  private api: AxiosInstance;

  private async request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.api.request<T>(config);

    if (response.status === 401) {
      throw new AuthenticationError(errorMessage(response.data));
    }
    if (response.status >= 400) {
      throw new ApiError(response.status, errorMessage(response.data));
    }

    return response.data;
  }

  /**
   * User
   */
  public async getUserInfo(): Promise<User> {
    const data = await this.request({ method: 'GET', url: Url.USER_INFO });

    return UserSchema.parse(unwrap(data, 'data'));
  }

  /**
   * Workouts
   */
  /** newest first, at most 10 per page */
  public async getWorkouts({ page, pageSize }: PageParams = {}): Promise<Page<Workout>> {
    const data = await this.request({ method: 'GET', url: Url.WORKOUTS, params: { page, pageSize } });

    return parsePage(data, 'workouts', WorkoutSchema);
  }

  public async getWorkoutCount(): Promise<number> {
    const data = await this.request({ method: 'GET', url: Url.WORKOUT_COUNT });

    return z.object({ workout_count: z.number().int() }).parse(data).workout_count;
  }

  /**
   * Workouts updated or deleted since a point in time, newest first, at most 10 per page.
   * Meant to keep a local copy of the workouts in sync without fetching all of them.
   */
  public async getWorkoutEvents({ page, pageSize, since }: WorkoutEventsParams = {}): Promise<Page<WorkoutEvent>> {
    const data = await this.request({
      method: 'GET',
      url: Url.WORKOUT_EVENTS,
      params: { page, pageSize, since: OptionalTimestampSchema.parse(since) },
    });

    return parsePage(data, 'events', WorkoutEventSchema);
  }

  public async getWorkout({ workoutId }: WorkoutParams): Promise<Workout> {
    const data = await this.request({ method: 'GET', url: path(Url.WORKOUTS, workoutId) });

    return WorkoutSchema.parse(unwrap(data, 'workout'));
  }

  public async createWorkout({ workout }: CreateWorkoutParams): Promise<Workout> {
    const data = await this.request({ method: 'POST', url: Url.WORKOUTS, data: { workout: WorkoutInputSchema.parse(workout) } });

    return WorkoutSchema.parse(unwrap(data, 'workout'));
  }

  public async updateWorkout({ workoutId, workout }: UpdateWorkoutParams): Promise<Workout> {
    const data = await this.request({
      method: 'PUT',
      url: path(Url.WORKOUTS, workoutId),
      data: { workout: WorkoutInputSchema.parse(workout) },
    });

    return WorkoutSchema.parse(unwrap(data, 'workout'));
  }

  /**
   * Routines
   */
  /** at most 10 per page */
  public async getRoutines({ page, pageSize }: PageParams = {}): Promise<Page<Routine>> {
    const data = await this.request({ method: 'GET', url: Url.ROUTINES, params: { page, pageSize } });

    return parsePage(data, 'routines', RoutineSchema);
  }

  public async getRoutine({ routineId }: RoutineParams): Promise<Routine> {
    const data = await this.request({ method: 'GET', url: path(Url.ROUTINES, routineId) });

    return RoutineSchema.parse(unwrap(data, 'routine'));
  }

  /** free accounts are limited to 4 routines, an ApiError with status 403 is thrown beyond that */
  public async createRoutine({ routine }: CreateRoutineParams): Promise<Routine> {
    const payload = RoutineInputSchema.parse(routine);

    const data = await this.request({
      method: 'POST',
      url: Url.ROUTINES,
      data: { routine: { ...payload, folder_id: payload.folder_id ?? null } },
    });

    return RoutineSchema.parse(unwrap(data, 'routine'));
  }

  public async updateRoutine({ routineId, routine }: UpdateRoutineParams): Promise<Routine> {
    const payload = RoutineInputSchema.parse(routine);

    const data = await this.request({
      method: 'PUT',
      url: path(Url.ROUTINES, routineId),
      data: { routine: { ...payload, notes: payload.notes ?? null } },
    });

    return RoutineSchema.parse(unwrap(data, 'routine'));
  }

  /**
   * Routine folders
   */
  /** at most 10 per page */
  public async getRoutineFolders({ page, pageSize }: PageParams = {}): Promise<Page<RoutineFolder>> {
    const data = await this.request({ method: 'GET', url: Url.ROUTINE_FOLDERS, params: { page, pageSize } });

    return parsePage(data, 'routine_folders', RoutineFolderSchema);
  }

  public async getRoutineFolder({ folderId }: RoutineFolderParams): Promise<RoutineFolder> {
    const data = await this.request({ method: 'GET', url: path(Url.ROUTINE_FOLDERS, folderId) });

    return RoutineFolderSchema.parse(unwrap(data, 'routine_folder'));
  }

  /** the new folder is placed first, all other folders move down by one */
  public async createRoutineFolder(folder: RoutineFolderInput): Promise<RoutineFolder> {
    const data = await this.request({
      method: 'POST',
      url: Url.ROUTINE_FOLDERS,
      data: { routine_folder: RoutineFolderInputSchema.parse(folder) },
    });

    return RoutineFolderSchema.parse(unwrap(data, 'routine_folder'));
  }

  /**
   * Exercise templates
   */
  /** built-in and custom exercises, at most 100 per page */
  public async getExerciseTemplates({ page, pageSize }: PageParams = {}): Promise<Page<ExerciseTemplate>> {
    const data = await this.request({ method: 'GET', url: Url.EXERCISE_TEMPLATES, params: { page, pageSize } });

    return parsePage(data, 'exercise_templates', ExerciseTemplateSchema);
  }

  public async getExerciseTemplate({ exerciseTemplateId }: ExerciseTemplateParams): Promise<ExerciseTemplate> {
    const data = await this.request({ method: 'GET', url: path(Url.EXERCISE_TEMPLATES, exerciseTemplateId) });

    return ExerciseTemplateSchema.parse(unwrap(data, 'exercise_template'));
  }

  /**
   * Creates a custom exercise and returns its template id.
   * Free accounts are limited to 7 custom exercises, an ApiError with status 403 is thrown beyond that.
   */
  public async createExerciseTemplate({ exercise }: CreateExerciseTemplateParams): Promise<string> {
    const data = await this.request({
      method: 'POST',
      url: Url.EXERCISE_TEMPLATES,
      data: { exercise: ExerciseTemplateInputSchema.parse(exercise) },
    });

    return CreatedExerciseTemplateSchema.parse(data);
  }

  /**
   * Exercise history
   */
  /** every logged set of an exercise, optionally limited to workouts within a time range */
  public async getExerciseHistory({ exerciseTemplateId, startDate, endDate }: ExerciseHistoryParams): Promise<ExerciseHistoryEntry[]> {
    const data = await this.request({
      method: 'GET',
      url: path(Url.EXERCISE_HISTORY, exerciseTemplateId),
      params: { start_date: OptionalTimestampSchema.parse(startDate), end_date: OptionalTimestampSchema.parse(endDate) },
    });

    return z.object({ exercise_history: z.array(ExerciseHistoryEntrySchema) }).parse(data).exercise_history;
  }

  /**
   * Body measurements
   */
  /** at most 10 per page */
  public async getBodyMeasurements({ page, pageSize }: PageParams = {}): Promise<Page<BodyMeasurement>> {
    const data = await this.request({ method: 'GET', url: Url.BODY_MEASUREMENTS, params: { page, pageSize } });

    return parsePage(data, 'body_measurements', BodyMeasurementSchema);
  }

  public async getBodyMeasurement({ date }: BodyMeasurementParams): Promise<BodyMeasurement> {
    const data = await this.request({ method: 'GET', url: path(Url.BODY_MEASUREMENTS, DateInputSchema.parse(date)) });

    return BodyMeasurementSchema.parse(unwrap(data, 'body_measurement'));
  }

  /** one entry per date, an ApiError with status 409 is thrown when the date already has one */
  public async createBodyMeasurement({ measurement }: CreateBodyMeasurementParams): Promise<void> {
    await this.request({ method: 'POST', url: Url.BODY_MEASUREMENTS, data: BodyMeasurementInputSchema.parse(measurement) });
  }

  /** replaces the entry of the date, measurements left out are cleared */
  public async updateBodyMeasurement({ date, measurement }: UpdateBodyMeasurementParams): Promise<void> {
    await this.request({
      method: 'PUT',
      url: path(Url.BODY_MEASUREMENTS, DateInputSchema.parse(date)),
      data: MeasurementsInputSchema.parse(measurement),
    });
  }
}

export { HevyClient };
