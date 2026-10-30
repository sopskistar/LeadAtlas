import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "../db";
import * as schema from "../db/schema";
import { emailConfigured, sendAuthEmail } from "./email";
import { after } from "next/server";
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
      requireEmailVerification:
        process.env.NODE_ENV === "production" && emailConfigured(),
      resetPasswordTokenExpiresIn: 15 * 60,
      revokeSessionsOnPasswordReset: true,
      ...(emailConfigured()
        ? {
            sendResetPassword: async ({
              user,
              token,
            }: {
              user: { email: string };
              token: string;
            }) => {
              const url = new URL(
                "/reset-password",
                process.env.BETTER_AUTH_URL!,
              );
              url.searchParams.set("token", token);
              try {
                await sendAuthEmail(user.email, url.href, "reset");
              } catch {
                console.error(
                  "LeadAtlas password-reset delivery failed; inspect transactional email service.",
                );
              }
            },
          }
        : {}),
    },
    ...(emailConfigured()
      ? {
          emailVerification: {
            sendOnSignUp: process.env.NODE_ENV === "production",
            sendOnSignIn: true,
            autoSignInAfterVerification: true,
            expiresIn: 60 * 60,
            sendVerificationEmail: async ({
              user,
              url,
            }: {
              user: { email: string };
              url: string;
            }) => {
              const link = new URL(url);
              link.searchParams.set(
                "callbackURL",
                new URL("/dashboard", process.env.BETTER_AUTH_URL!).href,
              );
              try {
                await sendAuthEmail(user.email, link.href, "verify");
              } catch {
                console.error(
                  "LeadAtlas email-verification delivery failed; inspect transactional email service.",
                );
              }
            },
          },
        }
      : {}),
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 30,
      storage: "database",
      customRules: {
        "/request-password-reset": { window: 60, max: 3 },
        "/reset-password": { window: 60, max: 5 },
        "/send-verification-email": { window: 60, max: 3 },
      },
    },
    advanced: {
      // Keep mail alive on Vercel without making recovery latency depend on delivery.
      backgroundTasks: { handler: after },
      useSecureCookies: process.env.NODE_ENV === "production",
      disableOriginCheck: false,
      disableCSRFCheck: false,
    },
  });
}
