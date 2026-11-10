import type { Page, PageParams } from './types';

/**
 * Walks all pages of a paginated endpoint and yields the items one by one.
 *
 * @example
 * for await (const workout of paginate((params) => client.getWorkouts(params))) {
 *   console.log(workout.title);
 * }
 */
export async function* paginate<T>(fetchPage: (params: Required<PageParams>) => Promise<Page<T>>, pageSize = 10): AsyncGenerator<T> {
  for (let page = 1; ; page++) {
    const result = await fetchPage({ page, pageSize });
    yield* result.items;

    if (result.items.length === 0 || page >= result.pageCount) {
      return;
    }
  }
}
