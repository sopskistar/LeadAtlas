import { AuthForm } from "@/components/auth-form";
export const metadata = {
  title: "Create account",
  description: "Create a private LeadAtlas account for evidence-led business research.",
  robots: { index: false, follow: false },
};
export default function SignUp() {
  return <AuthForm initialMode="signup" />;
}
