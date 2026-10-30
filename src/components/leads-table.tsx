"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { SearchX, X, Copy, Bookmark, SearchCheck } from "lucide-react";
import { api, Badge, Button, ErrorNotice } from "./ui";
import type { BusinessRecord, Product } from "@/lib/core/types";
type ManagedRecord = BusinessRecord & { tags?: string[]; notes?: string };
export function LeadsTable({
  records,
  product = "contacts",
  refresh,
}: {
  records: ManagedRecord[];
  product?: Product;
  refresh?: () => void;
}) {
  const [selected, setSelected] = useState<ManagedRecord | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function action(
    record: BusinessRecord,
    type: string,
    payload: unknown,
  ) {
    setError("");
    try {
      await api(`/api/leads/${record.id}/${type}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setMessage(
        type === "save"
          ? "Lead saved."
          : "Updated. Suppressed contacts are excluded from future exports.",
      );
      refresh?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Copied.");
    } catch {
      setError("Clipboard unavailable. Select and copy the email directly.");
    }
  }
  return (
    <>
      <ErrorNotice message={error} />
      {message && (
        <div className="notice success" role="status">
          {message}
        </div>
      )}
      <div
        className="table-wrap"
        tabIndex={0}
        role="region"
        aria-label="Business contacts table"
      >
        {records.length ? (
          <table>
            <thead>
              <tr>
                <th>Business name</th>
                <th>Public business email</th>
                <th>Qualification</th>
                <th>Evidence</th>
                <th>
                  <span className="sr-only">Save</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                    <div className="muted small">
                      {r.city}, {r.region} · {r.niche}
                    </div>
                    {r.fixture && <Badge value="DEMO FIXTURE" />}
                  </td>
                  <td>
                    {r.contacts[0] ? (
                      <>
                        <span>{r.contacts[0].email}</span>
                        <button
                          className="button text"
                          aria-label={`Copy ${r.contacts[0].email}`}
                          onClick={() => copy(r.contacts[0].email)}
                        >
                          <Copy size={13} />
                        </button>
                        <div>
                          <Badge
                            value={
                              r.contacts[0].verification?.status ?? "UNVERIFIED"
                            }
                          />
                        </div>
                      </>
                    ) : (
                      <span className="muted">No sourced email found</span>
                    )}
                  </td>
                  <td>
                    <Badge
                      value={r.quality?.status ?? "PENDING_VERIFICATION"}
                    />
                  </td>
                  <td>
                    <Button variant="text" onClick={() => setSelected(r)}>
                      <SearchCheck size={14} />
                      Inspect
                    </Button>
                  </td>
                  <td>
                    <Button
                      variant="text"
                      aria-label={`Save ${r.name}`}
                      onClick={() =>
                        action(r, "save", {
                          tags: r.tags ?? [],
                          notes: r.notes ?? "",
                        })
                      }
                    >
                      <Bookmark size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">
            <SearchX size={34} />
            <h3>No results in this view</h3>
            <p className="small">
              Save contacts from a search to build your shortlist, or adjust
              your filters to review more research.
            </p>
          </div>
        )}
      </div>
      {records.length > 0 && (
        <div className="row" style={{ padding: 16 }}>
          <Button
            variant="secondary"
            onClick={() =>
              copy(
                records
                  .flatMap((r) => r.contacts.map((c) => c.email))
                  .join("\n"),
              )
            }
          >
            <Copy size={14} />
            Copy visible emails
          </Button>
          <span className="small muted">
            Research copy includes uncertain contacts. Qualification applies to
            CSV exports.
          </span>
        </div>
      )}
      <Dialog.Root
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="drawer">
            <div className="row between">
              <div className="eyebrow" style={{ margin: 0 }}>
                Evidence inspection
              </div>
              <Dialog.Close asChild>
                <Button variant="text" aria-label="Close evidence">
                  <X size={22} />
                </Button>
              </Dialog.Close>
            </div>
            <Dialog.Title style={{ fontSize: 25, margin: "22px 0 8px" }}>
              {selected?.name}
            </Dialog.Title>
            <Dialog.Description className="small muted">
              Evidence-backed research. Unknown checks remain visible and are
              excluded from qualified exports.
            </Dialog.Description>
            {selected && (
              <>
                <Badge
                  value={selected.quality?.status ?? "PENDING_VERIFICATION"}
                />
                <ul
                  className="small"
                  style={{ paddingLeft: 18, marginTop: 14 }}
                >
                  {selected.quality?.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <dl>
                  <dt>Business activity</dt>
                  <dd>
                    <Badge value={selected.quality?.activity ?? "UNKNOWN"} />
                  </dd>
                  <dt>Website identity & functionality</dt>
                  <dd>
                    <Badge value={selected.website?.status ?? "UNKNOWN"} />
                    <p className="small" style={{ marginTop: 8 }}>
                      {selected.website?.detail ??
                        "No website research completed"}
                    </p>
                    {selected.website?.url && (
                      <a
                        className="link"
                        href={selected.website.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {selected.website.url}
                      </a>
                    )}
                    <div className="small muted">
                      Checked: {selected.website?.checkedAt ?? "Not checked"}
                    </div>
                  </dd>
                  <dt>Contacts & verification</dt>
                  <dd>
                    {selected.contacts.map((c) => (
                      <div className="evidence" key={c.email}>
                        <strong>{c.email}</strong>
                        <div className="row" style={{ margin: "7px 0" }}>
                          <Badge
                            value={c.verification?.status ?? "UNVERIFIED"}
                          />
                          <Badge value={c.binding} />
                        </div>
                        <a href={c.sourceUrl} target="_blank" rel="noreferrer">
                          Public source: {c.sourceUrl}
                        </a>
                        <p className="small" style={{ margin: "8px 0" }}>
                          Found {c.foundAt}
                          <br />
                          {c.verification?.provider ?? "No verifier"} ·{" "}
                          {c.verification?.nativeStatus ?? "not_verified"}
                          <br />
                          Verified {c.verification?.checkedAt ?? "Never"}
                          <br />
                          {c.verification?.detail}
                        </p>
                      </div>
                    ))}
                  </dd>
                  {selected.domainMatch && (
                    <>
                      <dt>Domain association</dt>
                      <dd>
                        <Badge value={selected.domainMatch.tier} />
                        <p className="small">
                          {selected.domainMatch.reasons.join(". ")}
                        </p>
                        {selected.domainMatch.ambiguous && (
                          <div className="notice small">
                            Common-name ambiguity: manual disambiguation
                            required. No identity claim is made.
                          </div>
                        )}
                      </dd>
                    </>
                  )}
                  <dt>Source permissions</dt>
                  <dd>
                    {Object.entries(selected.fieldRights).map(
                      ([field, right]) => (
                        <div className="evidence" key={field}>
                          <strong>{field}</strong> ·{" "}
                          {right.export
                            ? "Export permitted"
                            : "Export restricted"}
                          <p className="small" style={{ margin: "5px 0" }}>
                            {right.license}
                            <br />
                            {right.attribution}
                          </p>
                          <a href={right.url} target="_blank" rel="noreferrer">
                            {right.url}
                          </a>
                        </div>
                      ),
                    )}
                  </dd>
                  <dt>Verification evidence</dt>
                  <dd>
                    {selected.evidence.map((e, i) => (
                      <div className="evidence" key={i}>
                        <Badge value={e.kind} />
                        <p className="small" style={{ margin: "7px 0" }}>
                          {e.detail}
                          <br />
                          {e.observedAt} · {e.source}
                        </p>
                        <a href={e.url} target="_blank" rel="noreferrer">
                          {e.url}
                        </a>
                      </div>
                    ))}
                  </dd>
                </dl>
                <hr className="divider" />
                <LeadManagement
                  record={selected}
                  product={product}
                  action={action}
                  onReviewed={(record) => {
                    setSelected(record);
                    refresh?.();
                  }}
                />
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
function LeadManagement({
  record,
  product,
  action,
  onReviewed,
}: {
  record: ManagedRecord;
  product: Product;
  action: (r: BusinessRecord, t: string, p: unknown) => Promise<void>;
  onReviewed: (r: ManagedRecord) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function review(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const urls = String(form.get("urls"))
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const response = await api<{ record: BusinessRecord }>(
        `/api/leads/${record.id}/review`,
        {
          method: "POST",
          body: JSON.stringify({
            product,
            attested: true,
            evidence: urls.map((url) => ({
              kind: form.get("kind"),
              url,
              observedAt: new Date(String(form.get("observed"))).toISOString(),
              detail: String(form.get("detail")),
            })),
          }),
        },
      );
      onReviewed(response.record);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void action(record, "save", {
            tags: f.getAll("tag"),
            notes: f.get("notes"),
          });
        }}
      >
        <h3>Lead management</h3>
        <div className="row">
          {[
            "website_service",
            "domain_prospect",
            "ai_receptionist_possible",
            "general_lead",
          ].map((tag) => (
            <label className="check small" key={tag}>
              <input
                name="tag"
                type="checkbox"
                value={tag}
                defaultChecked={record.tags?.includes(tag)}
              />
              {tag.replaceAll("_", " ")}
            </label>
          ))}
        </div>
        <label>
          Research notes
          <textarea name="notes" defaultValue={record.notes} maxLength={5000} />
        </label>
        <Button variant="secondary">Save notes & tags</Button>
      </form>
      <form className="stack" onSubmit={review}>
        <h3>Manual evidence review</h3>
        <p className="small" style={{ margin: 0 }}>
          Record what you actually checked. Activity and website absence need
          two independent source origins. Reviews are attributed to your
          account.
        </p>
        <ErrorNotice message={error} />
        <label>
          Finding
          <select name="kind">
            <option value="activity">Current business activity</option>
            <option value="absence">
              No independent website found after research
            </option>
            <option value="closure">Business closure</option>
            <option value="temporary_closure">Temporary closure</option>
          </select>
        </label>
        <label>
          Evidence URLs (one per line)
          <textarea name="urls" required placeholder="https://…" />
        </label>
        <label>
          Evidence date
          <input name="observed" type="datetime-local" required />
        </label>
        <label>
          Observed evidence
          <textarea name="detail" required minLength={20} maxLength={1000} />
        </label>
        <label className="check">
          <input type="checkbox" required />I checked these public sources and
          can support this finding.
        </label>
        <Button disabled={busy}>
          {busy ? "Saving evidence…" : "Record review"}
        </Button>
      </form>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void action(record, "suppress", { reason: f.get("reason") });
        }}
      >
        <label>
          Report & suppress
          <select name="reason">
            <option value="wrong_email">Wrong email</option>
            <option value="wrong_business">Wrong business</option>
            <option value="closed">Business closed</option>
            <option value="bounced">Reported bounce</option>
            <option value="opt_out">Opt out</option>
          </select>
        </label>
        <Button variant="danger">Suppress from export</Button>
      </form>
    </div>
  );
}
