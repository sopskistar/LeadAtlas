import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "../db";
import * as schema from "../db/schema";
let instance: ReturnType<typeof createAuth> | undefined;
export function authConfigured() {
  return (
    !!process.env.DATABASE_URL &&
    (process.env.BETTER_AUTH_SECRET?.length ?? 0) >= 32 &&
    !!process.env.BETTER_AUTH_URL
  );
}
export function getAuth() {
  if (!authConfigured())
    throw new Error(
      "Authentication requires DATABASE_URL, BETTER_AUTH_URL and a secret of at least 32 characters.",
    );
  instance ??= createAuth();
  return instance;
}
function createAuth() {
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    baseURL: process.env.BETTER_AUTH_URL!,
    trustedOrigins: [process.env.BETTER_AUTH_URL!],
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        rateLimit: schema.rateLimit,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, window: 60, max: 30, storage: "database" },
    advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
  });
}
