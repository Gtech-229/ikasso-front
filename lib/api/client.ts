import { ApiError, isApiError } from "./errors";
import { buildInit, parseResponse, send, toApiError, type RequestOptions } from "./core";

const API_BASE = "/api/v1";
const REFRESH_PATH = "/admin/auth/refresh";
const ME_PATH = "/admin/auth/me";
const LOGIN_PAGE = "/login";
const REFRESH_LOCK = "ikasso-session-refresh";
const WRONG_PASSWORD = "INVALID_CREDENTIALS";

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
export type RefreshOutcome = "refreshed" | "ended" | ApiError;

// The one refresh in flight; every request that meets a 401 meanwhile waits on it.
let refreshInFlight: Promise<RefreshOutcome> | null = null;

async function classifyRefresh(response: Response): Promise<RefreshOutcome> {
  if (response.ok) return "refreshed";
  if (response.status < 500) return "ended";
  return toApiError(response);
}

/**
 * Probe first: another tab may already have rotated the shared cookies while
 * this one waited for the lock. Refreshing again with the old refresh token
 * would be refused, and that refusal clears every tab's cookies.
 */
async function probeThenRefresh(): Promise<RefreshOutcome> {
  const probe = await send(`${API_BASE}${ME_PATH}`, {
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });
  if (probe.ok) return "refreshed";
  if (probe.status !== 401) return toApiError(probe);

  const response = await send(`${API_BASE}${REFRESH_PATH}`, {
    method: "POST",
    credentials: "same-origin",
  });
  return classifyRefresh(response);
}

/** One refresh across all tabs (Web Locks), and one per tab at a time. */
export function refreshSession(): Promise<RefreshOutcome> {
  if (refreshInFlight) return refreshInFlight;
  // Web Locks needs a secure context (https or localhost); without it, refresh
  // per tab as before.
  const locked: Promise<RefreshOutcome> =
    typeof navigator !== "undefined" && navigator.locks
      ? // `then` flattens the callback's promise that the DOM typing nests.
        navigator.locks.request(REFRESH_LOCK, probeThenRefresh).then((outcome) => outcome)
      : probeThenRefresh();
  const flight = locked
    .catch((error: unknown) => (isApiError(error) ? error : ApiError.network()))
    .finally(() => {
      refreshInFlight = null;
    });
  refreshInFlight = flight;
  return flight;
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
    const unauthorized = await toApiError(response);
    // A wrong password checked by the handler (change password) is an answer,
    // not an expired token: replaying it would count twice toward the lockout.
    if (unauthorized.error === WRONG_PASSWORD) throw unauthorized;

    const outcome = await refreshSession();
    if (outcome === "ended") {
      goToLogin();
      throw unauthorized;
    }
    if (outcome !== "refreshed") throw outcome;
    // Only the auth guard's 401 gets here: it rejects the request before any
    // handler runs, so replaying a mutation cannot apply it twice.
    response = await send(url, init);
  }

  return parseResponse(response, options.schema);
}
