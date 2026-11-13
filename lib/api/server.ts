import "server-only";

import { cookies } from "next/headers";
import { readEnv } from "@/lib/env";
import { buildInit, parseResponse, send, type RequestOptions } from "./core";

/**
 * Calls the API from server code, forwarding the incoming request's cookies.
 * It never refreshes the session: server components cannot set cookies, so a
 * 401 throws and the browser refetches through the client refresh queue.
 */
export async function serverFetch<T>(
  path: string,
  options: RequestOptions<T> = {},
): Promise<T> {
  const { API_URL } = readEnv();
  const cookieHeader = (await cookies()).toString();
  const init: RequestInit = {
    ...buildInit(options, cookieHeader ? { Cookie: cookieHeader } : {}),
    cache: "no-store",
  };
  const response = await send(`${API_URL}/api/v1${path}`, init);
  return parseResponse(response, options.schema);
}
