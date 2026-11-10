import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ZodError } from 'zod';

import {
  ApiError,
  AuthenticationError,
  DistanceUnit,
  EquipmentCategory,
  ExerciseType,
  HevyClient,
  MuscleGroup,
  paginate,
  SetType,
  Url,
  WeightUnit,
} from '../src';
import mockAxios from './__mocks__/axios';
import { createWorkout, getRoutine, responseMock, workout } from './mocks/responseMock';

describe('HevyClient', () => {
  const client = new HevyClient({ apiKey: 'test-key' });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send the api key with every request', () => {
    // when
    new HevyClient({ apiKey: 'test-key' });

    // then
    expect(mockAxios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://api.hevyapp.com/v1',
        headers: expect.objectContaining({ 'api-key': 'test-key' }),
      }),
    );
  });

  describe('errors', () => {
    it('should throw AuthenticationError when the api key is rejected', async () => {
      // given
      mockApiResponse({ error: 'Unauthorized' }, 401);

      // when / then
      await expect(client.getUserInfo()).rejects.toThrow(AuthenticationError);
    });

    it('should throw ApiError with status and message', async () => {
      // given
      mockApiResponse({ error: 'limit-exceeded', message: 'Free accounts can have up to 4 routines' }, 403);

      // when
      const error = await client.getRoutines().catch((e) => e);

      // then
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 403, error: 'Free accounts can have up to 4 routines' });
    });

    it('should throw ApiError on an empty error body', async () => {
      // given
      mockApiResponse('', 404);

      // when
      const error = await client.getWorkout({ workoutId: 'missing' }).catch((e) => e);

      // then
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 404, error: undefined });
    });

    it('should throw ZodError when invalid data is returned', async () => {
      // given
      mockApiResponse({ something: 'else' });

      // when / then
      await expect(client.getWorkouts()).rejects.toThrow(ZodError);
    });
  });

  describe('user', () => {
    it('should parse getUserInfo response', async () => {
      // given
      mockApiResponse(responseMock[Url.USER_INFO]);

      // when
      const user = await client.getUserInfo();

      // then
      expect(mockAxios.request).toHaveBeenCalledWith({ method: 'GET', url: Url.USER_INFO });
      expect(user).toEqual({
        id: '9c465af3-de7d-42bc-9c7c-f0170396358b',
        username: 'jhon',
        name: 'John doe',
        profileUrl: 'https://hevy.com/user/jhon',
        weightUnit: WeightUnit.KG,
        distanceUnit: DistanceUnit.KILOMETERS,
        isPro: true,
      });
    });
  });

  describe('workouts', () => {
    it('should parse getWorkouts response', async () => {
      // given
      const response = responseMock[Url.WORKOUTS];
      mockApiResponse(response);

      // when
      const page = await client.getWorkouts({ page: 2, pageSize: 5 });

      // then
      expect(mockAxios.request).toHaveBeenCalledWith({ method: 'GET', url: Url.WORKOUTS, params: { page: 2, pageSize: 5 } });
      expect(page.page).toBe(1);
      expect(page.pageCount).toBe(3);
      expect(page.items).toHaveLength(response.workouts.length);
      expect(page.items[1]).toMatchObject({ routineId: null, description: null });
    });

    it('should decode a workout', async () => {
      // given
      mockApiResponse(workout);

      // when
      const result = await client.getWorkout({ workoutId: 'abc/123' });

      // then
      expect(mockAxios.request).toHaveBeenCalledWith({ method: 'GET', url: `${Url.WORKOUTS}/abc%2F123` });
      expect(result).toMatchObject({
        id: workout.id,
        title: workout.title,
        routineId: workout.routine_id,
        startTime: new Date('2021-09-14T12:00:00Z'),
        endTime: new Date('2021-09-14T13:00:00Z'),
        updatedAt: new Date('2021-09-14T13:05:00Z'),
        createdAt: new Date('2021-09-14T13:05:00Z'),
      });
      expect(result.exercises[0]).toMatchObject({ exerciseTemplateId: '05293BCA', supersetId: null });
      expect(result.exercises[0].sets[1]).toEqual({
        index: 1,
        type: SetType.NORMAL,
        weightKg: 100,
        reps: 8,
        distanceMeters: null,
        durationSeconds: null,
        rpe: 9.5,
        customMetric: null,
      });
      // fields left out by the vendor become null
      expect(result.exercises[1].sets[0]).toMatchObject({ weightKg: null, reps: null, durationSeconds: 600, customMetric: 50 });
    });

    it('should parse getWorkoutCount response', async () => {
      // given
      mockApiResponse({ workout_count: 42 });

      // when
      const count = await client.getWorkoutCount();

      // then
      expect(mockAxios.request).toHaveBeenCalledWith({ method: 'GET', url: Url.WORKOUT_COUNT });
      expect(count).toBe(42);
    });

    it('should parse getWorkoutEvents response', async () => {
      // given
      mockApiResponse(responseMock[Url.WORKOUT_EVENTS]);

      // when
      const page = await client.getWorkoutEvents({ since: new Date('2024-01-01T10:00:00.123Z') });

      // then
      expect(mockAxios.request).toHaveBeenCalledWith({
        method: 'GET',
        url: Url.WORKOUT_EVENTS,
        params: { since: '2024-01-01T10:00:00Z' },
      });
      const [updated, deleted] = page.items;
      expect(updated.type).toBe('updated');
      expect(updated.type === 'updated' && updated.workout.id).toBe(workout.id);
      expect(deleted).toEqual({
        type: 'deleted',
        id: 'efe6801c-4aee-4959-bcdd-fca3f272821b',
        deletedAt: new Date('2021-09-13T12:00:00Z'),
      });
    });

    it('should reject an invalid since timestamp', async () => {
      // when / then
      await expect(client.getWorkoutEvents({ since: 'yesterday' })).rejects.toThrow(ZodError);
      expect(mockAxios.request).not.toHaveBeenCalled();
    });

    it('should encode createWorkout payload and unwrap the created workout', async () => {
      // given
      mockApiResponse(createWorkout, 201);

      // when
      const result = await client.createWorkout({
        workout: {
          title: 'Friday Leg Day 🔥',
          startTime: new Date('2024-08-14T12:00:00Z'),
          endTime: '2024-08-14T12:30:00Z',
          exercises: [
            {
              exerciseTemplateId: 'D04AC939',
              notes: 'Felt good today.',
              sets: [
                { weightKg: 100, reps: 10, rpe: 8.5 },
                { type: SetType.FAILURE, weightKg: 100, reps: 6 },
              ],
            },
          ],
        },
      });

      // then
      expect(mockAxios.request).toHaveBeenCalledWith({
        method: 'POST',
        url: Url.WORKOUTS,
        data: {
          workout: {
            title: 'Friday Leg Day 🔥',
            description: null,
            start_time: '2024-08-14T12:00:00Z',
            end_time: '2024-08-14T12:30:00Z',
            is_private: false,
            exercises: [
              {
                exercise_template_id: 'D04AC939',
                superset_id: null,
                notes: 'Felt good today.',
                sets: [
                  {
                    type: 'normal',
                    weight_kg: 100,
                    reps: 10,
                    distance_meters: null,
                    duration_seconds: null,
                    custom_metric: null,
                    rpe: 8.5,
                  },
                  {
                    type: 'failure',
                    weight_kg: 100,
                    reps: 6,
                    distance_meters: null,
                    duration_seconds: null,
                    custom_metric: null,
                    rpe: null,
                  },
                ],
              },
            ],
          },
        },
      });
      expect(result.id).toBe(workout.id);
    });

    it('should reject an rpe the vendor does not accept', async () => {
      // when / then
      await expect(
        client.createWorkout({
          workout: {
            title: 'x',
            startTime: new Date(),
            endTime: new Date(),
            // @ts-expect-error 6.5 is not a valid rpe
            exercises: [{ exerciseTemplateId: 'x', sets: [{ rpe: 6.5 }] }],
          },
        }),
      ).rejects.toThrow(ZodError);
    });

    it('should update a workout', async () => {
      // given
      mockApiResponse(workout);

      // when
      const result = await client.updateWorkout({
        workoutId: workout.id,
        workout: { title: 'Renamed', startTime: new Date(), endTime: new Date(), isPrivate: true, exercises: [] },
      });

      // then
      expect(mockAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: `${Url.WORKOUTS}/${workout.id}`,
          data: { workout: expect.objectContaining({ title: 'Renamed', is_private: true }) },
        }),
      );
      expect(result.id).toBe(workout.id);
    });
  });

  describe('routines', () => {
    it('should parse getRoutines response', async () => {
      // given
      mockApiResponse(responseMock[Url.ROUTINES]);

      // when
      const page = await client.getRoutines();

      // then
      expect(mockAxios.request).toHaveBeenCalledWith({ method: 'GET', url: Url.ROUTINES, params: {} });
      expect(page.items[0]).toMatchObject({ folderId: 42, createdAt: new Date('2021-09-14T12:00:00Z') });
      expect(page.items[0].exercises[0]).toMatchObject({ restSeconds: 60 });
      expect(page.items[0].exercises[0].sets[0]).toMatchObject({ repRange: { start: 8, end: 12 }, reps: null });
    });

    it('should unwrap getRoutine response', async () => {
      // given
      mockApiResponse(getRoutine);

      // when
      const routine = await client.getRoutine({ routineId: getRoutine.routine.id });

      // then
      expect(mockAxios.request).toHaveBeenCalledWith({ method: 'GET', url: `${Url.ROUTINES}/${getRoutine.routine.id}` });
      expect(routine.title).toBe(getRoutine.routine.title);
    });

    it('should put a new routine into the default folder', async () => {
      // given
      mockApiResponse(getRoutine, 201);

      // when
      await client.createRoutine({
        routine: {
          title: 'April Leg Day 🔥',
          exercises: [{ exerciseTemplateId: 'D04AC939', restSeconds: 90, sets: [{ weightKg: 100, repRange: { start: 8, end: 12 } }] }],
        },
      });

      // then
      expect(mockAxios.request).toHaveBeenCalledWith({
        method: 'POST',
        url: Url.ROUTINES,
        data: {
          routine: {
            title: 'April Leg Day 🔥',
            folder_id: null,
            notes: undefined,
            exercises: [
              {
                exercise_template_id: 'D04AC939',
                superset_id: null,
                rest_seconds: 90,
                notes: null,
                sets: [
                  {
                    type: 'normal',
                    weight_kg: 100,
                    reps: null,
                    rep_range: { start: 8, end: 12 },
                    distance_meters: null,
                    duration_seconds: null,
                    custom_metric: null,
                  },
                ],
              },
            ],
          },
        },
      });
    });

    it('should keep the folder when updating a routine without folderId', async () => {
      // given
      mockApiResponse(getRoutine);

      // when
      await client.updateRoutine({ routineId: 'abc', routine: { title: 'Renamed', exercises: [] } });

      // then
      const config = lastRequest();
      expect(config).toMatchObject({ method: 'PUT', url: `${Url.ROUTINES}/abc` });
      expect(config.data?.routine).toEqual({ title: 'Renamed', folder_id: undefined, notes: null, exercises: [] });
      expect(JSON.stringify(config.data?.routine)).not.toContain('folder_id');
    });
  });

  describe('routine folders', () => {
    it('should parse getRoutineFolders response', async () => {
      // given
      mockApiResponse(responseMock[Url.ROUTINE_FOLDERS]);

      // when
      const page = await client.getRoutineFolders({ page: 1 });

      // then
      expect(mockAxios.request).toHaveBeenCalledWith({ method: 'GET', url: Url.ROUTINE_FOLDERS, params: { page: 1 } });
      expect(page.items[0]).toEqual({
        id: 42,
        index: 1,
        title: 'Push Pull 🏋️‍♂️',
        updatedAt: new Date('2021-09-14T12:00:00Z'),
        createdAt: new Date('2021-09-14T12:00:00Z'),
      });
    });

    it('should get a routine folder by id', async () => {
      // given
      const [folder] = responseMock[Url.ROUTINE_FOLDERS].routine_folders;
      mockApiResponse(folder);

      // when
      const result = await client.getRoutineFolder({ folderId: 42 });

      // then
      expect(mockAxios.request).toHaveBeenCalledWith({ method: 'GET', url: `${Url.ROUTINE_FOLDERS}/42` });
      expect(result.id).toBe(42);
    });

    it('should create a routine folder', async () => {
      // given
      const [folder] = responseMock[Url.ROUTINE_FOLDERS].routine_folders;
      mockApiResponse(folder, 201);

      // when
      const result = await client.createRoutineFolder({ title: 'Push Pull 🏋️‍♂️' });

      // then
      expect(mockAxios.request).toHaveBeenCalledWith({
        method: 'POST',
        url: Url.ROUTINE_FOLDERS,
        data: { routine_folder: { title: 'Push Pull 🏋️‍♂️' } },
      });
      expect(result.title).toBe(folder.title);
    });
  });

  describe('exercise templates', () => {
    it('should parse getExerciseTemplates response', async () => {
      // given
      mockApiResponse(responseMock[Url.EXERCISE_TEMPLATES]);

      // when
      const page = await client.getExerciseTemplates({ pageSize: 100 });

      // then
      expect(mockAxios.request).toHaveBeenCalledWith({ method: 'GET', url: Url.EXERCISE_TEMPLATES, params: { pageSize: 100 } });
      expect(page.items[0]).toEqual({
        id: '05293BCA',
        title: 'Bench Press (Barbell)',
        type: 'weight_reps',
        primaryMuscleGroup: 'chest',
        secondaryMuscleGroups: ['triceps', 'shoulders'],
        equipment: EquipmentCategory.BARBELL,
        isCustom: false,
        thumbnailUrl: 'https://example.com/bench.jpg',
      });
      // built-in exercise types beyond the ones custom exercises can use
      expect(page.items[1]).toMatchObject({ type: 'floors_duration', thumbnailUrl: null });
    });

    it('should get an exercise template by id', async () => {
      // given
      const [template] = responseMock[Url.EXERCISE_TEMPLATES].exercise_templates;
      mockApiResponse(template);

      // when
      const result = await client.getExerciseTemplate({ exerciseTemplateId: template.id });

      // then
      expect(mockAxios.request).toHaveBeenCalledWith({ method: 'GET', url: `${Url.EXERCISE_TEMPLATES}/${template.id}` });
      expect(result.id).toBe(template.id);
    });

    it('should create a custom exercise template and return its id', async () => {
      // given
      mockApiResponse({ id: 1234 });

      // when
      const id = await client.createExerciseTemplate({
        exercise: {
          title: 'Bench Press',
          exerciseType: ExerciseType.WEIGHT_REPS,
          equipmentCategory: EquipmentCategory.BARBELL,
          muscleGroup: MuscleGroup.CHEST,
          otherMuscles: [MuscleGroup.TRICEPS],
        },
      });

      // then
      expect(mockAxios.request).toHaveBeenCalledWith({
        method: 'POST',
        url: Url.EXERCISE_TEMPLATES,
        data: {
          exercise: {
            title: 'Bench Press',
            exercise_type: 'weight_reps',
            equipment_category: 'barbell',
            muscle_group: 'chest',
            other_muscles: ['triceps'],
          },
        },
      });
      expect(id).toBe('1234');
    });
  });

  describe('exercise history', () => {
    it('should parse getExerciseHistory response', async () => {
      // given
      mockApiResponse(responseMock[Url.EXERCISE_HISTORY]);

      // when
      const history = await client.getExerciseHistory({ exerciseTemplateId: 'D04AC939', startDate: '2024-01-01T00:00:00Z' });

      // then
      expect(mockAxios.request).toHaveBeenCalledWith({
        method: 'GET',
        url: `${Url.EXERCISE_HISTORY}/D04AC939`,
        params: { start_date: '2024-01-01T00:00:00Z' },
      });
      expect(history).toEqual([
        {
          workoutId: 'b459cba5-cd6d-463c-abd6-54f8eafcadcb',
          workoutTitle: 'Morning Workout 💪',
          workoutStartTime: new Date('2024-01-01T12:00:00Z'),
          workoutEndTime: new Date('2024-01-01T13:00:00Z'),
          exerciseTemplateId: 'D04AC939',
          setType: SetType.NORMAL,
          weightKg: 100,
          reps: 10,
          distanceMeters: null,
          durationSeconds: null,
          rpe: 8.5,
          customMetric: null,
        },
      ]);
    });
  });

  describe('body measurements', () => {
    it('should parse getBodyMeasurements response', async () => {
      // given
      mockApiResponse(responseMock[Url.BODY_MEASUREMENTS]);

      // when
      const page = await client.getBodyMeasurements();

      // then
      expect(mockAxios.request).toHaveBeenCalledWith({ method: 'GET', url: Url.BODY_MEASUREMENTS, params: {} });
      expect(page.items[0]).toEqual({
        date: '2024-08-14',
        weightKg: 80.5,
        leanMassKg: 65,
        fatPercent: 18.5,
        neckCm: null,
        shoulderCm: null,
        chestCm: 95,
        leftBicepCm: 35,
        rightBicepCm: 35.5,
        leftForearmCm: null,
        rightForearmCm: null,
        abdomen: null,
        waist: 80,
        hips: null,
        leftThigh: null,
        rightThigh: null,
        leftCalf: null,
        rightCalf: null,
      });
    });

    it('should get a body measurement by date', async () => {
      // given
      const [measurement] = responseMock[Url.BODY_MEASUREMENTS].body_measurements;
      mockApiResponse(measurement);

      // when
      const result = await client.getBodyMeasurement({ date: '2024-08-14' });

      // then
      expect(mockAxios.request).toHaveBeenCalledWith({ method: 'GET', url: `${Url.BODY_MEASUREMENTS}/2024-08-14` });
      expect(result.weightKg).toBe(80.5);
    });

    it('should reject a date that is not YYYY-MM-DD', async () => {
      // when / then
      await expect(client.getBodyMeasurement({ date: '14.08.2024' })).rejects.toThrow(ZodError);
    });

    it('should create a body measurement', async () => {
      // given
      mockApiResponse('', 201);

      // when
      await client.createBodyMeasurement({ measurement: { date: '2024-08-14', weightKg: 80.5, fatPercent: 18.5 } });

      // then
      const config = lastRequest();
      expect(config).toMatchObject({ method: 'POST', url: Url.BODY_MEASUREMENTS });
      expect(config.data).toMatchObject({ date: '2024-08-14', weight_kg: 80.5, fat_percent: 18.5, lean_mass_kg: null, right_calf: null });
      expect(Object.keys(config.data ?? {})).toHaveLength(18);
    });

    it('should throw ApiError when the date already has a measurement', async () => {
      // given
      mockApiResponse({ error: 'A measurement for this date already exists' }, 409);

      // when / then
      await expect(client.createBodyMeasurement({ measurement: { date: '2024-08-14', weightKg: 80 } })).rejects.toThrow(ApiError);
    });

    it('should update a body measurement', async () => {
      // given
      mockApiResponse('');

      // when
      await client.updateBodyMeasurement({ date: '2024-08-14', measurement: { weightKg: 79.9 } });

      // then
      const config = lastRequest();
      expect(config).toMatchObject({ method: 'PUT', url: `${Url.BODY_MEASUREMENTS}/2024-08-14` });
      expect(config.data).toMatchObject({ weight_kg: 79.9, waist: null });
      expect(config.data).not.toHaveProperty('date');
    });
  });

  describe('paginate', () => {
    it('should walk all pages', async () => {
      // given
      const fetchPage = jest.fn(async ({ page }: { page: number }) => ({ page, pageCount: 3, items: [page * 10, page * 10 + 1] }));

      // when
      const items: number[] = [];
      for await (const item of paginate(fetchPage, 2)) {
        items.push(item);
      }

      // then
      expect(items).toEqual([10, 11, 20, 21, 30, 31]);
      expect(fetchPage).toHaveBeenCalledTimes(3);
      expect(fetchPage).toHaveBeenLastCalledWith({ page: 3, pageSize: 2 });
    });

    it('should stop on an empty account', async () => {
      // given
      const fetchPage = jest.fn(async () => ({ page: 1, pageCount: 0, items: [] }));

      // when
      const items: unknown[] = [];
      for await (const item of paginate(fetchPage)) {
        items.push(item);
      }

      // then
      expect(items).toEqual([]);
      expect(fetchPage).toHaveBeenCalledTimes(1);
    });

    it('should page through the client', async () => {
      // given
      mockApiResponse({ ...responseMock[Url.WORKOUTS], page_count: 1 });

      // when
      const workouts = [];
      for await (const workout of paginate((params) => client.getWorkouts(params))) {
        workouts.push(workout);
      }

      // then
      expect(workouts).toHaveLength(2);
      expect(mockAxios.request).toHaveBeenCalledWith({ method: 'GET', url: Url.WORKOUTS, params: { page: 1, pageSize: 10 } });
    });
  });

  const axiosResponse = <T>(data: T, status: number): AxiosResponse<T> => ({
    data,
    status,
    statusText: '',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  });

  const lastRequest = () => {
    const [config] = jest.mocked(mockAxios.request).mock.lastCall ?? [];
    return config as AxiosRequestConfig<Record<string, unknown>>;
  };

  const mockApiResponse = (data: unknown, status = 200) => {
    jest.mocked(mockAxios.request).mockImplementationOnce(() => Promise.resolve(axiosResponse(data, status)));
  };
});
