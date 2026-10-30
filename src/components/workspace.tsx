"use client";
import Link from "next/link";
import { useState } from "react";
import { Search, Download, Bookmark, History } from "lucide-react";
import { ProductCards, productName } from "./catalog";
import { LeadsTable } from "./leads-table";
import { api, Badge, Button, ErrorNotice, Loading, useResource } from "./ui";
import type { BusinessRecord, SearchInput } from "@/lib/core/types";
type Job = {
  id: string;
  status: string;
  stage: string;
  processed: number;
  discovered: number;
  qualified: number;
  duplicates: number;
  input: SearchInput;
  error?: string;
  createdAt: string;
};
export function Dashboard() {
  const { data, error, loading } = useResource<{
    searches: number;
    candidates: number;
    saved: number;
    exports: number;
    coverage: {
      country: string;
      region: string;
      city: string;
      count: number;
    }[];
  }>("/api/dashboard");
  return (
    <div className="stack">
      <div className="page-intro">
        <div className="eyebrow">Your research workspace</div>
        <h1>Start with the right business.</h1>
        <p>
          Choose a focused finder, inspect the evidence, and save the contacts
          that meet your standard.
        </p>
      </div>
      <ErrorNotice message={error} />
      {loading ? (
        <Loading />
      ) : (
        data && (
          <div className="metric-grid">
            {[
              ["Searches", data.searches, Search],
              ["Research candidates", data.candidates, History],
              ["Saved leads", data.saved, Bookmark],
              ["CSV exports", data.exports, Download],
            ].map(([label, value, Icon]) => {
              const I = Icon as typeof Search;
              return (
                <div className="card" key={String(label)}>
                  <div className="row between">
                    <span className="small muted">{String(label)}</span>
                    <I size={16} />
                  </div>
                  <div className="metric">{String(value)}</div>
                </div>
              );
            })}
          </div>
        )
      )}
      <ProductCards />
      <div className="card onboarding">
        <div>
          <h3>Your first shortlist starts here.</h3>
          <p className="small">
            Choose a finder, enter a location and niche, and review the results.
            New here? Take a quick sample tour to see how research becomes a
            qualified contact.
          </p>
        </div>
        <Link className="button secondary" href="/tour">
          Take the sample tour →
        </Link>
      </div>
      {data && (
        <div className="card">
          <h3>Available regional coverage</h3>
          {data.coverage.length ? (
            <div className="coverage">
              {data.coverage.map((c) => (
                <span key={`${c.country}:${c.region}:${c.city}`}>
                  {c.city}, {c.region}, {c.country} · {c.count} records
                </span>
              ))}
            </div>
          ) : (
            <p className="small">
              Research coverage is not available for this workspace yet. Please
              check back later.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
export function JobList() {
  const [page, setPage] = useState(1);
  const { data, error, loading } = useResource<{ jobs: Job[] }>(
    `/api/jobs?page=${page}`,
    5000,
  );
  return (
    <div className="stack">
      <div>
        <div className="eyebrow">Durable research</div>
        <h1>Search history</h1>
        <p>
          Track saved searches, provider failures and qualification progress.
        </p>
      </div>
      <ErrorNotice message={error} />
      {loading ? (
        <Loading />
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Search</th>
                  <th>Status</th>
                  <th>Processed</th>
                  <th>Qualified at run</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {data?.jobs.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <Link className="link" href={`/searches/${j.id}`}>
                        {productName(j.input.product)} · {j.input.niche}
                        <br />
                        {j.input.city}, {j.input.region}
                      </Link>
                    </td>
                    <td>
                      <Badge value={j.status} />
                    </td>
                    <td>
                      {j.processed}/{j.discovered}
                    </td>
                    <td>{j.qualified}</td>
                    <td>{new Date(j.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.jobs.length && (
              <div className="empty">
                <h3>No searches yet</h3>
                <p>Start a finder to create your first research job.</p>
              </div>
            )}
          </div>
          <Pager
            page={page}
            setPage={setPage}
            next={(data?.jobs.length ?? 0) === 25}
          />
        </div>
      )}
    </div>
  );
}
function Pager({
  page,
  setPage,
  next,
}: {
  page: number;
  setPage: (p: number) => void;
  next: boolean;
}) {
  return (
    <div className="pagination">
      <Button
        variant="secondary"
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </Button>
      <span>Page {page}</span>
      <Button
        variant="secondary"
        disabled={!next}
        onClick={() => setPage(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
export function JobDetail({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const [quality, setQuality] = useState("QUALIFIED");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const resource = useResource<{
    job: Job;
    records: BusinessRecord[];
    events: { stage: string; detail: string; createdAt: string }[];
    breakdown: { state: string; count: number }[];
  }>(`/api/jobs/${id}?page=${page}&quality=${quality}`, 4000);
  const data = resource.data;
  async function action(type: string) {
    setError("");
    setBusy(true);
    try {
      if (type === "export") {
        const response = await fetch(`/api/jobs/${id}/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!response.ok) throw new Error((await response.json()).error);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "leadatlas-qualified.csv";
        a.click();
        URL.revokeObjectURL(url);
        setMessage(
          `Exported ${response.headers.get("X-Exported-Count")} qualified records; skipped ${response.headers.get("X-Skipped-Count")} candidates.`,
        );
      } else {
        await api(`/api/jobs/${id}/${type}`, { method: "POST", body: "{}" });
        resource.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      <div className="row between">
        <div>
          <div className="eyebrow">Search results</div>
          <h1>
            {data
              ? `${data.job.input.niche} · ${data.job.input.city}`
              : "Research job"}
          </h1>
          <p>
            {data && productName(data.job.input.product)} ·{" "}
            {data?.job.input.region} · {data?.job.input.country}
          </p>
        </div>
        <div className="row">
          <Button
            variant="secondary"
            disabled={busy || !data}
            onClick={() => action("export")}
          >
            <Download size={15} />
            {busy ? "Working…" : "Export qualified CSV"}
          </Button>
          {data &&
          ["FAILED", "CANCELLED", "DISPATCH_FAILED"].includes(
            data.job.status,
          ) ? (
            <Button disabled={busy} onClick={() => action("retry")}>
              Resume search
            </Button>
          ) : (
            data &&
            !["COMPLETED", "CANCELLED"].includes(data.job.status) && (
              <Button variant="danger" onClick={() => action("cancel")}>
                Cancel
              </Button>
            )
          )}
        </div>
      </div>
      <ErrorNotice message={resource.error ?? error} />
      {message && (
        <div className="notice success" role="status">
          {message}
        </div>
      )}
      {resource.loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <div className="card">
              <div className="row between">
                <div className="row">
                  <Badge value={data.job.status} />
                  <strong>{data.job.stage}</strong>
                </div>
                <span className="small muted">
                  {data.job.processed} / {data.job.discovered} candidates
                  processed
                </span>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-label="Search progress"
                aria-valuenow={data.job.processed}
                aria-valuemin={0}
                aria-valuemax={data.job.discovered || 1}
              >
                <div
                  style={{
                    width: `${data.job.discovered ? Math.min(100, (data.job.processed / data.job.discovered) * 100) : 0}%`,
                  }}
                />
              </div>
              <div className="row small">
                <span>{data.job.discovered} discovered</span>
                <span>· {data.job.qualified} qualified at run</span>
                <span>· {data.job.duplicates} duplicate source results</span>
                {data.breakdown.map((b) => (
                  <span key={b.state ?? "pending"}>
                    · {b.count}{" "}
                    {(b.state ?? "pending").toLowerCase().replaceAll("_", " ")}
                  </span>
                ))}
              </div>
              <ErrorNotice message={data.job.error} />
            </div>
            <div className="card table-card">
              <div className="table-toolbar">
                <h3 style={{ margin: 0 }}>Business contacts</h3>
                <label className="row">
                  View
                  <select
                    value={quality}
                    onChange={(e) => {
                      setQuality(e.target.value);
                      setPage(1);
                    }}
                    style={{ width: 210 }}
                  >
                    <option value="QUALIFIED">Qualified only</option>
                    <option value="ALL">All research candidates</option>
                    <option value="NEEDS_REVIEW">Needs review</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="PENDING_VERIFICATION">
                      Pending verification
                    </option>
                  </select>
                </label>
              </div>
              <LeadsTable
                records={data.records}
                product={data.job.input.product}
                refresh={resource.refresh}
              />
              <Pager
                page={page}
                setPage={setPage}
                next={data.records.length === 25}
              />
            </div>
            <div className="card">
              <h3>Job activity</h3>
              {data.events.map((e, i) => (
                <div className="evidence" key={i}>
                  <strong className="small">{e.stage}</strong>
                  <p className="small" style={{ margin: 4 }}>
                    {e.detail}
                  </p>
                  <span className="small muted">
                    {new Date(e.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </>
        )
      )}
    </div>
  );
}
export function SavedLeads() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [quality, setQuality] = useState("ALL");
  const resource = useResource<{ records: BusinessRecord[] }>(
    `/api/leads?page=${page}&q=${encodeURIComponent(filter)}&quality=${quality}`,
  );
  return (
    <div className="stack">
      <div>
        <div className="eyebrow">Your shortlist</div>
        <h1>Lead Management & Export</h1>
        <p>
          Inspect sources, edit research tags, record evidence and suppress
          unsuitable contacts.
        </p>
      </div>
      <ErrorNotice message={resource.error} />
      <div className="card table-card">
        <form
          className="table-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            setFilter(q);
            setPage(1);
          }}
        >
          <label>
            <span className="sr-only">Search businesses</span>
            <input
              placeholder="Search business names"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <Button variant="secondary">Search</Button>
          <label>
            <span className="sr-only">Qualification</span>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
            >
              <option value="ALL">All saved leads</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="NEEDS_REVIEW">Needs review</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>
        </form>
        {resource.loading ? (
          <Loading />
        ) : (
          <LeadsTable
            records={resource.data?.records ?? []}
            refresh={resource.refresh}
          />
        )}
        <Pager
          page={page}
          setPage={setPage}
          next={(resource.data?.records.length ?? 0) === 25}
        />
      </div>
    </div>
  );
}
export function ExportHistory() {
  const { data, error } = useResource<{
    exports: {
      id: string;
      jobId: string;
      count: number;
      skipped: number;
      createdAt: string;
    }[];
  }>("/api/exports");
  return (
    <div className="stack">
      <div>
        <div className="eyebrow">Auditable downloads</div>
        <h1>Exports</h1>
        <p>
          Default CSV contains exactly Business Name and Email. Every export
          rechecks freshness and suppression.
        </p>
      </div>
      <ErrorNotice message={error} />
      <div className="card table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Generated</th>
                <th>Exported</th>
                <th>Skipped</th>
                <th>Source search</th>
              </tr>
            </thead>
            <tbody>
              {data?.exports.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.createdAt).toLocaleString()}</td>
                  <td>{e.count}</td>
                  <td>{e.skipped}</td>
                  <td>
                    <Link className="link" href={`/searches/${e.jobId}`}>
                      View search
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.exports.length && (
            <div className="empty">
              <h3>No exports yet</h3>
              <p>Download qualified contacts from a completed research job.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
