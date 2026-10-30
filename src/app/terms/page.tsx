import Link from "next/link";
export default function Terms() {
  return (
    <main className="content stack" style={{ maxWidth: 850 }}>
      <Link className="link" href="/">
        ← LeadAtlas
      </Link>
      <article className="card">
        <h1>Responsible business research</h1>
        <p>
          Use LeadAtlas only for lawful business research under the permissions
          attached to each source. Public availability is not blanket permission
          to collect, store, resell or contact. Do not bypass authentication,
          CAPTCHAs, robots restrictions or provider quotas.
        </p>
        <p>
          Qualified contacts meet the application’s evidence policy at export
          time. A third-party deliverability assessment does not guarantee inbox
          delivery, inbox use, employment or business activity. Users remain
          responsible for checking evidence and honoring opt-outs and applicable
          marketing laws.
        </p>
        <p>
          Domain ownership is self-attested. Matching measures a supported
          association with an existing business name or domain, without implying
          purchasing intent, permission to use a trademark or rights over a
          personal identity.
        </p>
        <p>
          Google-restricted content is excluded from persistent lead storage and
          exports. Any permitted Google use is also subject to the{" "}
          <a
            className="link"
            href="https://cloud.google.com/maps-platform/terms"
          >
            Google Maps Platform terms
          </a>{" "}
          and{" "}
          <a className="link" href="https://policies.google.com/privacy">
            Google privacy policy
          </a>
          . Meta integrations require approved access and permitted use cases.
        </p>
        <p>
          The operator must complete commercial terms, privacy contact details,
          provider approvals and production validation before opening paid
          public access.
        </p>
      </article>
    </main>
  );
}
