import Link from "next/link";
import { PublicHeader } from "@/components/navigation";
export default function NotFound() {
  return (
    <div className="landing">
      <PublicHeader />
      <main id="main-content" className="content">
        <div className="card empty">
          <div className="eyebrow">Page not found</div>
          <h1>Let’s find a better starting point.</h1>
          <p>
            This page may have moved, or it may not be available to your
            account.
          </p>
          <Link className="button" href="/dashboard">
            Explore your workspace
          </Link>
        </div>
      </main>
    </div>
  );
}
