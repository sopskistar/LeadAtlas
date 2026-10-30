"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/components/account";
import { Button, ErrorNotice, useResource } from "@/components/ui";
export default function SignIn() {
  const router = useRouter();
  const [signup, setSignup] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { data } = useResource<{ auth: boolean }>("/api/status");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const result = signup
        ? await authClient.signUp.email({
            name: String(f.get("name")),
            email: String(f.get("email")),
            password: String(f.get("password")),
          })
        : await authClient.signIn.email({
            email: String(f.get("email")),
            password: String(f.get("password")),
          });
      if (result.error)
        throw new Error(result.error.message ?? "Authentication failed");
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <div className="card auth-card stack">
        <Link href="/">
          <Image
            className="logo"
            src="/brand/leadatlas-wordmark.png"
            width={220}
            height={78}
            alt="LeadAtlas"
            priority
          />
        </Link>
        <div>
          <h1 style={{ fontSize: 27 }}>
            {signup ? "Create your workspace" : "Welcome back"}
          </h1>
          <p className="small">
            Your research, source evidence and saved leads in one place.
          </p>
        </div>
        <ErrorNotice message={error} />
        {data && !data.auth && (
          <div className="notice small">
            Authentication setup is required. Configure Neon and Better Auth
            before creating an account.
          </div>
        )}
        <form onSubmit={submit}>
          {signup && (
            <label>
              Your name
              <input name="name" required maxLength={100} autoComplete="name" />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              maxLength={254}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete={signup ? "new-password" : "current-password"}
            />
            <span className="small muted">At least 12 characters.</span>
          </label>
          <Button disabled={busy || !data?.auth}>
            {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
          </Button>
        </form>
        <Button
          variant="text"
          onClick={() => {
            setSignup(!signup);
            setError("");
          }}
        >
          {signup
            ? "Already have an account? Sign in"
            : "New to LeadAtlas? Create account"}
        </Button>
        <p className="small" style={{ margin: 0 }}>
          By using LeadAtlas you agree to our{" "}
          <Link className="link" href="/terms">
            terms
          </Link>{" "}
          and{" "}
          <Link className="link" href="/privacy">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
