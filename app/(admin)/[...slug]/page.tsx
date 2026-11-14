import { notFound } from "next/navigation";
import { Forbidden } from "@/components/forbidden";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { navEntryFor } from "@/lib/nav";

// Any path without its own page yet. A section the role may not open gives the
// 403 view (same answer as when the page exists); anything else is not found.
// Real pages added by later features take precedence over this catch-all.
export default async function UnbuiltSection({ params }: PageProps<"/[...slug]">) {
  const { slug } = await params;
  const entry = navEntryFor(`/${slug.join("/")}`);
  const admin = await getCurrentAdmin();
  if (entry && !entry.allowed(admin)) return <Forbidden />;
  notFound();
}
