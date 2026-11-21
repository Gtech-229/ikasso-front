import { z } from "zod";
import { apiFetch } from "./client";

/** The API's template name (`modele-quincailleries.<format>`). */
export const IMPORT_TEMPLATE_FILE_NAME = "modele-quincailleries";
export type ImportFormat = "csv" | "xlsx";

const count = z.number().int().nonnegative();

export const storeImportRowSchema = z.object({
  /** File line number; the header is line 1. */
  row: z.number().int(),
  /**
   * valid: correct (dry run); created: store created; invalid: failed the
   * checks; rejected: correct but refused at creation.
   */
  status: z.enum(["valid", "created", "invalid", "rejected"]),
  storeId: z.string().optional(),
  /** `field` is the file's column name, empty when the whole row is refused. */
  errors: z.array(z.object({ field: z.string(), message: z.string() })),
});

export const storeImportResultSchema = z.object({
  total: count,
  /** 0 in a dry run. */
  created: count,
  /** Rows not created: invalid + rejected. */
  rejected: count,
  rows: z.array(storeImportRowSchema),
});

export type StoreImportRow = z.infer<typeof storeImportRowSchema>;
export type StoreImportResult = z.infer<typeof storeImportResultSchema>;

/** The empty template (header row only), guard `stores.manage`. */
export function fetchImportTemplate(format: ImportFormat): Promise<Blob> {
  return apiFetch<Blob>(`/admin/stores/import/template?format=${format}`, { as: "blob" });
}

/**
 * Sends the file to the API, which parses and checks every row. `dryRun` true
 * creates nothing; false creates each valid row on its own (PENDING).
 */
export function importStores(file: File, dryRun: boolean): Promise<StoreImportResult> {
  const body = new FormData();
  body.append("file", file);
  return apiFetch(`/admin/stores/import?dryRun=${dryRun}`, {
    method: "POST",
    body,
    schema: storeImportResultSchema,
  });
}
