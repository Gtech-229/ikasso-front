"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Forbidden } from "@/components/forbidden";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isApiError, isForbidden, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { fetchStats, statsQueryKey, type Figures, type PlatformStats } from "@/lib/api/stats";
import { can } from "@/lib/auth/permissions";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";
import { formatDate } from "@/lib/format";
import { parseStatsPeriod, STATS_PERIODS, statsHref, statsPeriodRange, todayUtc, type StatsPeriod } from "@/lib/stats-period";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { ShallowLink } from "../stores/shallow-link";

const numberFormat = new Intl.NumberFormat("fr-FR");
const n = (value: number) => numberFormat.format(value);

export function StatsView() {
  const period = parseStatsPeriod(useSearchParams());
  const { from, to } = statsPeriodRange(period, todayUtc());
  const query = useQuery({
    queryKey: statsQueryKey(from, to),
    queryFn: () => fetchStats(from, to),
    // The previous period stays on screen while the next one loads.
    placeholderData: keepPreviousData,
    meta: { inlineError: true },
  });

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PeriodSwitch period={period} />
      {query.isError ? (
        isForbidden(query.error) ? (
          <Forbidden embedded />
        ) : (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-card bg-surface p-6">
            <p className="text-[15px] text-danger">
              {isApiError(query.error) ? query.error.message : UNEXPECTED_ERROR_MESSAGE}
            </p>
            <Button variant="secondary" onClick={() => query.refetch()}>
              Réessayer
            </Button>
          </div>
        )
      ) : !query.data ? (
        <FiguresSkeleton />
      ) : (
        <div
          aria-busy={query.isFetching || undefined}
          className={cn("flex min-w-0 flex-col gap-5", query.isPlaceholderData && "opacity-60 transition-opacity")}
        >
          <Stats stats={query.data} />
        </div>
      )}
    </div>
  );
}

