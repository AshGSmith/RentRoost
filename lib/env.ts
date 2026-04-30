import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  APP_URL: z.string().url(),
  SESSION_COOKIE_NAME: z.string().min(1).default("rentroost_session"),
  SESSION_SECRET: z.string().min(32)
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  APP_URL: process.env.APP_URL,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME ?? "rentroost_session",
  SESSION_SECRET: process.env.SESSION_SECRET
});
