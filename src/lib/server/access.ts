import { headers } from "next/headers";
import { getAuth, authConfigured } from "./auth";

export function isAdmin(id: string) {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .includes(id);
}
export async function pageIdentity() {
  if (!authConfigured()) return null;
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}
