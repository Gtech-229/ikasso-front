const LOGIN_PAGE = "/login";
const HOME = "/";
// A placeholder origin: only used to check that `next` cannot leave the site.
const BASE = "http://ikasso.invalid";

// "//host" or "/\host": a browser reads it as another site (protocol-relative).
function leavesSite(path: string): boolean {
  return path.startsWith("//") || path.startsWith("/\\");
}

/**
 * The page to open after sign-in, from the `next` query parameter. Only a path
 * on this site is followed (no open redirect); anything else gives the home.
 * The checks run on the normalized result too: dot segments such as
 * "/..//evil.test" resolve to "//evil.test".
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || leavesSite(raw)) return HOME;
  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return HOME;
  }
  if (url.origin !== BASE || url.pathname === LOGIN_PAGE || leavesSite(url.pathname)) {
    return HOME;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
