import { NextResponse, type NextRequest } from "next/server";

// Set by the API (old product name kept until the backend renames it).
const ACCESS_COOKIE = "batisso_admin_access";

// `/password` opens from the API's emailed links (feature 4).
const PUBLIC_PATHS = new Set(["/login", "/password"]);

/**
 * Optimistic check only: no access cookie means no session on this request, so
 * go to login before rendering. The protected layout verifies the session with
 * the API. It never redirects away from `/login`: a stale cookie would loop.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname) || request.cookies.has(ACCESS_COOKIE)) {
    return NextResponse.next();
  }
  const login = new URL("/login", request.nextUrl);
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  // Pages only: not the /api/v1 rewrite, Next.js assets or files like favicon.ico.
  matcher: ["/((?!api/|_next/static|_next/image|.*\\.[^/]+$).*)"],
};
