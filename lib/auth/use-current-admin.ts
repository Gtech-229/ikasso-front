"use client";

import { useQuery } from "@tanstack/react-query";
import { currentAdminQueryKey, fetchCurrentAdmin } from "@/lib/api/admin-auth";

/** The signed-in admin, seeded by the protected layout on the server. */
export function useCurrentAdmin() {
  return useQuery({ queryKey: currentAdminQueryKey, queryFn: fetchCurrentAdmin });
}
