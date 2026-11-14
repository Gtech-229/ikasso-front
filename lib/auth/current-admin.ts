import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { currentAdminSchema, ME_PATH, type CurrentAdmin } from "@/lib/api/admin-auth";
import { isApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server";

/**
 * The signed-in admin for this request, checked by the API. A 401 means the
 * access cookie is there but the session is gone (revoked, deactivated): the
 * login page's silent refresh decides whether the admin must sign in again.
 * Any other failure reaches the route's error boundary.
 */
export const getCurrentAdmin = cache(async (): Promise<CurrentAdmin> => {
  try {
    return await serverFetch(ME_PATH, { schema: currentAdminSchema });
  } catch (error) {
    if (isApiError(error) && error.statusCode === 401) redirect("/login");
    throw error;
  }
});
