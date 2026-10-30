"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { PublicHeader } from "./navigation";
import { Button } from "./ui";

const steps = [
  {
    title: "Start with a focused question",
    text: "Choose Businesses With Websites for existing website owners, or Businesses Without Websites to research potential website opportunities.",
    action: "Search location and business niche",
    items: [
      "Country: United States",
      "State: Texas",
      "City: Dallas",
      "Business niche: Plumbing",
    ],
  },
  {
    title: "Look at the business behind the contact",
    text: "Review activity and website evidence together. A blank website field is never enough to classify a business as having no website.",
    action: "Review the evidence",
    items: [
      "Check recent business activity",
      "Confirm the independent website",
      "Keep contradictory findings for review",
    ],
  },
  {
    title: "Understand the contact checks",
    text: "Publicly sourced emails must belong to the right business and pass recent verification. Unknown or catch-all results do not qualify for export.",
    action: "Review the public contact",
    items: [
      "Public source: example.com/contact",
      "Fictional email: hello@example.com",
      "Sample only — no verification performed",
    ],
  },
  {
    title: "Save the research worth keeping",
    text: "Organize leads with notes, review uncertain contacts and export only qualified results. Opt-outs and bounced contacts stay excluded.",
    action: "Build your shortlist",
    items: [
      "Save useful research",
      "Add notes and tags",
      "Review qualifications before export",
      "CSV columns: Business Name, Email",
    ],
  },
];
export function Tour() {
  const [step, setStep] = useState(0);
  const current = steps[step];
  return (
    <div className="landing">
      <PublicHeader />
      <main id="main-content" className="landing-main">
        <div className="tour-layout">
          <div>
            <div className="eyebrow">Sample tour · Step {step + 1} of 4</div>
            <h1>{current.title}</h1>
            <p>{current.text}</p>
            <div className="tour-progress" aria-hidden="true">
              {steps.map((_, i) => (
                <span className={i <= step ? "active" : ""} key={i} />
              ))}
            </div>
            <div className="tour-controls">
              <Button
                variant="secondary"
                disabled={step === 0}
                onClick={() => setStep(step - 1)}
              >
                Previous
              </Button>
              {step < 3 ? (
                <Button onClick={() => setStep(step + 1)}>
                  Next step <ArrowRight size={16} />
                </Button>
              ) : (
                <Link className="button" href="/dashboard">
                  Explore workspace <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </div>
          <div className="card" aria-live="polite">
            <span className="badge">SYNTHETIC SAMPLE · NO LIVE LEADS</span>
            <h2 style={{ marginTop: 23 }}>{current.action}</h2>
            {current.items.map((item) => (
              <div className="evidence row" key={item}>
                <Check size={16} />
                <span>{item}</span>
              </div>
            ))}
            <p className="small">
              This is an illustrative walkthrough. Sample details are fictional,
              are never saved as real leads, and cannot be exported.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
