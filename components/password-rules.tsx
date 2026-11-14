"use client";

import { Check, X } from "lucide-react";
import { type Control, type FieldValues, type Path, useWatch } from "react-hook-form";
import { PASSWORD_RULES } from "@/lib/api/password";
import { cn } from "@/lib/utils";

/**
 * The password rules as a live checklist under a new-password field: each rule
 * turns green as soon as the typed value meets it.
 */
export function PasswordRules<T extends FieldValues>({
  control,
  name,
  id,
}: {
  control: Control<T>;
  name: Path<T>;
  id: string;
}) {
  const value = (useWatch({ control, name }) as string | undefined) ?? "";
  return (
    <ul id={id} aria-label="Règles du mot de passe" className="flex flex-col gap-1 text-[13px]">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        const Icon = met ? Check : X;
        return (
          <li
            key={rule.id}
            className={cn("flex items-center gap-2", met ? "text-success" : "text-muted-ink")}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span>
              {rule.label}
              <span className="sr-only">{met ? " : respecté" : " : manquant"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
