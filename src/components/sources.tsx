"use client";
import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Cable, Upload, ShieldCheck } from "lucide-react";
import type { SourceInfo } from "@/lib/core/types";
import { api, Badge, Button, ErrorNotice, useResource } from "./ui";
export function Sources() {
  const { data: status, error: statusError } = useResource<{
    auth: boolean;
    orchestration: boolean;
    verifier: boolean;
    email: boolean;
    sources: SourceInfo[];
  }>("/api/admin/status");
  const { data: session } = useResource<{
    user?: { id: string };
    isAdmin: boolean;
  }>("/api/session");
  const { data: settings } = useResource<{
    configs: {
      source: string;
      enabled: boolean;
      policy: { approvedHosts: string[] };
    }[];
    usage: { day: string; units: number }[];
  }>("/api/sources");
  return (
    <div className="stack">
      <div className="page-intro">
        <div className="eyebrow">Provenance & permissions</div>
        <h1>Data sources & operations</h1>
        <p>
          Connection status reflects configuration, permissions and implemented
          capabilities. Configured integrations remain untested until a real
          authorized call succeeds.
        </p>
      </div>
      <ErrorNotice message={statusError} />
      <div className="card">
        <div className="row between">
          <h3 style={{ margin: 0 }}>Workspace readiness</h3>
          <Cable size={20} color="#0866ed" />
        </div>
        <div className="row" style={{ marginTop: 15 }}>
          <Badge
            value={status?.auth ? "AUTH CONFIGURED" : "AUTH SETUP REQUIRED"}
          />
          <Badge
            value={
              status?.orchestration
                ? "JOBS CONFIGURED UNTESTED"
                : "INNGEST & WORKER REQUIRED"
            }
          />
          <Badge
            value={
              status?.verifier
                ? "HUNTER CONFIGURED UNTESTED"
                : "HUNTER KEY MISSING"
            }
          />
        </div>
        <p className="small">
          Transactional auth email:{" "}
          {status?.email
            ? "configured; live delivery must be verified"
            : "missing RESEND_API_KEY / AUTH_EMAIL_FROM / verified sender approval"}
        </p>
        <p className="small" style={{ marginTop: 15 }}>
          Secrets belong in server environment variables. Use the repository’s
          .env.example, migrations and deployment guide.{" "}
          {session?.isAdmin
            ? "Your account can approve dataset and host permissions."
            : "A designated administrator manages source rights and imports."}
        </p>
        {settings?.usage.map((u) => (
          <span className="badge" key={u.day}>
            {u.day} · {u.units} reserved work units
          </span>
        ))}
      </div>
      <div className="source-list">
        {status?.sources.map((s, i) => (
          <section className="card source-card" key={s.id}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                {i < 5 ? `Priority channel ${i + 1}` : "Supporting integration"}
              </div>
              <h3 style={{ margin: 0 }}>{s.displayName}</h3>
            </div>
            <Badge value={s.availability} />
            <div className="details">
              <p>
                <strong>Permission policy:</strong> {s.licensePolicy}
              </p>
              <p>{s.limitations}</p>
              <div className="row small">
                <span>
                  Export fields: {s.permittedExportFields.join(", ") || "None"}
                </span>
                <span>· Batch limit: {s.batchLimit}</span>
              </div>
              <p className="small">{s.rawRetention}</p>
              <a
                className="link row small"
                href={s.docs}
                target="_blank"
                rel="noreferrer"
              >
                Provider documentation <ExternalLink size={12} />
              </a>
            </div>
          </section>
        ))}
      </div>
      {session?.isAdmin ? (
        <>
          <ImportForm />
          <WebsitePermissions />
          <RestrictedTest />
        </>
      ) : (
        <div className="notice">
          <ShieldCheck
            size={17}
            style={{ display: "inline", marginRight: 8 }}
          />
          Import and host-permission controls appear for accounts in
          ADMIN_USER_IDS.{" "}
          {session?.user ? (
            <>
              Your account ID: <code>{session.user.id}</code>
            </>
          ) : (
            <Link className="link" href="/sign-in">
              Create or sign in to an account.
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
function ImportForm() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const file = f.get("file") as File;
    try {
      if (file.size > 2_000_000)
        throw new Error("File exceeds 2 MB; split into bounded batches");
      const response = await api<{
        count: number;
        duplicates: number;
        duplicateBatch: boolean;
      }>("/api/imports", {
        method: "POST",
        body: JSON.stringify({
          source: f.get("source"),
          sourceUrl: f.get("sourceUrl"),
          license: f.get("license"),
          attribution: f.get("attribution"),
          permissionConfirmed: true,
          format: file.name.endsWith(".jsonl") ? "jsonl" : "csv",
          content: await file.text(),
          targetEmail: f.get("targetEmail") || undefined,
        }),
      });
      setMessage(
        response.duplicateBatch
          ? "This exact batch was already imported."
          : `Imported ${response.count} records; ${response.duplicates} matched existing businesses.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="card stack" onSubmit={submit}>
      <div className="row">
        <Upload size={20} />
        <h2 style={{ margin: 0 }}>Import permitted business records</h2>
      </div>
      <p className="small">
        Use the normalized CSV/JSONL contract in docs/IMPORTS.md. Each email
        needs a public source URL. Imported addresses always start unverified.
        Overture records need record_license. Canada rows need official
        incorporation dates.
      </p>
      <ErrorNotice message={error} />
      {message && (
        <div className="notice success" role="status">
          {message}
        </div>
      )}
      <div className="formgrid">
        <label className="full">
          Customer workspace email (optional)
          <input
            type="email"
            name="targetEmail"
            placeholder="Leave empty for your own workspace"
          />
          <span className="small muted">
            Provision licensed records for an existing customer. Records and
            qualification remain isolated to that account.
          </span>
        </label>
        <label>
          Source
          <select name="source">
            <option value="overture">Overture Places regional extract</option>
            <option value="imports">
              Authorized directory / chamber / state filing
            </option>
            <option value="canada">Corporations Canada official dataset</option>
          </select>
        </label>
        <label>
          Dataset source URL
          <input required type="url" name="sourceUrl" placeholder="https://…" />
        </label>
        <label>
          License / permission reference
          <input
            required
            minLength={3}
            name="license"
            placeholder="CDLA-Permissive-2.0 or agreement reference"
          />
        </label>
        <label>
          Required attribution
          <input
            required
            minLength={3}
            name="attribution"
            placeholder="Dataset author, release and license"
          />
        </label>
        <label className="full">
          Regional file (up to 500 rows / 2 MB)
          <input required type="file" name="file" accept=".csv,.jsonl" />
        </label>
        <label className="check full">
          <input required type="checkbox" />
          <span>
            I have reviewed the source terms and confirm permission to persist
            and export these business fields. This batch excludes private
            personal data and restricted Google/Meta-derived content.
          </span>
        </label>
      </div>
      <Button disabled={busy}>{busy ? "Importing…" : "Import records"}</Button>
    </form>
  );
}
function WebsitePermissions() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await api("/api/sources/website", {
        method: "POST",
        body: JSON.stringify({
          enabled: f.get("enabled") === "on",
          approvedHosts: String(f.get("hosts"))
            .split(/[\s,]+/)
            .map((h) => h.trim().toLowerCase())
            .filter(Boolean),
          license: f.get("license"),
          attribution: f.get("attribution"),
          permissionConfirmed: true,
          targetEmail: f.get("targetEmail") || undefined,
        }),
      });
      setMessage("Host policy saved. Robots will be checked at crawl time.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }
  return (
    <form className="card stack" onSubmit={submit}>
      <h2>Website research permissions</h2>
      <p className="small">
        Review each site’s applicable terms before authorizing it. List exact
        hosts, including www where needed. An authorization does not override
        robots, login walls or rate limits.
      </p>
      <ErrorNotice message={error} />
      {message && <div className="notice success">{message}</div>}
      <label>
        Customer workspace email (optional)
        <input
          type="email"
          name="targetEmail"
          placeholder="Leave empty for your own workspace"
        />
      </label>
      <label>
        Approved hosts
        <textarea
          name="hosts"
          placeholder="business.example.org&#10;www.business.example.org"
        />
      </label>
      <div className="formgrid">
        <label>
          Permission / terms review reference
          <input name="license" required minLength={3} />
        </label>
        <label>
          Attribution
          <input name="attribution" required minLength={3} />
        </label>
      </div>
      <label className="check">
        <input name="enabled" type="checkbox" />
        Enable bounded worker research on approved hosts
      </label>
      <label className="check">
        <input type="checkbox" required />I reviewed host terms and confirm the
        configured contact reuse permissions.
      </label>
      <Button>Save website permissions</Button>
    </form>
  );
}
function RestrictedTest() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    const f = new FormData(e.currentTarget);
    try {
      const result = await api("/api/sources/test", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(f)),
      });
      setMessage(JSON.stringify(result));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test failed");
    }
  }
  return (
    <form className="card stack" onSubmit={submit}>
      <h2>Approved restricted API access test</h2>
      <p className="small">
        For approved applications only. A successful response does not authorize
        lead storage or exports. Google requests place IDs only. Meta content is
        discarded. Provider requests use the specified job’s remaining budget.
      </p>
      <ErrorNotice message={error} />
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      <div className="formgrid">
        <label>
          Provider
          <select name="source">
            <option value="facebook">Facebook known Page ID</option>
            <option value="instagram">
              Instagram known professional username
            </option>
            <option value="google">Google Places text lookup (IDs only)</option>
          </select>
        </label>
        <label>
          Identifier / query
          <input name="identifier" required maxLength={200} />
        </label>
        <label className="full">
          Existing owned search job ID
          <input name="jobId" required />
        </label>
      </div>
      <Button variant="secondary">Test configured access</Button>
    </form>
  );
}
