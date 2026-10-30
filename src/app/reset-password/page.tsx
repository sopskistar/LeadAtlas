import { AuthForm } from "@/components/auth-form";
export const metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function ResetPassword({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const query = await searchParams;
  return (
    <AuthForm
      initialMode="reset"
      token={typeof query.token === "string" ? query.token : undefined}
      invalid={!!query.error}
    />
  );
}
