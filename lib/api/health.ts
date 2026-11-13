import { z } from "zod";

export const healthSchema = z.object({
  status: z.literal("ok"),
  database: z.literal("up"),
  timestamp: z.string(),
});

export type Health = z.infer<typeof healthSchema>;

export const healthQueryKey = ["health"] as const;
