import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, ShieldCheck, CircleHelp } from "lucide-react";
import { ProductCards } from "@/components/catalog";
export default function Home() {
  return (
    <div className="landing">
      <nav className="landing-nav" aria-label="Main navigation">
        <Link href="/">
          <Image
            className="logo"
            src="/brand/leadatlas-wordmark.png"
            width={210}
            height={74}
            alt="LeadAtlas"
            priority
          />
        </Link>
        <div className="row">
          <Link className="small muted" href="/settings/sources">
            Sources & coverage
          </Link>
          <Link className="button secondary" href="/sign-in">
            Sign in
          </Link>
          <Link className="button" href="/dashboard">
            Open workspace <ArrowRight size={15} />
          </Link>
        </div>
      </nav>
      <main className="landing-main">
        <section className="hero">
          <div>
            <div className="eyebrow">Business discovery, with evidence</div>
            <h1>
              Find businesses.
              <br />
              <span>Find opportunities.</span>
            </h1>
            <p>
              Start with the right business. Follow the evidence to the right
              contact. Bring a clear standard of quality to your next prospect
              list.
            </p>
            <div className="row" style={{ marginTop: 28 }}>
              <Link className="button" href="/business-contacts">
                Find business contacts <ArrowRight size={16} />
              </Link>
              <Link className="button secondary" href="/website-opportunities">
                Find website opportunities
              </Link>
            </div>
            <p className="small" style={{ marginTop: 20 }}>
              United States & Canada · Any niche · Permission-aware sources
            </p>
          </div>
          <div className="hero-aside">
            <div className="row between">
              <span className="eyebrow" style={{ margin: 0 }}>
                Your quality standard
              </span>
              <ShieldCheck size={22} color="#0866ed" />
            </div>
            <h2 style={{ marginTop: 18 }}>A contact is more than an email.</h2>
            <p className="small">
              Every qualified lead needs grounded evidence across five checks.
            </p>
            {[
              "Current business activity",
              "Functioning website or documented absence",
              "Public contact tied to the right business",
              "Fresh third-party email verification",
              "Source rights and suppression checks",
            ].map((s, i) => (
              <div
                className="row"
                style={{
                  padding: "11px 0",
                  borderBottom: i < 4 ? "1px solid #dce7f5" : undefined,
                }}
                key={s}
              >
                <Check size={16} color="#0866ed" />
                <span style={{ fontSize: 13 }}>{s}</span>
              </div>
            ))}
            <div className="card">
              <div className="row">
                <CircleHelp size={17} />
                <strong className="small">Uncertain stays uncertain</strong>
              </div>
              <p className="small" style={{ margin: "8px 0 0" }}>
                A live site doesn’t establish business activity. A vendor-valid
                email doesn’t guarantee delivery. Review the evidence before you
                act.
              </p>
            </div>
          </div>
        </section>
        <section className="product-section">
          <div className="eyebrow">Four focused tools</div>
          <h2>Choose the question you’re trying to answer.</h2>
          <p style={{ marginBottom: 26 }}>
            Separate workflows. One evidence-based approach to business
            research.
          </p>
          <ProductCards />
        </section>
      </main>
      <footer className="footer">
        <span>LeadAtlas · Find Businesses. Find Opportunities.</span>
        <div className="row">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/settings/sources">Data sources</Link>
        </div>
      </footer>
    </div>
  );
}
