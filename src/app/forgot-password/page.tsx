import { AuthForm } from "@/components/auth-form";
export const metadata = {
  title: "Forgot password",
  description: "Request a secure password recovery link for your LeadAtlas account.",
  robots: { index: false, follow: false },
};
export default function ForgotPassword() {
  return <AuthForm initialMode="forgot" />;
}
