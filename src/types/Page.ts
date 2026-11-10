import { z } from 'zod';

export interface PageParams {
  /** 1 or greater, defaults to 1 */
  page?: number;
  /** items per page, the maximum depends on the endpoint */
  pageSize?: number;
}

export interface Page<T> {
  page: number;
  pageCount: number;
  items: T[];
}

const PageInfoSchema = z.object({
  page: z.number().int(),
  page_count: z.number().int(),
});

/** parses a paginated vendor response whose items live under `key` */
export const parsePage = <T extends z.ZodType>(data: unknown, key: string, itemSchema: T): Page<z.output<T>> => {
  const { page, page_count } = PageInfoSchema.parse(data);
  const items = z.array(itemSchema).parse((data as Record<string, unknown>)[key]);

  return { page, pageCount: page_count, items };
};
