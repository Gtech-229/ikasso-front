import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RequirePermission } from "@/lib/auth/require-permission";
import { ImportStoresView } from "./import-stores-view";

export const metadata: Metadata = { title: "Importer des quincailleries · Ikasso Administration" };

// Back link and title render at once; the permission check inside the boundary.
// Both import routes need stores.manage (the API's guard).
export default function ImportStoresPage() {
  return (
    <div className="flex min-w-0 flex-col gap-5 p-5 md:p-8">
      <Link
        href="/stores"
        className="flex min-h-11 w-fit items-center gap-2 text-[15px] font-semibold text-muted-ink hover:text-ink"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Quincailleries
      </Link>
      <h1 className="font-display text-[32px] leading-tight font-bold">Importer des quincailleries</h1>
      <Suspense fallback={<Skeleton className="h-96 max-w-4xl rounded-card" />}>
        <RequirePermission permission="stores.manage">
          <ImportStoresView />
        </RequirePermission>
      </Suspense>
    </div>
  );
}
