"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button, ErrorNotice, api, useResource } from "./ui";
import type { PublishedTestimonial } from "@/lib/core/engagement";
export function UpdatesSignup() {
  const { data: status, error: statusError } = useResource<{
    available: boolean;
  }>("/api/updates");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      const response = await api<{ message: string }>("/api/updates", {
        method: "POST",
        body: JSON.stringify({
          email: String(data.get("email") ?? "").trim(),
          consent: data.get("consent") === "on",
          website: data.get("website"),
        }),
      });
      setMessage(response.message);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Subscription request failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="updates-section"
      id="updates"
      aria-labelledby="updates-heading"
    >
      <div>
        <h2 id="updates-heading">Follow LeadAtlas as we build.</h2>
        <p>Product updates and launch announcements.</p>
      </div>
      <form
        onSubmit={submit}
        className="stack"
        aria-busy={busy}
        aria-label="Product updates subscription"
      >
        <label>
          Email address
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            maxLength={254}
          />
        </label>
        <div className="subscription-trap" aria-hidden="true">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <label className="check">
          <input name="consent" type="checkbox" required />
          <span>
            I agree to receive LeadAtlas product updates and launch
            announcements. I can unsubscribe at any time.
          </span>
        </label>
        <ErrorNotice message={error} />
        {message && (
          <p className="notice success" role="status">
            {message}
          </p>
        )}
        {((status && !status.available) || statusError) && (
          <p className="small muted" role="status">
            Updates signup is temporarily unavailable. Please check back later.
          </p>
        )}
        <div className="row">
          <Button type="submit" disabled={busy || !status?.available}>
            {busy ? "Recording request…" : "Subscribe to updates"}
          </Button>
          <Link href="/privacy" className="small link">
            Privacy
          </Link>
        </div>
      </form>
    </section>
  );
}
export function CustomerTestimonials() {
  const { data } = useResource<{ reviews: PublishedTestimonial[] }>(
    "/api/testimonials",
  );
  if (!data?.reviews.length) return null;
  return (
    <section
      className="testimonial-section"
      aria-labelledby="testimonials-heading"
    >
      <h2 id="testimonials-heading">From LeadAtlas customers.</h2>
      <div className="testimonial-list">
        {data.reviews.slice(0, 5).map((review) => (
          <figure key={review.id}>
            <blockquote>
              <p>{review.text}</p>
            </blockquote>
            <figcaption>
              {review.photoPath && (
                <Image src={review.photoPath} width={48} height={48} alt="" />
              )}
              <span>
                <strong>{review.displayName}</strong>
                <span>{review.roleOrBusiness}</span>
                <time dateTime={review.publishedAt}>
                  {new Date(review.publishedAt).toLocaleDateString()}
                </time>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
export function SubscriptionAction({
  mode,
  token,
}: {
  mode: "confirm" | "unsubscribe";
  token: string;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  return (
    <div className="stack">
      <h1>
        {mode === "confirm"
          ? "Confirm product updates"
          : "Unsubscribe from updates"}
      </h1>
      {message ? (
        <p className="notice success" role="status">
          {message}
        </p>
      ) : (
        <form
          className="stack"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              const response = await api<{ message: string }>(
                `/api/updates/${mode}`,
                { method: "POST", body: JSON.stringify({ token }) },
              );
              setMessage(response.message);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Action failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            {mode === "confirm"
              ? "Receive LeadAtlas product updates and launch announcements. You can unsubscribe at any time."
              : "Stop receiving LeadAtlas product updates and launch announcements."}
          </p>
          <ErrorNotice message={error} />
          {!token && (
            <p role="alert">
              This link is invalid. Open the complete link from your email.
            </p>
          )}
          <Button type="submit" disabled={busy || !token}>
            {busy
              ? "Saving…"
              : mode === "confirm"
                ? "Confirm subscription"
                : "Unsubscribe"}
          </Button>
        </form>
      )}
      <Link className="link" href="/">
        Return to LeadAtlas
      </Link>
    </div>
  );
}
