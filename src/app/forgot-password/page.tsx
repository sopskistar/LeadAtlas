import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Forgot password" };
export default function ForgotPassword() {
  return <AuthForm initialMode="forgot" />;
}
