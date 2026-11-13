import { z } from "zod";

/** The API's paginated list envelope; `page` starts at 1. */
export function paginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  });
}

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
