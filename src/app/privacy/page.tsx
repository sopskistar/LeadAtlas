import { PublicHeader } from "@/components/navigation";
import Link from "next/link";
export default function Privacy() {
  return (
    <>
      <PublicHeader />
      <main
        id="main-content"
        className="content stack"
        style={{ maxWidth: 850 }}
      >
        <Link className="link" href="/">
          ← LeadAtlas
        </Link>
        <article className="card">
          <h1>Privacy & data controls</h1>
          <p>
            LeadAtlas stores account credentials as password hashes, secure
            session records, your research settings, permitted business records,
            public business-contact evidence, verification outcomes and export
            history. Secrets are stored only in server configuration.
          </p>
          <p>
            Research is limited to public business or professional contact
            channels. Do not import private personal data or use LeadAtlas to
            collect private home addresses. A professional name match does not
            confirm employment or identity.
          </p>
          <p>
            Provider processing can involve Neon, Vercel, Inngest, the
            configured worker host, Brave, Hunter and Resend for account emails,
            depending on enabled features. These services have their own terms
            and privacy policies. No provider is considered connected solely
            because its adapter exists.
          </p>
          <p>
            Suppress a wrong contact, bounced mailbox, closure or opt-out in the
            evidence drawer. Account deletion removes associated application
            records. Expired sessions and old verification history are subject
            to the platform’s retention policy, which the operator must publish
            before public launch.
          </p>
          <p>
            Before public launch, the operator must publish its legal identity,
            contact method, retention schedule and regional privacy disclosures.
            This page describes the implemented data handling and is not a
            substitute for operator-specific legal review.
          </p>
        </article>
      </main>
    </>
  );
}
