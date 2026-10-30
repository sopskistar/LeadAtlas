"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="content">
      <div className="card">
        <h1>This page could not load</h1>
        <p>
          Your saved data remains in the database. Check service configuration
          or try again.
        </p>
        <button className="button" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
