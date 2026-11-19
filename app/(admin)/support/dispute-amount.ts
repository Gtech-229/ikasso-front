"use client";

import { useQuery } from "@tanstack/react-query";
import { countriesQueryKey, fetchCountries } from "@/lib/api/countries";
import type { Dispute } from "@/lib/api/disputes";
import { can } from "@/lib/auth/permissions";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";
import { formatMinorUnits, formatMoney } from "@/lib/format";

/**
 * Formats a disputed operation's amount, signed by its direction. With
 * countries.read, the country of the currency gives the symbol and decimals;
 * otherwise the integer in the smallest unit with the currency code.
 */
export function useDisputeAmount(): (operation: Dispute["operation"]) => string {
  const admin = useCurrentAdmin().data;
  const countries = useQuery({
    queryKey: countriesQueryKey,
    queryFn: fetchCountries,
    enabled: !!admin && can(admin, "countries.read"),
    // Optional: a failure falls back to the plain format, no toast.
    meta: { inlineError: true },
  }).data;

  return (operation) => {
    const sign = operation.direction === "CREDIT" ? "+" : "−";
    const country = countries?.find((c) => c.currencyCode === operation.currencyCode);
    const amount = country
      ? formatMoney(operation.amount, { symbol: country.currencySymbol, decimals: country.decimals })
      : formatMinorUnits(operation.amount, operation.currencyCode);
    return `${sign}${amount}`;
  };
}
