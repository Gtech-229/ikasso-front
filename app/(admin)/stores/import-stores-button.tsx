"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";

/** Importing needs stores.manage (the API's guard on both import routes). */
export function ImportStoresButton() {
  const admin = useCurrentAdmin().data;
  if (!admin || !can(admin, "stores.manage")) return null;
  return (
    <Link href="/stores/import" className={buttonVariants({ variant: "secondary" })}>
      Importer
    </Link>
  );
}
