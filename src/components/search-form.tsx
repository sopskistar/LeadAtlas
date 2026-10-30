"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Info } from "lucide-react";
import { regions, stateRegistryCoverage } from "@/lib/core/locations";
import type { Product } from "@/lib/core/types";
import { Button, ErrorNotice, api, useResource } from "./ui";
import { products } from "./catalog";
export function SearchForm({ product }: { product: Product }) {
  const item = products.find((p) => p.id === product)!;
  const router = useRouter();
  const [country, setCountry] = useState<"US" | "CA">(
    product === "new" ? "CA" : "US",
  );
  const [region, setRegion] = useState(product === "new" ? "ON" : "NY");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const { data: status } = useResource<{
    auth: boolean;
    orchestration: boolean;
    verifier: boolean;
  }>("/api/status");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  useEffect(() => {
    if (!city.trim()) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void api<{ cities: string[] }>(
        `/api/cities?country=${country}&region=${region}&q=${encodeURIComponent(city)}`,
        { signal: controller.signal },
      )
        .then((d) => setSuggestions(d.cities))
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [country, region, city]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      const result = await api<{ jobId: string }>("/api/jobs", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          product,
          country,
          region,
          city: city.trim(),
          niche: String(data.get("niche") ?? "*"),
          sources: data.getAll("source"),
          limit: Number(data.get("limit")),
          queryBudget: Number(data.get("budget")),
          ...(product === "domains"
            ? {
                domain: portfolio.length ? undefined : data.get("domain"),
                domains: portfolio.length ? portfolio : undefined,
                domainKind: data.get("domainKind"),
                ownershipAffirmed: data.get("ownership") === "on",
                professionalContext: data.get("context"),
              }
            : {}),
          ...(product === "new"
            ? { since: data.get("since"), until: data.get("until") }
            : {}),
        }),
      });
      router.push(`/searches/${result.jobId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-intro">
        <div className="eyebrow">
          {product === "domains"
            ? "Targeted identity research"
            : product === "new"
              ? "Registry discovery"
              : "Local business discovery"}
        </div>
        <h1>{item.title}</h1>
        <p>{item.desc}</p>
      </div>
      <div className="tool-layout">
        <div className="stack">
          {status && (!status.auth || !status.orchestration) && (
            <div className="notice">
              <strong>Workspace setup required.</strong> Configure Neon,
              authentication, Inngest and the enrichment worker to start real
              searches. Review{" "}
              <Link className="link" href="/settings/sources">
                source setup and coverage
              </Link>
              .
            </div>
          )}
          <form className="card stack" onSubmit={submit}>
            <div>
              <h2 style={{ marginBottom: 5 }}>Define your search</h2>
              <p className="small" style={{ margin: 0 }}>
                Use a small batch first. Every candidate goes through the
                qualification pipeline.
              </p>
            </div>
            <ErrorNotice message={error} />
            <div className="formgrid">
              {product === "domains" && (
                <>
                  <label className="full">
                    Your domain
                    <input
                      name="domain"
                      placeholder="oceanwise.com"
                      required={!portfolio.length}
                      maxLength={253}
                    />
                  </label>
                  <label>
                    Matching strategy
                    <select name="domainKind">
                      <option value="brandable">Brandable name</option>
                      <option value="exact">Exact-match brand/domain</option>
                      <option value="personal">
                        Public professional full name
                      </option>
                    </select>
                  </label>
                  <label>
                    Professional context (required for names)
                    <input
                      name="context"
                      placeholder="Practice, profession, city or company"
                    />
                  </label>
                  <label className="full">
                    Or upload a portfolio (one Domain column, up to 25)
                    <input
                      type="file"
                      accept=".csv"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10000) {
                            setError("Portfolio exceeds 10 KB");
                            return;
                          }
                          const rows = (await file.text())
                            .trim()
                            .split(/\r?\n/)
                            .map((v) => v.trim().replace(/^"|"$/g, ""))
                            .filter((v) => v.toLowerCase() !== "domain");
                          setPortfolio(rows.slice(0, 25));
                        }
                      }}
                    />
                    {portfolio.length > 0 && (
                      <span className="small muted">
                        {portfolio.length} domains loaded
                      </span>
                    )}
                  </label>
                  <label className="check full">
                    <input type="checkbox" name="ownership" required />
                    <span>
                      I own or am authorized to research these domains. This is
                      self-attestation; matching does not establish buying
                      intent or rights to another person’s identity.
                    </span>
                  </label>
                </>
              )}
              <label>
                Country
                <select
                  aria-label="Country"
                  name="country"
                  value={country}
                  onChange={(e) => {
                    const c = e.target.value as "US" | "CA";
                    setCountry(c);
                    setRegion(c === "US" ? "NY" : "ON");
                  }}
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                </select>
              </label>
              <label>
                {country === "US" ? "State" : "Province / territory"}
                <select
                  aria-label={
                    country === "US" ? "State" : "Province / territory"
                  }
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  {Object.entries(regions[country]).map(([code, name]) => (
                    <option value={code} key={code}>
                      {String(name)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                City
                <input
                  aria-label="City"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={
                    country === "US" ? "e.g. New York" : "e.g. Toronto"
                  }
                  list="cities"
                  maxLength={100}
                  autoComplete="address-level2"
                />
                <datalist id="cities">
                  {suggestions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
              <label>
                {product === "domains"
                  ? "Niche (optional context)"
                  : "Business niche"}
                <input
                  name="niche"
                  placeholder="Plumber, salon, electrician…"
                  required
                  defaultValue={
                    product === "domains" || product === "new" ? "*" : undefined
                  }
                  maxLength={100}
                />
              </label>
              {product === "new" && (
                <>
                  <label>
                    Incorporated from
                    <input required name="since" type="date" />
                  </label>
                  <label>
                    Incorporated through
                    <input required name="until" type="date" />
                  </label>
                </>
              )}
              <fieldset
                className="full"
                style={{ border: 0, padding: 0, margin: 0 }}
              >
                <legend
                  style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}
                >
                  Permitted discovery sources
                </legend>
                <div className="row">
                  {[
                    ...["overture", "imports"],
                    ...(product === "new" ? ["canada"] : []),
                  ].map((s) => (
                    <label className="check" key={s}>
                      <input
                        name="source"
                        type="checkbox"
                        value={s}
                        defaultChecked
                      />
                      {s === "overture"
                        ? "Overture imports"
                        : s === "imports"
                          ? "Authorized CSV / directory"
                          : "Canada federal imports"}
                    </label>
                  ))}
                </div>
                <p className="small" style={{ margin: "10px 0 0" }}>
                  Facebook, Instagram and Google have separate access
                  restrictions. They do not supply exportable lead records in
                  this search.
                </p>
              </fieldset>
              <label>
                Maximum candidates
                <input
                  name="limit"
                  type="number"
                  min={1}
                  max={50}
                  defaultValue={10}
                  required
                />
              </label>
              <label>
                Provider request budget
                <input
                  name="budget"
                  type="number"
                  min={0}
                  max={200}
                  defaultValue={20}
                  required
                />
              </label>
            </div>
            <div className="notice small">
              <ShieldCheck
                size={16}
                style={{
                  display: "inline",
                  verticalAlign: "middle",
                  marginRight: 7,
                }}
              />
              Qualified exports require fresh, associated, vendor-verified
              emails and reusable source fields.{" "}
              {status && !status.verifier
                ? "Hunter is not configured; results will remain unverified."
                : "Verification outcomes depend on actual provider responses."}
            </div>
            <div className="row between">
              <span className="small muted">
                Imported regional coverage is required.
              </span>
              <Button
                type="submit"
                disabled={busy || !status?.auth || !status?.orchestration}
              >
                {busy ? "Starting search…" : "Start search"}
                <ArrowRight size={15} />
              </Button>
            </div>
          </form>
          {product === "new" && (
            <section className="card">
              <h3>Source coverage</h3>
              <p className="small">
                Canada: federal records from approved dataset imports. US:
                state-specific imports only; live filing feeds are not
                connected.
              </p>
              <div className="coverage">
                {stateRegistryCoverage.map((s) => (
                  <span title={`${s.name}: ${s.status}`} key={s.code}>
                    {s.code} · not connected
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside className="card">
          <h3>How qualification works</h3>
          <ol className="step-list" style={{ marginTop: 22 }}>
            {[
              [
                "Discover",
                "Use permitted records matching your location and niche.",
              ],
              [
                "Check the business",
                "Corroborate current activity; keep contradictions for review.",
              ],
              [
                "Research the contact",
                "Confirm the website category and exact business association.",
              ],
              [
                "Verify & export",
                "Fresh vendor results and source rights decide what qualifies.",
              ],
            ].map(([t, d], i) => (
              <li key={t}>
                <span className="step-number">{i + 1}</span>
                <div>
                  <strong className="small">{t}</strong>
                  <p>{d}</p>
                </div>
              </li>
            ))}
          </ol>
          <hr className="divider" />
          <div className="row small">
            <Info size={15} />
            <strong>Coverage is source-dependent</strong>
          </div>
          <p className="small" style={{ margin: "10px 0 0" }}>
            All US states and Canadian provinces are searchable. A location in
            the form does not guarantee available records.
          </p>
        </aside>
      </div>
    </>
  );
}
