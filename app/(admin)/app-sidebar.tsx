"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Wordmark } from "@/components/wordmark";
import { type CurrentAdmin, ROLE_LABELS } from "@/lib/api/admin-auth";
import { fetchPendingStoresCount, pendingStoresCountQueryKey } from "@/lib/api/stores";
import { can } from "@/lib/auth/permissions";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";
import { navEntryFor, visibleNav } from "@/lib/nav";
import { SignOutButton } from "./sign-out-button";

export function AppSidebar() {
  // Seeded by the layout on the server, so it is always there on first render.
  const { data: admin } = useCurrentAdmin();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const canReadStores = admin ? can(admin, "stores.read") : false;
  // No badge while loading or after a failure (already toasted): never a fake number.
  const { data: pendingCount } = useQuery({
    queryKey: pendingStoresCountQueryKey,
    queryFn: fetchPendingStoresCount,
    enabled: canReadStores,
  });
  if (!admin) return null;

  const activeHref = navEntryFor(pathname)?.href;
  const badge = canReadStores && pendingCount ? pendingCount : 0;
  // The mobile sheet closes once a destination is chosen.
  const closeMobile = () => setOpenMobile(false);

  return (
    <Sidebar>
      <SidebarHeader className="p-5">
        <Link href="/" onClick={closeMobile} aria-label="Accueil Ikasso" className="flex min-h-11 w-fit items-center">
          <Wordmark />
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {visibleNav(admin).map((group) => (
          <SidebarGroup key={group.label ?? "main"}>
            {group.label && (
              <SidebarGroupLabel className="text-xs tracking-wide text-sidebar-foreground/60 uppercase">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.entries.map((entry) => {
                  const active = entry.href === activeHref;
                  return (
                    <SidebarMenuItem key={entry.href}>
                      <SidebarMenuButton
                        isActive={active}
                        className="h-11 rounded-control px-3 text-[15px] hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground data-active:bg-brand data-active:font-semibold data-active:text-ink [&_svg]:size-5"
                        render={
                          <Link
                            href={entry.href}
                            onClick={closeMobile}
                            aria-current={active ? "page" : undefined}
                          />
                        }
                      >
                        <entry.icon />
                        <span>{entry.label}</span>
                        {entry.href === "/stores" && badge > 0 && (
                          <span className="sr-only">, {badge} à vérifier</span>
                        )}
                      </SidebarMenuButton>
                      {entry.href === "/stores" && badge > 0 && (
                        <SidebarMenuBadge
                          aria-hidden="true"
                          className={
                            active
                              ? "top-3 right-3 rounded-full bg-ink px-2 text-surface"
                              : "top-3 right-3 rounded-full bg-brand px-2 text-ink"
                          }
                        >
                          {badge}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-4 p-0">
        <p className="mx-4 rounded-control bg-sidebar-foreground/5 p-3 text-[13px] leading-snug text-sidebar-foreground/70">
          Ikasso ne crée, ne modifie et ne supprime jamais une opération d’une
          quincaillerie.
        </p>
        <AdminCard admin={admin} onNavigate={closeMobile} />
        <div className="stripe h-3" />
      </SidebarFooter>
    </Sidebar>
  );
}

function AdminCard({ admin, onNavigate }: { admin: CurrentAdmin; onNavigate: () => void }) {
  const initials = `${admin.firstName.charAt(0)}${admin.lastName.charAt(0)}`.toUpperCase();
  return (
    <div className="mx-4 flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-ink"
      >
        {initials}
      </span>
      <Link
        href="/profile"
        onClick={onNavigate}
        className="flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-control underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
      >
        <span className="truncate text-[15px] font-semibold">
          {admin.firstName} {admin.lastName}
        </span>
        <span className="truncate text-[13px] text-sidebar-foreground/60">{ROLE_LABELS[admin.role]}</span>
      </Link>
      <SignOutButton />
    </div>
  );
}
