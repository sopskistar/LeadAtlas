import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  Globe2,
  MailCheck,
  Check,
  Activity,
  Bookmark,
  Layers,
  ScanSearch,
  Building2,
  ChevronRight,
} from "lucide-react";
import { ProductCards } from "@/components/catalog";
import { Brand, PublicHeader } from "@/components/navigation";

export default function Home() {
  return (
    <div className="landing">
      <PublicHeader />
      <main id="main-content" className="landing-main">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="status-dot" /> Quality over quantity
            </div>
            <h1>
              Better Leads.
              <br />
              <span>Better Opportunities.</span>
            </h1>
            <p>
              Discover relevant businesses, find verified contact information,
              and connect with prospects that matter. Spend less time chasing
              outdated emails and more time finding real opportunities.
            </p>
            <div className="row hero-actions">
              <Link className="button" href="/dashboard">
                Explore LeadAtlas <ArrowRight size={17} />
              </Link>
              <a className="button secondary" href="#how-it-works">
                See how it works <ChevronRight size={17} />
              </a>
            </div>
            <div className="hero-footnote">
              <span>Built for thoughtful prospecting</span>
              <span>United States & Canada</span>
            </div>
          </div>
          <ProductPreview />
        </section>
        <section id="features" className="product-section section-anchor">
          <div className="section-intro">
            <div>
              <div className="eyebrow">Five main features</div>
              <h2>A clearer path to your next opportunity.</h2>
            </div>
            <p>
              Find the businesses that fit your goals.
              <br />
              Keep the research that earns its place.
            </p>
          </div>
          <ProductCards />
        </section>
        <section id="how-it-works" className="workflow-section section-anchor">
          <div className="eyebrow">From search to shortlist</div>
          <h2>Good research. A simple workflow.</h2>
          <div className="workflow-grid">
            {[
              [
                Search,
                "01",
                "Find your focus",
                "Choose a finder, location and business niche. Start with a question that matters to your work.",
              ],
              [
                ScanSearch,
                "02",
                "Check the evidence",
                "Review the business, website and publicly sourced contact details together.",
              ],
              [
                MailCheck,
                "03",
                "Review your results",
                "See which contacts qualify and which need a closer look before you reach out.",
              ],
              [
                Bookmark,
                "04",
                "Build your shortlist",
                "Save useful leads, add notes, and export contacts that meet the quality checks.",
              ],
            ].map(([Icon, num, title, text]) => {
              const I = Icon as typeof Search;
              return (
                <div className="workflow-step" key={String(num)}>
                  <div className="row between">
                    <I size={23} />
                    <span>{String(num)}</span>
                  </div>
                  <h3>{String(title)}</h3>
                  <p>{String(text)}</p>
                </div>
              );
            })}
          </div>
        </section>
        <section className="quality-section">
          <div>
            <div className="eyebrow">
              A smaller list. A stronger starting point.
            </div>
            <h2>
              Make every contact
              <br />
              worth a closer look.
            </h2>
            <p>
              A bigger spreadsheet isn’t always a better prospect list.
              LeadAtlas brings business relevance, contact sources and
              verification details into one place, so you can make a better
              informed decision.
            </p>
            <Link href="/tour" className="text-link">
              Walk through the research process <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="quality-points">
            {[
              [
                Activity,
                "Look beyond a listing",
                "Research current activity rather than treating a directory entry as proof.",
              ],
              [
                Globe2,
                "Understand the website opportunity",
                "Distinguish a functioning website from a business with no independently identified site.",
              ],
              [
                MailCheck,
                "Know why a contact qualifies",
                "Review contact origins and recent checks. Stale or uncertain contacts stay out of qualified exports.",
              ],
            ].map(([Icon, title, text]) => {
              const I = Icon as typeof Search;
              return (
                <div className="quality-point" key={String(title)}>
                  <div className="tool-icon">
                    <I size={23} />
                  </div>
                  <div>
                    <h3>{String(title)}</h3>
                    <p>{String(text)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section id="who-its-for" className="audience-section section-anchor">
          <div className="eyebrow">Built around your work</div>
          <h2>Different goals. The same quality standard.</h2>
          <div className="audience-grid">
            {[
              [
                Layers,
                "Website designers & agencies",
                "Find businesses without an identified website and review whether a new site could be a relevant conversation.",
                "/website-opportunities",
              ],
              [
                ScanSearch,
                "Domain investors",
                "Find close business-name and existing-domain matches for brandable, personal-name and exact-match domains.",
                "/domain-buyer-finder",
              ],
              [
                Building2,
                "Sales & marketing teams",
                "Research relevant businesses with websites, build a focused contact list, and spend less time sorting outdated details.",
                "/business-contacts",
              ],
            ].map(([Icon, title, text, href]) => {
              const I = Icon as typeof Search;
              return (
                <Link
                  className="card audience-card"
                  href={String(href)}
                  key={String(title)}
                >
                  <I size={25} />
                  <h3>{String(title)}</h3>
                  <p>{String(text)}</p>
                  <span className="text-link">
                    Find your starting point <ArrowUpRight size={16} />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
        <section className="faq-section">
          <div>
            <div className="eyebrow">A few things to know</div>
            <h2>
              Clear answers.
              <br />
              Better decisions.
            </h2>
            <p>Useful context before your first search.</p>
          </div>
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
                "Search by country, state or province, city and niche in the United States and Canada. Available results depend on current regional coverage. Recently registered business coverage is limited and varies by jurisdiction.",
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
        <section className="final-cta">
          <div>
            <div className="eyebrow">
              Your next opportunity starts with better research
            </div>
            <h2>Give your prospect list a clearer direction.</h2>
            <p>Quality leads. Clearer opportunities.</p>
          </div>
          <Link className="button" href="/sign-up">
            Get started <ArrowRight size={17} />
          </Link>
        </section>
      </main>
      <footer className="footer">
        <div>
          <Brand />
          <p>Quality leads. Clearer opportunities.</p>
        </div>
        <div className="row">
          <Link href="/tour">Sample tour</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms & data use</Link>
        </div>
        <span className="copyright">
          © {new Date().getFullYear()} LeadAtlas
        </span>
      </footer>
    </div>
  );
}
function ProductPreview() {
  return (
    <div
      className="product-preview"
      aria-label="Illustrative product preview; no live business results"
    >
      <div className="preview-topbar">
        <span className="preview-brand">
          <Layers size={17} /> Your research workspace
        </span>
        <span className="preview-label">Illustrative preview</span>
      </div>
      <div className="preview-body">
        <div className="row between">
          <span className="eyebrow">A focused search</span>
          <Search size={18} />
        </div>
        <h2>The right fit comes first.</h2>
        <div className="preview-query">
          <Globe2 size={19} />
          <div>
            <strong>Businesses With Websites</strong>
            <span>Plumbing · Dallas, Texas</span>
          </div>
        </div>
        <div className="preview-flow">
          <span>Discover</span>
          <ChevronRight size={14} />
          <span>Research</span>
          <ChevronRight size={14} />
          <strong>Review</strong>
        </div>
        <div className="preview-result">
          <div className="row between">
            <div className="row">
              <div className="preview-monogram">EX</div>
              <div>
                <strong>Example Plumbing Co.</strong>
                <span className="small muted">
                  Fictional business · Sample only
                </span>
              </div>
            </div>
            <Bookmark size={17} />
          </div>
          <div className="preview-checks">
            {[
              [Activity, "Business activity", "Review recent evidence"],
              [Globe2, "Independent website", "Check business association"],
              [
                MailCheck,
                "Public business email",
                "Review contact & verification",
              ],
            ].map(([Icon, title, text]) => {
              const I = Icon as typeof Search;
              return (
                <div key={String(title)}>
                  <I size={17} />
                  <span>
                    <strong>{String(title)}</strong>
                    <small>{String(text)}</small>
                  </span>
                  <Check className="preview-check-icon" size={15} />
                </div>
              );
            })}
          </div>
          <div className="preview-bottom">
            <span className="sample-status">
              A clear reason for every result
            </span>
            <ArrowRight size={16} />
          </div>
        </div>
        <p className="preview-caption">
          A look at the workflow. No live leads or verification results are
          shown.
        </p>
      </div>
    </div>
  );
}
