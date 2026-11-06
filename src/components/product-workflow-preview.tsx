import Link from "next/link";
import {
  ArrowUpRight,
  BookmarkCheck,
  Check,
  Globe2,
  MailCheck,
} from "lucide-react";

const stages = [
  ["Discover", "Set a niche and choose your sources."],
  ["Research", "Confirm the business and its website."],
  ["Verify", "Review public contacts and supporting evidence."],
  ["Organize", "Save qualified prospects for permitted export."],
] as const;

export function ProductWorkflowPreview() {
  return (
    <section
      className="workflow-section section-anchor"
      id="how-it-works"
      aria-labelledby="workflow-heading"
    >
      <div className="section-intro">
        <h2 id="workflow-heading">From discovery to qualified leads.</h2>
        <p>
          Choose your sources, review the evidence, and keep worthwhile
          prospects.
        </p>
      </div>
      <div className="workflow-layout">
        <ol className="workflow-stages" aria-label="Lead research workflow">
          {stages.map(([title, description], index) => (
            <li key={title}>
              <span className="workflow-stage-number" aria-hidden="true">
                0{index + 1}
              </span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
        <figure className="workflow-preview">
          <div className="workflow-preview-topline">
            <h3>Business discovery</h3>
            <span>Illustrative preview</span>
          </div>
          <div
            className="workflow-query"
            aria-label="Illustrative search criteria"
          >
            <div>
              <span>Business niche</span>
              <strong>Plumbing contractors</strong>
            </div>
            <div>
              <span>Location</span>
              <strong>Austin, Texas</strong>
            </div>
          </div>
          <div className="workflow-sources" aria-label="Example source choices">
            <span>Lead sources</span>
            <span className="workflow-source">
              <Check size={14} aria-hidden="true" /> Overture Places
            </span>
            <span className="workflow-source">
              <Check size={14} aria-hidden="true" /> Authorized directory
            </span>
          </div>
          <div
            className="workflow-record"
            aria-label="Fictional sample business record"
          >
            <div className="workflow-record-heading">
              <span>Business</span>
              <span>Website</span>
              <span>Public contact</span>
            </div>
            <div className="workflow-record-values">
              <strong>
                Cedarline Plumbing <span>Fictional</span>
              </strong>
              <span>
                <Globe2 size={15} aria-hidden="true" /> cedarline.example
              </span>
              <span>
                <MailCheck size={15} aria-hidden="true" />{" "}
                contact@cedarline.example
              </span>
            </div>
          </div>
          <div className="workflow-preview-footer">
            <span>
              <BookmarkCheck size={16} aria-hidden="true" /> Review evidence
              before saving
            </span>
            <Link href="/tour" className="workflow-tour-link">
              Open sample tour <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <figcaption>
            Sample record only. No live search or verification is shown.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
