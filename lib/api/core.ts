import type { z } from "zod";
import { ApiError, apiErrorBodySchema } from "./errors";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface RequestOptions<T> {
  method?: HttpMethod;
  body?: unknown;
  /** Parses the success body. Omit only for routes that answer 204. */
  schema?: z.ZodType<T>;
  signal?: AbortSignal;
}

export function buildInit(
  options: RequestOptions<unknown>,
  extraHeaders: Record<string, string> = {},
): RequestInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...extraHeaders,
  };
  let body: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  return {
    method: options.method ?? "GET",
    headers,
    body,
    signal: options.signal,
  };
}

export async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw ApiError.network();
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export async function toApiError(response: Response): Promise<ApiError> {
  const parsed = apiErrorBodySchema.safeParse(await readJson(response));
  if (parsed.success) return new ApiError(parsed.data);
  return response.status >= 500
    ? ApiError.unavailable(response.status)
    : ApiError.unexpected(response.status);
}

/** Turns a response into parsed data, or throws an ApiError. */
export async function parseResponse<T>(
  response: Response,
  schema: z.ZodType<T> | undefined,
): Promise<T> {
  if (!response.ok) throw await toApiError(response);
  if (response.status === 204 || !schema) return undefined as T;

  const result = schema.safeParse(await readJson(response));
  if (!result.success) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`Réponse inattendue de ${response.url}`, result.error.issues);
    }
    throw ApiError.unexpected(response.status);
  }
  return result.data;
}
