"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";

/** Registering needs stores.manage (API guard) and countries.read (country list). */
export function RegisterStoreButton() {
  const admin = useCurrentAdmin().data;
  if (!admin || !can(admin, "stores.manage") || !can(admin, "countries.read")) return null;
  return (
    <Link href="/stores/new" className={buttonVariants({ variant: "action" })}>
      Inscrire une quincaillerie
    </Link>
  );
}
