import { z } from "zod";

export const NETWORK_ERROR_MESSAGE =
  "Impossible de joindre le serveur. Vérifiez votre connexion.";
export const UNEXPECTED_ERROR_MESSAGE = "Une erreur inattendue est survenue.";
export const UNAVAILABLE_ERROR_MESSAGE =
  "Le serveur ne répond pas. Réessayez dans un instant.";

/** Body of every non-2xx API response. */
export const apiErrorBodySchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string(),
  details: z
    .array(z.object({ field: z.string(), errors: z.array(z.string()) }))
    .optional(),
});

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;
export type FieldErrorDetail = NonNullable<ApiErrorBody["details"]>[number];

/** An API failure; `message` is French and safe to show to the admin. */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly error: string;
  readonly details: FieldErrorDetail[];

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.statusCode = body.statusCode;
    this.error = body.error;
    this.details = body.details ?? [];
  }

  /** statusCode 0 means the request never reached the API. */
  static network(): ApiError {
    return new ApiError({
      statusCode: 0,
      error: "NETWORK",
      message: NETWORK_ERROR_MESSAGE,
    });
  }

  /**
   * A 5xx without the API's error body: the API always sends that body, so the
   * answer came from the proxy in front of it (API stopped or unreachable).
   */
  static unavailable(statusCode: number): ApiError {
    return new ApiError({
      statusCode,
      error: "UNAVAILABLE",
      message: UNAVAILABLE_ERROR_MESSAGE,
    });
  }

  static unexpected(statusCode: number): ApiError {
    return new ApiError({
      statusCode,
      error: "UNKNOWN",
      message: UNEXPECTED_ERROR_MESSAGE,
    });
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

export function isClientError(value: unknown): boolean {
  return isApiError(value) && value.statusCode >= 400 && value.statusCode < 500;
}

/** The role may not do this: shown as the 403 view, not as a toast. */
export function isForbidden(value: unknown): boolean {
  return isApiError(value) && value.statusCode === 403;
}
