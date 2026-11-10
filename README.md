# hevy-client

[![npm](https://img.shields.io/npm/v/@krngl/hevy-client)](https://www.npmjs.com/package/@krngl/hevy-client)
[![build & test](https://github.com/krngl/hevy-client/actions/workflows/build.yml/badge.svg)](https://github.com/krngl/hevy-client/actions/workflows/build.yml)
[![license](https://img.shields.io/npm/l/@krngl/hevy-client)](LICENSE)

A typed Node.js client for the [Hevy public API](https://api.hevyapp.com/docs/). Use it to read and log workouts, manage routines and
custom exercises, and sync body measurements from your own code.
- **Typed**: responses are validated with [zod](https://zod.dev) and returned as camelCase objects with `Date` timestamps.
- **Validated input**: payloads are checked before they are sent, so a bad RPE or date fails locally instead of at the API.
- **Complete**: every endpoint of the public API, including workout events for incremental sync.

> [!NOTE]
> This is an unofficial project and is not affiliated with Hevy. The API itself is still early, and Hevy makes no promise that it won't change.

## Installation

```sh
npm install @krngl/hevy-client
# or
yarn add @krngl/hevy-client
```

Requires Node.js 24 or newer, and a Hevy Pro account for the API key.

## Quick start

Get your API key at [hevy.com/settings?developer](https://hevy.com/settings?developer).

```ts
import { HevyClient, paginate } from '@krngl/hevy-client';

const client = new HevyClient({ apiKey: process.env.HEVY_API_KEY! });

const user = await client.getUserInfo();
console.log(`${user.name} has logged ${await client.getWorkoutCount()} workouts`);

for await (const workout of paginate((params) => client.getWorkouts(params))) {
  console.log(workout.startTime.toISOString(), workout.title, `${workout.exercises.length} exercises`);
}
```

## Usage

### Pagination

List endpoints take `{ page, pageSize }` and return `{ page, pageCount, items }`. Most endpoints allow up to 10 items per page, exercise
templates up to 100. `paginate()` walks all pages for you:

```ts
const templates = [];
for await (const template of paginate((params) => client.getExerciseTemplates(params), 100)) {
  templates.push(template);
}
```

### Workouts

```ts
const { items } = await client.getWorkouts({ page: 1, pageSize: 10 }); // newest first
const workout = await client.getWorkout({ workoutId: items[0].id });
const count = await client.getWorkoutCount();

const legDay: WorkoutInput = {
  title: 'Friday Leg Day',
  startTime: new Date('2024-08-14T12:00:00Z'),
  endTime: new Date('2024-08-14T13:00:00Z'),
  exercises: [
    {
      exerciseTemplateId: 'D04AC939',
      sets: [
        { type: SetType.WARMUP, weightKg: 60, reps: 10 },
        { weightKg: 100, reps: 8, rpe: 8.5 },
      ],
    },
  ],
};

const created = await client.createWorkout({ workout: legDay });
await client.updateWorkout({ workoutId: created.id, workout: { ...legDay, title: 'Leg Day' } });
```

Sets default to `SetType.NORMAL`, fields you leave out are sent as `null`. Timestamps can be a `Date` or an ISO 8601 string. `rpe` only
accepts the values Hevy does: `6, 7, 7.5, 8, 8.5, 9, 9.5, 10`.

### Keeping a local copy in sync

Instead of fetching all workouts again, ask for what changed since your last sync:

```ts
for await (const event of paginate((params) => client.getWorkoutEvents({ ...params, since: lastSync }))) {
  if (event.type === 'updated') {
    await store.upsert(event.workout);
  } else {
    await store.delete(event.id);
  }
}
```

> [!TIP]
> If you poll hourly or daily, don't fire exactly at the full hour. Hevy asks to pick a random minute instead.

### Routines and folders

```ts
const { items: routines } = await client.getRoutines();
const routine = await client.getRoutine({ routineId: routines[0].id });

const folder = await client.createRoutineFolder({ title: 'Push Pull' }); // placed first, other folders move down
const { items: folders } = await client.getRoutineFolders();

await client.createRoutine({
  routine: {
    title: 'Upper Body',
    folderId: folder.id, // leave out or null for the default "My Routines" folder
    exercises: [{ exerciseTemplateId: '05293BCA', restSeconds: 90, sets: [{ weightKg: 80, repRange: { start: 8, end: 12 } }] }],
  },
});

// leaving folderId out keeps the routine where it is
await client.updateRoutine({ routineId: routine.id, routine: { title: 'Upper Body A', exercises: [] } });
```

### Exercise templates and history

```ts
const template = await client.getExerciseTemplate({ exerciseTemplateId: '05293BCA' });

const id = await client.createExerciseTemplate({
  exercise: {
    title: 'Landmine Press',
    exerciseType: ExerciseType.WEIGHT_REPS,
    equipmentCategory: EquipmentCategory.BARBELL,
    muscleGroup: MuscleGroup.SHOULDERS,
    otherMuscles: [MuscleGroup.TRICEPS, MuscleGroup.CHEST],
  },
});

// every logged set of an exercise, optionally within a time range
const history = await client.getExerciseHistory({ exerciseTemplateId: id, startDate: new Date('2024-01-01') });
```

### Body measurements

Measurements are stored per date (`YYYY-MM-DD`).

```ts
await client.createBodyMeasurement({ measurement: { date: '2024-08-14', weightKg: 80.5, fatPercent: 18.5 } });

const { date, ...measurement } = await client.getBodyMeasurement({ date: '2024-08-14' });
const { items } = await client.getBodyMeasurements();

// replaces the whole entry: measurements you leave out are cleared
await client.updateBodyMeasurement({ date, measurement: { ...measurement, weightKg: 80.1 } });
```

### Errors

| Error                 | When                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| `AuthenticationError` | The API key is missing or invalid (HTTP 401).                                                          |
| `ApiError`            | Any other error status. `status` holds the HTTP status, `error` the message from Hevy if there is one. |
| `ZodError`            | Your input is invalid, or Hevy returned data that does not match the documented shape.                 |

Notable statuses: `404` when a resource does not exist, `403` when a free account hits the routine (4) or custom exercise (7) limit, `409`
when a body measurement already exists for the date.

## Development

```sh
yarn install
yarn test
yarn lint
yarn build
```

Publishing happens on tag push through GitHub Actions.

## License

[AGPL-3.0-or-later](LICENSE)
