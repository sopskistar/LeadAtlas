import { AuthForm } from "@/components/auth-form";
export const metadata = {
  title: "Sign in",
  description: "Sign in to your private LeadAtlas research workspace.",
  robots: { index: false, follow: false },
};
export default function SignIn() {
  return <AuthForm />;
}
