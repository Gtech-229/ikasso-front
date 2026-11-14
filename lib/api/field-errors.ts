import { isApiError } from "./errors";

/** The API's validation message for one field (`details`), if any. */
export function apiFieldMessage(error: unknown, field: string): string | undefined {
  if (!isApiError(error)) return undefined;
  return error.details.find((detail) => detail.field === field)?.errors[0];
}
