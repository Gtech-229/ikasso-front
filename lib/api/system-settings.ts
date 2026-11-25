import { z } from "zod";
import { apiFetch } from "./client";

const count = z.number().int().nonnegative();

/** `GET /admin/settings` (`settings.read`): the values in force, or the defaults until a first save. */
export const systemSettingsSchema = z.object({
  maxLoginAttempts: count,
  maxAdminSessions: count,
  maxPinAttempts: count,
  deliveryAlertDays: count,
  cancellationEscalationHours: count,
  inactivityReminderDays: count,
  maxCodesPerHour: count,
  maxCodesPerDay: count,
});
export type SystemSettings = z.infer<typeof systemSettingsSchema>;
export type SystemSettingKey = keyof SystemSettings;

export const systemSettingsQueryKey = ["system-settings"] as const;

export const SYSTEM_SETTINGS_PATH = "/admin/settings";

export function fetchSystemSettings(): Promise<SystemSettings> {
  return apiFetch(SYSTEM_SETTINGS_PATH, { schema: systemSettingsSchema });
}

/** `PATCH /admin/settings` (`settings.manage`): only the sent values change; they apply from the next login. */
export function updateSystemSettings(changes: Partial<SystemSettings>): Promise<SystemSettings> {
  return apiFetch(SYSTEM_SETTINGS_PATH, { method: "PATCH", body: changes, schema: systemSettingsSchema });
}
