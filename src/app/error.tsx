"use client";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="content">
      <div className="card">
        <ThemeSwitcher />
        <h1>This page could not load</h1>
        <p>Something interrupted this page. Please try again in a moment.</p>
        <button className="button" onClick={reset}>
          Try again
        </button>
        <Link className="button secondary" href="/">
          Return home
        </Link>
      </div>
    </main>
  );
}
