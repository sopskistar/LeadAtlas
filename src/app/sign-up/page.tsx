import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Create account" };
export default function SignUp() {
  return <AuthForm initialMode="signup" />;
}
