"use client";
import Link from "next/link";
import { useState } from "react";
import { Download } from "lucide-react";
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
        <h1>Overview</h1>
      </div>
      <ErrorNotice message={error} />
      {loading ? (
        <Loading />
      ) : (
        data && (
          <div className="metric-grid">
            {[
              ["Searches", data.searches],
              ["Research candidates", data.candidates],
              ["Saved leads", data.saved],
              ["CSV exports", data.exports],
            ].map(([label, value]) => {
              return (
                <div key={String(label)}>
                  <span className="small muted">{String(label)}</span>
                  <div className="metric">{String(value)}</div>
                </div>
              );
            })}
          </div>
        )
      )}
      <ProductCards headingLevel={2} />
      <div className="onboarding card">
        <div>
          <h2>New to LeadAtlas?</h2>
          <p className="small">
            See how a search becomes a shortlist in the synthetic sample tour.
          </p>
        </div>
        <Link className="button secondary" href="/tour">
          Take the sample tour
        </Link>
      </div>
      {data && (
        <div className="card">
          <h2>Available regional coverage</h2>
          {data.coverage.length ? (
            <div className="coverage">
              {data.coverage.map((c) => (
                <span key={`${c.country}:${c.region}:${c.city}`}>
                  {c.city}, {c.region}, {c.country}: {c.count} records
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
      <div className="page-intro">
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
            <table className="history-table" role="table">
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
                      <Link
                        className="link job-link"
                        href={`/searches/${j.id}`}
                      >
                        {productName(j.input.product)}
                      </Link>
                      <div className="small muted">
                        {j.input.niche}, {j.input.city}, {j.input.region}
                      </div>
                    </td>
                    <td data-label="Status">
                      <Badge value={j.status} />
                    </td>
                    <td data-label="Processed">
                      {j.processed}/{j.discovered}
                    </td>
                    <td data-label="Qualified at run">{j.qualified}</td>
                    <td data-label="Created">
                      {new Date(j.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data && !data.jobs.length && (
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
          <h1>
            {data
              ? `${data.job.input.niche}, ${data.job.input.city}`
              : "Research job"}
          </h1>
          <p>
            {data && productName(data.job.input.product)}
            <br />
            {data?.job.input.region}, {data?.job.input.country}
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
                <span>{data.job.qualified} qualified at run</span>
                <span>{data.job.duplicates} duplicate source results</span>
                {data.breakdown.map((b) => (
                  <span key={b.state ?? "pending"}>
                    {b.count}{" "}
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
                    aria-label="View"
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
      <div className="page-intro">
        <h1>Lead Management & Export</h1>
        <p>
          Inspect sources, edit research tags, record evidence and suppress
          unsuitable contacts.
        </p>
      </div>
      <ErrorNotice message={resource.error} />
      <div className="card table-card">
        <form
          className="table-toolbar saved-lead-filters"
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
        ) : resource.error ? null : (
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
      <div className="page-intro">
        <h1>Exports</h1>
        <p>
          Default CSV contains exactly Business Name and Email. Every export
          rechecks freshness and suppression.
        </p>
      </div>
      <ErrorNotice message={error} />
      <div className="card table-card">
        <div className="table-wrap">
          <table className="export-table" role="table">
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
                  <td data-label="Generated">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td data-label="Exported">{e.count}</td>
                  <td data-label="Skipped">{e.skipped}</td>
                  <td>
                    <Link className="link" href={`/searches/${e.jobId}`}>
                      View search
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && !data.exports.length && (
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
