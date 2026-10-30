"use client";
import { useEffect, useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}
const buttonVariants = cva("button", {
  variants: {
    variant: {
      default: "",
      secondary: "secondary",
      danger: "danger",
      text: "text",
    },
  },
  defaultVariants: { variant: "default" },
});
export function Button({
  className,
  variant,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>) {
  return (
    <button className={cn(buttonVariants({ variant }), className)} {...props} />
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "badge",
        /QUALIFIED|LIKELY_DELIVERABLE|LIKELY_ACTIVE|OWNED_SITE_FOUND|COMPLETED/.test(
          value,
        )
          ? "good"
          : /REJECTED|INVALID|CLOSED|FAILED/.test(value)
            ? "bad"
            : /RESTRICTED|REVIEW|UNKNOWN|UNVERIFIED|CATCH_ALL/.test(value)
              ? "warn"
              : "",
      )}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
export async function api<T = Record<string, unknown>>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error ?? data.message ?? "Request failed");
  return data;
}
export function useResource<T>(path: string, interval = 0) {
  const [state, setState] = useState<{
    data?: T;
    error?: string;
    loading: boolean;
  }>({ loading: true });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const data = await api<T>(path, { signal: controller.signal });
        if (active) setState({ data, loading: false });
      } catch (e) {
        if (active)
          setState((s) => ({
            ...s,
            loading: false,
            error: e instanceof Error ? e.message : "Request failed",
          }));
      }
    };
    void load();
    const timer = interval ? setInterval(load, interval) : undefined;
    return () => {
      active = false;
      controller.abort();
      if (timer) clearInterval(timer);
    };
  }, [path, interval, version]);
  return { ...state, refresh: () => setVersion((v) => v + 1) };
}
export function ErrorNotice({ message }: { message?: string }) {
  return message ? (
    <div className="notice error" role="alert">
      {message}
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="card" role="status" aria-label="Loading">
      <div className="skeleton" />
      <div className="skeleton" style={{ width: "65%" }} />
      <span className="small muted">Loading your workspace…</span>
    </div>
  );
}
