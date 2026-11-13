import { z } from "zod";

// Server-side configuration. Read by next.config.ts and server code only; never
// import from a client component (API_URL is not exposed to the browser).
const envSchema = z.object({
  API_URL: z
    .url({
      protocol: /^https?$/,
      error: "API_URL doit être une URL http(s) absolue, ex. http://localhost:3001",
    })
    .transform((url) => url.replace(/\/+$/, "")),
});

export type Env = z.infer<typeof envSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse({ API_URL: source.API_URL });
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Configuration invalide :\n${details}`);
  }
  return result.data;
}
