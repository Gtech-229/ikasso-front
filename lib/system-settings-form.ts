import { z } from "zod";
import type { SystemSettingKey, SystemSettings } from "@/lib/api/system-settings";

type Range = { min: number; max: number };

export type SettingField = {
  key: SystemSettingKey;
  label: string;
  hint: string;
  /** Allowed values (the API's SYSTEM_SETTINGS_LIMITS). */
  range: Range;
  /** 0 is also accepted (PIN: no limit). */
  zeroAllowed?: boolean;
  /** The API's message for an out-of-range value. */
  message: string;
};

export type SettingSection = { title: string; fields: SettingField[] };

const formatRange = ({ min, max }: Range) =>
  `${min.toLocaleString("fr-FR")} à ${max.toLocaleString("fr-FR")}`;

// The API's limits and messages (system-settings.service.ts, system-settings.dto.ts).
export const SETTING_SECTIONS: SettingSection[] = [
  {
    title: "Administrateurs",
    fields: [
      {
        key: "maxLoginAttempts",
        label: "Tentatives de connexion avant blocage",
        hint: "Échecs consécutifs avant que le compte soit bloqué 15 minutes.",
        range: { min: 3, max: 20 },
        message: "Le nombre de tentatives doit être un entier entre 3 et 20",
      },
      {
        key: "maxAdminSessions",
        label: "Sessions ouvertes en même temps par administrateur",
        hint: "Au-delà, les sessions les plus anciennes sont fermées.",
        range: { min: 1, max: 20 },
        message: "Le nombre de sessions doit être un entier entre 1 et 20",
      },
    ],
  },
  {
    title: "Application mobile",
    fields: [
      {
        key: "maxPinAttempts",
        label: "Codes PIN erronés avant blocage",
        hint: "Avant que l’utilisateur soit bloqué 15 minutes ; 0 = sans limite.",
        range: { min: 3, max: 10 },
        zeroAllowed: true,
        message: "Le nombre de tentatives de PIN doit être 0 (sans limite) ou un entier entre 3 et 10",
      },
      {
        key: "maxCodesPerHour",
        label: "Codes de connexion envoyés par heure",
        hint: "Pour toute la plateforme, en plus des limites par numéro ; au-delà, aucun code n’est envoyé et une alerte est créée.",
        range: { min: 1, max: 10_000 },
        message: "Le nombre de codes de connexion par heure doit être un entier entre 1 et 10000",
      },
      {
        key: "maxCodesPerDay",
        label: "Codes de connexion envoyés par 24 heures",
        hint: "Pour toute la plateforme, en plus des limites par numéro ; au-delà, aucun code n’est envoyé et une alerte est créée.",
        range: { min: 1, max: 100_000 },
        message: "Le nombre de codes de connexion par jour doit être un entier entre 1 et 100000",
      },
    ],
  },
  {
    title: "Quincailleries et clients",
    fields: [
      {
        key: "deliveryAlertDays",
        label: "Jours avant l’alerte d’un bon payé non livré",
        hint: "Après la confirmation du paiement, les gérants sont alertés une fois.",
        range: { min: 1, max: 365 },
        message: "Le délai d’alerte de livraison doit être un nombre entier de jours entre 1 et 365",
      },
      {
        key: "cancellationEscalationHours",
        label: "Heures pour répondre à une demande d’annulation",
        hint: "Laissées au gérant pour livrer ou annuler ; au-delà, une alerte est créée pour les administrateurs.",
        range: { min: 1, max: 720 },
        message:
          "Le délai de réponse à une demande d’annulation doit être un nombre entier d’heures entre 1 et 720",
      },
      {
        key: "inactivityReminderDays",
        label: "Jours sans dépôt avant le rappel au client",
        hint: "Un rappel par période sans dépôt.",
        range: { min: 1, max: 365 },
        message: "Le délai de rappel d’inactivité doit être un nombre entier de jours entre 1 et 365",
      },
    ],
  },
];

/** The allowed values in words, for the hint. */
export function rangeText(field: SettingField): string {
  return field.zeroAllowed ? `0 ou ${formatRange(field.range)}` : formatRange(field.range);
}

function fieldSchema(field: SettingField) {
  return z
    .string()
    .trim()
    .refine((text) => {
      if (!/^\d+$/.test(text)) return false;
      const value = Number(text);
      return (field.zeroAllowed && value === 0) || (value >= field.range.min && value <= field.range.max);
    }, field.message);
}

/** One tab's text values (inputs), keyed by setting; `sectionChanges` turns them into numbers. */
export type SectionFormValues = Partial<Record<SystemSettingKey, string>>;

/** The rules of one tab's fields only: each tab is its own form. */
export function sectionFormSchema(section: SettingSection) {
  return z.object(Object.fromEntries(section.fields.map((field) => [field.key, fieldSchema(field)])));
}

export function sectionFormValues(section: SettingSection, settings: SystemSettings): SectionFormValues {
  return Object.fromEntries(section.fields.map((field) => [field.key, String(settings[field.key])]));
}

/**
 * The tab's values that differ from the saved ones, as integers (never null,
 * never unchanged, never another tab's).
 */
export function sectionChanges(
  section: SettingSection,
  saved: SystemSettings,
  values: SectionFormValues,
): Partial<SystemSettings> {
  const changes: Partial<SystemSettings> = {};
  for (const { key } of section.fields) {
    const next = Number((values[key] ?? "").trim());
    if (next !== saved[key]) changes[key] = next;
  }
  return changes;
}
