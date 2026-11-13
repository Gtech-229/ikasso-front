import { ApiError, isApiError } from "./errors";
import { buildInit, parseResponse, send, toApiError, type RequestOptions } from "./core";

const API_BASE = "/api/v1";
const REFRESH_PATH = "/admin/auth/refresh";
const LOGIN_PAGE = "/login";

// A 401 on these means bad credentials or an expired link, not an expired
// access token, so they never trigger a refresh.
const AUTH_PATHS = new Set([
  "/admin/auth/login",
  REFRESH_PATH,
  "/admin/auth/logout",
  "/admin/auth/forgot-password",
  "/admin/auth/reset-password",
]);

/**
 * "refreshed": new cookies are set. "ended": the API refused the refresh (4xx),
 * so the session is over. An ApiError: network or 5xx failure, the session may
 * still be valid, so the admin must not be sent to login.
 */
type RefreshOutcome = "refreshed" | "ended" | ApiError;

// The one refresh in flight; every request that meets a 401 meanwhile waits on it.
let refreshInFlight: Promise<RefreshOutcome> | null = null;

async function classifyRefresh(response: Response): Promise<RefreshOutcome> {
  if (response.ok) return "refreshed";
  if (response.status < 500) return "ended";
  return toApiError(response);
}

function refreshSession(): Promise<RefreshOutcome> {
  refreshInFlight ??= send(`${API_BASE}${REFRESH_PATH}`, {
    method: "POST",
    credentials: "same-origin",
  })
    .then(classifyRefresh)
    .catch((error: unknown) => (isApiError(error) ? error : ApiError.network()))
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

// Every request queued behind a failed refresh lands here; navigate only once.
let redirectingToLogin = false;

function goToLogin(): void {
  const { pathname, search } = window.location;
  if (redirectingToLogin || pathname === LOGIN_PAGE) return;
  redirectingToLogin = true;
  const next = encodeURIComponent(`${pathname}${search}`);
  // A full page load on purpose: this runs outside React (no router), and it
  // drops the whole in-memory query cache of the ended session.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`${LOGIN_PAGE}?next=${next}`);
}

/**
 * Calls the API from the browser through the same-origin proxy. On an expired
 * session it refreshes once, queues concurrent 401s behind that refresh, and
 * replays each request once; if the refresh fails it sends the admin to login.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions<T> = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const init: RequestInit = { ...buildInit(options), credentials: "same-origin" };

  let response = await send(url, init);

  if (response.status === 401 && !AUTH_PATHS.has(path)) {
    const outcome = await refreshSession();
    if (outcome === "ended") {
      const error = await toApiError(response);
      goToLogin();
      throw error;
    }
    if (outcome !== "refreshed") throw outcome;
    // The API rejects a 401 request in its auth guard before any handler
    // runs, so replaying a mutation cannot apply it twice.
    response = await send(url, init);
  }

  return parseResponse(response, options.schema);
}
