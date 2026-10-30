import { handleApi } from "@/lib/server/api";
export const runtime = "nodejs";
export async function GET(
  req: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return handleApi(req, (await context.params).path);
}
export const POST = GET;
