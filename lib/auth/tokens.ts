import { createHmac, randomBytes } from "crypto";

import { env } from "@/lib/env";

export function generateToken() {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string) {
  return createHmac("sha256", env.SESSION_SECRET).update(token).digest("hex");
}
