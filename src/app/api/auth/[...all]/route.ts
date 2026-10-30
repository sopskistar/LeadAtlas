import { getAuth, authConfigured } from "@/lib/server/auth";
export async function GET(req: Request) {
  if (!authConfigured())
    return Response.json(
      { message: "Authentication setup required" },
      { status: 503 },
    );
  return getAuth().handler(req);
}
export const POST = GET;
