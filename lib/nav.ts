import {
  Activity,
  BarChart3,
  Globe,
  LifeBuoy,
  type LucideIcon,
  Receipt,
  Settings,
  ShieldCheck,
  Store,
  UserCog,
  Users,
} from "lucide-react";
import type { CurrentAdmin } from "@/lib/api/admin-auth";
import { can, isSuperAdmin } from "@/lib/auth/permissions";

type AdminAccess = Pick<CurrentAdmin, "role" | "permissions">;

export interface NavEntry {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Mirrors the API guard of the section's list route. */
  allowed: (admin: AdminAccess) => boolean;
}

export interface NavGroup {
  /** No label for the main group (the mockup's sidebar). */
  label?: string;
  entries: NavEntry[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    entries: [
      { href: "/stores", label: "Quincailleries", icon: Store, allowed: (a) => can(a, "stores.read") },
      {
        href: "/subscriptions",
        label: "Abonnements",
        icon: Receipt,
        allowed: (a) => can(a, "subscriptions.read"),
      },
      { href: "/stats", label: "Statistiques", icon: BarChart3, allowed: (a) => can(a, "stats.read") },
      {
        href: "/support",
        label: "Support",
        icon: LifeBuoy,
        allowed: (a) => can(a, "disputes.read") || can(a, "alerts.read"),
      },
    ],
  },
  {
    label: "Supervision",
    entries: [
      { href: "/accounts", label: "Comptes clients", icon: Users, allowed: (a) => can(a, "accounts.read") },
      {
        href: "/activity",
        label: "Journal d’activité",
        icon: Activity,
        allowed: (a) => can(a, "activity.read"),
      },
    ],
  },
  {
    label: "Plateforme",
    entries: [
      { href: "/countries", label: "Pays", icon: Globe, allowed: (a) => can(a, "countries.read") },
      { href: "/admins", label: "Administrateurs", icon: UserCog, allowed: isSuperAdmin },
      { href: "/roles", label: "Rôles et permissions", icon: ShieldCheck, allowed: isSuperAdmin },
      { href: "/settings", label: "Paramètres", icon: Settings, allowed: (a) => can(a, "settings.read") },
    ],
  },
];

/** The groups this admin may open, without empty groups. */
export function visibleNav(admin: AdminAccess): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    entries: group.entries.filter((entry) => entry.allowed(admin)),
  })).filter((group) => group.entries.length > 0);
}

/** The section a path belongs to: its own entry or a sub-path of it. */
export function navEntryFor(pathname: string): NavEntry | undefined {
  return NAV_GROUPS.flatMap((group) => group.entries).find(
    (entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`),
  );
}
