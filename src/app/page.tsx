import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  Globe2,
  Activity,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import { products } from "@/components/catalog";
import { Brand, PublicHeader } from "@/components/navigation";

export default function Home() {
  return (
    <div className="landing">
      <PublicHeader />
      <main id="main-content" className="landing-main">
        <section className="hero">
          <div className="opening-layout">
            <h1>
              Find businesses
              <br /> worth contacting.
            </h1>
            <div className="hero-description">
              <p>
                Research businesses, check contact quality, and build a focused
                prospect list.
              </p>
              <div className="row hero-actions">
                <Link className="button" href="/dashboard">
                  Explore LeadAtlas
                </Link>
                <a className="text-link" href="#how-it-works">
                  See how it works
                </a>
              </div>
            </div>
          </div>
        </section>
        <section
          id="features"
          className="discovery-grid section-anchor"
          aria-label="Business discovery"
        >
          {products.map((product, index) => (
            <Link
              className="discovery-link"
              href={product.path}
              key={product.id}
            >
              <div>
                <h2>{product.title}</h2>
                <p>
                  {
                    [
                      "Find active businesses with functioning websites and reliable public contact information.",
                      "Discover active businesses without an identified website and find their public business contacts.",
                      "Find businesses using related names or domain variations that may be upgrade prospects for your domain.",
                      "Discover newly registered businesses and research their public presence and contacts.",
                    ][index]
                  }
                </p>
              </div>
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
          ))}
        </section>
        <section className="quality-section">
          <div>
            <h2>A contact needs evidence.</h2>
            <p>
              Review why a business and its contact qualify before they reach
              your export.
            </p>
            <Link href="/tour" className="text-link">
              Review the sample research
            </Link>
          </div>
          <div className="quality-proof">
            {[
              [
                Activity,
                "Current activity",
                "A listing alone does not establish an operating business.",
              ],
              [
                Globe2,
                "Website identity",
                "An empty website field never proves there is no website.",
              ],
              [
                MailCheck,
                "Contact verification",
                "Unknown, stale and catch-all contacts stay out of qualified exports.",
              ],
              [
                ShieldCheck,
                "Source permissions",
                "Rights and suppression are checked again before export.",
              ],
            ].map(([Icon, title, text]) => {
              const I = Icon as typeof Activity;
              return (
                <div key={String(title)}>
                  <I size={20} aria-hidden="true" />
                  <div>
                    <h3>{String(title)}</h3>
                    <p>{String(text)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section id="how-it-works" className="workflow-section section-anchor">
          <div className="section-intro">
            <h2>See what you’re checking.</h2>
            <p>Find, inspect, save. Keep the evidence with the contact.</p>
          </div>
          <figure className="product-capture">
            <Image
              src="/images/research-tour.png"
              width={1200}
              height={570}
              alt="LeadAtlas sample tour showing the research workflow. All sample details are fictional."
            />
            <figcaption>
              <span>Illustrative preview</span>
              <span>Fictional business · Sample only</span>
              <Link className="link" href="/tour">
                Open the interactive tour
              </Link>
            </figcaption>
          </figure>
        </section>
        <section id="who-its-for" className="audience-section section-anchor">
          <h2>Research for the work you do.</h2>
          <div className="audience-list">
            <Link href="/website-opportunities">
              <h3>Website designers &amp; agencies</h3>
              <p>
                Research businesses that could benefit from an independent
                website.
              </p>
            </Link>
            <Link href="/domain-buyer-finder">
              <h3>Domain investors</h3>
              <p>Find close existing-domain and professional-name matches.</p>
            </Link>
            <Link href="/business-contacts">
              <h3>Sales &amp; marketing teams</h3>
              <p>Keep a focused list of relevant, sourced business contacts.</p>
            </Link>
          </div>
        </section>
        <section className="faq-section">
          <h2>Before your first search.</h2>
          <div className="faq-list">
            {[
              [
                "What’s the difference between the first two finders?",
                "Businesses With Websites looks for businesses with a functioning independent website and verified public business emails. Businesses Without Websites researches businesses with no identifiable independent website and a public business contact. A blank website field alone never proves there is no website.",
              ],
              [
                "What does a qualified lead mean?",
                "A qualified lead passes the current checks for business activity, website status, contact association, recent email verification, source permissions and suppression. You can inspect the supporting evidence. Verification does not guarantee delivery, a response or a sale.",
              ],
              [
                "Where can I search?",
                "Business searches cover the United States and Canada, with results dependent on regional sources. Domain Buyer Finder researches related domains worldwide. Newly registered business coverage varies by jurisdiction.",
              ],
              [
                "Do I need to configure anything?",
                "No technical setup is needed from customers. LeadAtlas manages its research services. If a service or regional coverage is unavailable, the workspace explains that clearly. You can explore the sample tour without an account.",
              ],
              [
                "Does a domain match mean someone wants to buy?",
                "No. Domain Buyer Finder prioritizes close existing-domain and business-name associations. A match is a research starting point; it does not establish buying intent or rights to a name.",
              ],
              [
                "Can I save and export my leads?",
                "You can save research, organize notes and review contacts. Search exports contain Business Name and Email and include only contacts that pass the latest quality, freshness and suppression checks. Public contact information still requires responsible use and respect for opt-outs.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer className="footer">
        <Brand />
        <div className="row">
          <Link href="/tour">Sample tour</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms &amp; data use</Link>
          <Link href="/sign-up">Get started</Link>
        </div>
        <span>© {new Date().getFullYear()} LeadAtlas</span>
      </footer>
    </div>
  );
}