function PeriodSwitch({ period }: { period: StatsPeriod }) {
  return (
    <nav aria-label="Période" className="-mx-1 overflow-x-auto px-1">
      <ul className="flex gap-2">
        {STATS_PERIODS.map((option) => {
          const active = option.days === period;
          return (
            <li key={option.days}>
              <ShallowLink
                href={statsHref(option.days)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-full px-4 text-[15px] font-semibold whitespace-nowrap transition-colors",
                  active ? "bg-ink text-surface" : "bg-surface text-ink hover:bg-ink/5",
                )}
              >
                {option.label}
              </ShallowLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Stats({ stats }: { stats: PlatformStats }) {
  const { platform } = stats;
  return (
    <>
      <p className="text-[15px] text-muted-ink">
        Du {formatDate(stats.period.from)} au {formatDate(stats.period.to)} (jours inclus, UTC).
      </p>
      <ToHandle figures={platform} />
      <FigureTabs>
        <Section value="stores">
          <Group caption="Par statut, à ce jour">
            <Figure label="À vérifier" value={platform.stores.byStatus.PENDING} />
            <Figure label="Vérifiées" value={platform.stores.byStatus.VERIFIED} />
            <Figure label="Suspendues" value={platform.stores.byStatus.SUSPENDED} />
            <Figure label="Fermées" value={platform.stores.byStatus.CLOSED} />
          </Group>
          <Group caption="Par abonnement, à ce jour">
            <Figure label="Actif" value={platform.stores.bySubscription.ACTIVE} />
            <Figure label="À venir" value={platform.stores.bySubscription.UPCOMING} />
            <Figure label="Expiré" value={platform.stores.bySubscription.EXPIRED} />
            <Figure label="Aucun" value={platform.stores.bySubscription.NONE} />
          </Group>
          <Group caption="Sur la période">
            <Figure label="Inscrites" value={platform.stores.registered} />
          </Group>
        </Section>
        <Section value="accounts">
          <Group caption="À ce jour">
            <Figure label="Comptes" value={platform.accounts.total} />
            <Figure label="Suspendus" value={platform.accounts.suspended} />
          </Group>
          <Group caption="Sur la période">
            <Figure label="Ouverts" value={platform.accounts.opened} />
            <Figure label="Actifs (au moins un dépôt confirmé)" value={platform.accounts.active} />
          </Group>
        </Section>
        <Section value="trust">
          <Group caption="Sur la période">
            <Figure label="Contestations ouvertes" value={platform.trust.disputesOpened} />
            <Figure label="Corrections confirmées" value={platform.trust.corrections} />
            <Figure label="Bons refusés" value={platform.trust.ordersRefused} />
            <Figure label="Clôtures de caisse avec écart" value={platform.trust.closingsWithDiscrepancy} />
          </Group>
          <Group caption="À ce jour">
            <Figure label="Contestations en cours" value={platform.trust.disputesUnresolved} />
          </Group>
        </Section>
        <Countries countries={stats.countries} />
      </FigureTabs>
    </>
  );
}

/** Dark, most urgent card: what an admin should act on now. */
function ToHandle({ figures }: { figures: Figures }) {
  const admin = useCurrentAdmin().data;
  const items = [
    {
      label: "Quincailleries à vérifier",
      value: figures.stores.byStatus.PENDING,
      href: admin && can(admin, "stores.read") ? "/stores?status=PENDING" : undefined,
    },
    {
      label: "Abonnements expirés",
      value: figures.stores.bySubscription.EXPIRED,
      href: admin && can(admin, "subscriptions.read") ? "/subscriptions?state=EXPIRED" : undefined,
    },
    // The support page (disputes) is a later feature: no link yet.
    { label: "Contestations en cours", value: figures.trust.disputesUnresolved, href: undefined },
  ];
  return (
    <section
      aria-labelledby="stats-to-handle"
      className="relative overflow-hidden rounded-card bg-ink p-5 pb-7 text-surface"
    >
      <h2 id="stats-to-handle" className="font-display text-[18px] font-bold">
        À traiter
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <li key={item.label} className="flex flex-col gap-1">
            <span className="font-display text-[36px] leading-tight font-bold">{n(item.value)}</span>
            {item.href ? (
              <Link href={item.href} className="text-[14px] text-surface/80 underline underline-offset-4 hover:text-surface">
                {item.label}
              </Link>
            ) : (
              <span className="text-[14px] text-surface/80">{item.label}</span>
            )}
          </li>
        ))}
      </ul>
      <div className="stripe absolute inset-x-0 bottom-0 h-2" />
    </section>
  );
}

const FIGURE_TABS = [
  { value: "stores", label: "Quincailleries" },
  { value: "accounts", label: "Comptes clients" },
  { value: "trust", label: "Fiabilité du registre" },
  { value: "countries", label: "Par pays" },
] as const;
type FigureTab = (typeof FIGURE_TABS)[number]["value"];

const TAB_TRIGGER =
  "min-h-11 flex-none rounded-full bg-surface px-4 text-[15px] font-semibold text-ink hover:bg-ink/5 data-active:bg-ink data-active:text-surface data-active:shadow-none md:rounded-control md:px-4";
const PANEL = "flex min-w-0 flex-col gap-4 rounded-card bg-surface p-5";

/**
 * The four figure blocks as tabs (user revision): a row of pills on phones, a
 * column beside the panel from md, so the page fits without scrolling. The
 * orientation follows the layout so the arrow keys match what is on screen.
 */
function FigureTabs({ children }: { children: React.ReactNode }) {
  const vertical = !useIsMobile();
  return (
    <Tabs
      defaultValue={"stores" satisfies FigureTab}
      orientation={vertical ? "vertical" : "horizontal"}
      className="min-w-0 gap-4 md:items-start"
    >
      <div className="-mx-1 max-w-full overflow-x-auto px-1 md:mx-0 md:overflow-visible md:px-0">
        <TabsList aria-label="Chiffres" className="h-auto gap-2 bg-transparent p-0 md:w-56 md:items-stretch">
          {FIGURE_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className={TAB_TRIGGER}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {children}
    </Tabs>
  );
}

// Labelled by its tab, so the panel carries no heading of its own.
function Section({ value, children }: { value: FigureTab; children: React.ReactNode }) {
  return (
    <TabsContent value={value} className={PANEL}>
      {children}
    </TabsContent>
  );
}

function Group({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[13px] font-semibold text-muted-ink">{caption}</h3>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">{children}</dl>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse rounded-control bg-canvas px-4 py-3">
      <dt className="text-[13px] text-muted-ink">{label}</dt>
      <dd className="font-display text-[28px] leading-tight font-bold">{n(value)}</dd>
    </div>
  );
}

const COUNTRY_COLUMNS = [
  "Pays",
  "Vérifiées",
  "Inscrites",
  "Comptes",
  "Comptes actifs",
  "Contestations en cours",
  "Clôtures avec écart",
];

function Countries({ countries }: { countries: PlatformStats["countries"] }) {
  return (
    <TabsContent value={"countries" satisfies FigureTab} className={PANEL}>
      {countries.length === 0 ? (
        <p className="text-[15px] text-muted-ink">Aucune quincaillerie inscrite pour le moment.</p>
      ) : (
        <Table className="min-w-[48rem] text-[15px]">
          <TableHeader>
            <TableRow>
              {COUNTRY_COLUMNS.map((column, index) => (
                <TableHead key={column} className={index > 0 ? "text-right" : undefined}>
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {countries.map((country) => (
              <TableRow key={country.countryCode}>
                <TableCell className="py-3 font-semibold">
                  {country.name} <span className="font-normal text-muted-ink">({country.countryCode})</span>
                </TableCell>
                <TableCell className="text-right">{n(country.stores.byStatus.VERIFIED)}</TableCell>
                <TableCell className="text-right">{n(country.stores.registered)}</TableCell>
                <TableCell className="text-right">{n(country.accounts.total)}</TableCell>
                <TableCell className="text-right">{n(country.accounts.active)}</TableCell>
                <TableCell className="text-right">{n(country.trust.disputesUnresolved)}</TableCell>
                <TableCell className="text-right">{n(country.trust.closingsWithDiscrepancy)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </TabsContent>
  );
}

function FiguresSkeleton() {
  return (
    <div role="status" aria-label="Chargement des statistiques" className="flex flex-col gap-5">
      <Skeleton className="h-5 w-72 rounded-control" />
      <Skeleton className="h-36 rounded-card" />
      <Skeleton className="h-64 rounded-card" />
      <Skeleton className="h-48 rounded-card" />
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div role="status" aria-label="Chargement des statistiques" className="flex flex-col gap-5">
      <Skeleton className="h-11 w-full max-w-sm rounded-full" />
      <Skeleton className="h-36 rounded-card" />
      <Skeleton className="h-64 rounded-card" />
    </div>
  );
}
