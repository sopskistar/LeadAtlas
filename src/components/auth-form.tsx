"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import { authClient } from "./account";
import { Brand } from "./navigation";
import { ThemeSwitcher } from "./theme";
import { PasswordField } from "./password-field";
import { Button, ErrorNotice, useResource } from "./ui";

type Mode = "signin" | "signup" | "forgot" | "reset";
export function AuthForm({
  initialMode = "signin",
  token,
  invalid,
}: {
  initialMode?: Mode;
  token?: string;
  invalid?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const { data, error: statusError } = useResource<{
    auth: boolean;
    registration: boolean;
    recovery: boolean;
  }>("/api/status");
  const fresh = mode === "signup" || mode === "reset";
  const available =
    mode === "signup"
      ? data?.registration
      : mode === "forgot"
        ? data?.recovery
        : data?.auth;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (fresh && password !== form.get("confirmPassword")) {
      setError("Your passwords don’t match. Please enter them again.");
      return;
    }
    if (fresh && (password.length < 12 || password.length > 128)) {
      setError("Use a password between 12 and 128 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "forgot") {
        const result = await authClient.requestPasswordReset({
          email: String(form.get("email")),
          redirectTo: "/reset-password",
        });
        if (result.error)
          throw new Error(
            result.error.status === 429
              ? "Too many requests. Please wait a minute and try again."
              : "Password recovery is temporarily unavailable. Please try again later.",
          );
        setMessage(
          "If this address matches an account, check your inbox for a reset link. For your privacy, we don’t confirm accounts or email delivery here. If no link arrives, try again later.",
        );
      } else if (mode === "reset") {
        const result = await authClient.resetPassword({
          newPassword: password,
          token,
        });
        if (result.error)
          throw new Error(
            "This reset link is invalid or has expired. Request a new link.",
          );
        window.history.replaceState(null, "", "/reset-password");
        setMessage(
          "Your password has been updated. Sign in with your new password.",
        );
      } else {
        const result =
          mode === "signup"
            ? await authClient.signUp.email({
                name: String(form.get("name")),
                email: String(form.get("email")),
                password,
                callbackURL: "/dashboard",
              })
            : await authClient.signIn.email({
                email: String(form.get("email")),
                password,
                callbackURL: "/dashboard",
              });
        if (result.error)
          throw new Error(
            result.error.code === "EMAIL_NOT_VERIFIED"
              ? "Check your inbox for an email verification link before signing in. You can request another link below."
              : "We couldn’t complete that request. Check your details and try again.",
          );
        if (
          mode === "signup" &&
          result.data &&
          !("token" in result.data && result.data.token)
        )
          setMessage(
            "Check your inbox to verify your email before signing in. If no link arrives, you can request another verification link below.",
          );
        else router.push("/dashboard");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again later.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main-content" className="auth-page">
      <div className="auth-topbar">
        <Brand />
        <ThemeSwitcher />
      </div>
      <div className="auth-layout">
        <aside className="auth-intro">
          <div className="eyebrow">Your next opportunity</div>
          <h2>
            Better research.
            <br />
            <span>More meaningful connections.</span>
          </h2>
          <p>
            Find your focus, understand the evidence, and build a shortlist with
            confidence.
          </p>
          <div className="auth-promise">
            <ShieldCheck size={23} />
            <span>
              Quality leads.
              <br />
              Clearer opportunities.
            </span>
          </div>
          <Link className="text-link" href="/tour">
            Explore the sample tour <ArrowRight size={17} />
          </Link>
        </aside>
        <div className="card auth-card stack">
          <div>
            <div className="eyebrow">
              {mode === "forgot" || mode === "reset"
                ? "Account recovery"
                : "Welcome to LeadAtlas"}
            </div>
            <h1>
              {mode === "signup"
                ? "Create your workspace"
                : mode === "forgot"
                  ? "Forgot your password?"
                  : mode === "reset"
                    ? "Choose a new password"
                    : "Welcome back"}
            </h1>
            <p>
              {mode === "forgot"
                ? "Enter your email to request a secure reset link."
                : mode === "reset"
                  ? "Use a unique password to protect your research."
                  : "Your research and saved leads, all in one place."}
            </p>
          </div>
          <ErrorNotice message={error} />
          {(statusError || (data && !available)) && (
            <div className="notice" role="status">
              {mode === "forgot"
                ? "Password recovery"
                : mode === "signup"
                  ? "Registration"
                  : "Account services"}{" "}
              is temporarily unavailable. Please try again later.{" "}
              <Link className="link" href="/tour">
                Explore the sample tour
              </Link>{" "}
              in the meantime.
            </div>
          )}
          {mode === "reset" && (!token || invalid) && !message ? (
            <div className="notice error" role="alert">
              This reset link is invalid or has expired.{" "}
              <Link className="link" href="/forgot-password">
                Request a new link
              </Link>
              .
            </div>
          ) : message ? (
            <div className="notice success" role="status">
              {message}
            </div>
          ) : (
            <form onSubmit={submit} aria-busy={busy}>
              {mode === "signup" && (
                <label>
                  Your name
                  <input
                    name="name"
                    required
                    maxLength={100}
                    autoComplete="name"
                  />
                </label>
              )}
              {mode !== "reset" && (
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </label>
              )}
              {mode !== "forgot" && <PasswordField key={mode} fresh={fresh} />}
              {fresh && (
                <PasswordField
                  name="confirmPassword"
                  label="Confirm password"
                  fresh
                />
              )}
              {mode === "signin" && (
                <Link className="link forgot-link" href="/forgot-password">
                  Forgot password?
                </Link>
              )}
              <Button type="submit" disabled={busy || !available}>
                {busy
                  ? "Please wait…"
                  : mode === "signup"
                    ? "Create account"
                    : mode === "forgot"
                      ? "Request reset link"
                      : mode === "reset"
                        ? "Update password"
                        : "Sign in"}
                <ArrowRight size={16} />
              </Button>
            </form>
          )}
          {(mode === "signup" || mode === "signin") && (
            <>
              <Button
                variant="text"
                disabled={busy}
                onClick={() => {
                  setMode(mode === "signup" ? "signin" : "signup");
                  setError("");
                  setMessage("");
                }}
              >
                {mode === "signup"
                  ? "Already have an account? Sign in"
                  : "New to LeadAtlas? Create account"}
              </Button>
              <details className="auth-resend">
                <summary>Need another verification link?</summary>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setError("");
                    try {
                      const result = await authClient.sendVerificationEmail({
                        email: String(
                          new FormData(e.currentTarget).get(
                            "verificationEmail",
                          ),
                        ),
                        callbackURL: "/dashboard",
                      });
                      if (result.error) throw new Error();
                      setMessage(
                        "If an eligible account matches, check your inbox for a verification link. If no link arrives, try again later.",
                      );
                    } catch {
                      setError(
                        "Verification is temporarily unavailable. Please try again later.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <label>
                    Account email
                    <input
                      name="verificationEmail"
                      required
                      type="email"
                      autoComplete="email"
                    />
                  </label>
                  <Button
                    variant="secondary"
                    disabled={busy || !data?.recovery}
                  >
                    Request verification link
                  </Button>
                </form>
              </details>
            </>
          )}
          {(mode === "forgot" || mode === "reset") && (
            <Link className="text-link" href="/sign-in">
              <ArrowLeft size={15} />
              Back to sign in
            </Link>
          )}
          <p className="small auth-legal">
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
      </div>
      <Link className="auth-home" href="/">
        ← Back to LeadAtlas
      </Link>
    </main>
  );
}
