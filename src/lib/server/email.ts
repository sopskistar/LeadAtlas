/** Operator-managed transactional email. No recipient, token or key is logged. */
export function emailConfigured() {
  return (
    !!process.env.RESEND_API_KEY &&
    !!process.env.AUTH_EMAIL_FROM &&
    process.env.AUTH_EMAIL_SENDER_VERIFIED === "true"
  );
}
export async function sendAuthEmail(
  to: string,
  url: string,
  kind: "reset" | "verify",
) {
  if (!emailConfigured()) throw new Error("Transactional email unavailable");
  const link = new URL(url);
  const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
  if (
    link.origin !== origin ||
    (process.env.NODE_ENV === "production" && link.protocol !== "https:")
  )
    throw new Error("Invalid authentication email origin");
  const reset = kind === "reset";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.AUTH_EMAIL_FROM,
      to: [to],
      subject: reset
        ? "Reset your LeadAtlas password"
        : "Verify your LeadAtlas email",
      text: `${reset ? "Reset your password" : "Verify your email"} using this link:\n\n${link.href}\n\nThis link expires in ${reset ? "15 minutes" : "one hour"}. If you did not request this, ignore this email.`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new Error("Transactional email provider rejected request");
  const result = await response.json();
  if (typeof result.id !== "string" || !result.id)
    throw new Error("Transactional email provider did not accept request");
}
