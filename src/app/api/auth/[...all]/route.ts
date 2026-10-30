import { getAuth, authConfigured } from "@/lib/server/auth";
import { emailConfigured } from "@/lib/server/email";
export const maxDuration = 30;
export async function GET(req: Request) {
  const path = new URL(req.url).pathname;
  if (!authConfigured())
    return Response.json(
      {
        message:
          "Account services are temporarily unavailable. Please try again later.",
      },
      { status: 503 },
    );
  if (
    (!emailConfigured() &&
      /\/(request-password-reset|send-verification-email)$/.test(path)) ||
    (process.env.NODE_ENV === "production" &&
      !emailConfigured() &&
      path.endsWith("/sign-up/email"))
  )
    return Response.json(
      {
        message:
          "This account service is temporarily unavailable. Please try again later.",
      },
      { status: 503 },
    );
  try {
    return await getAuth().handler(req);
  } catch {
    return Response.json(
      {
        message:
          "Account services are temporarily unavailable. Please try again later.",
      },
      { status: 503 },
    );
  }
}
export const POST = GET;
