"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Info } from "lucide-react";
import { regions } from "@/lib/core/locations";
import type { Product } from "@/lib/core/types";
import { Button, ErrorNotice, api, useResource } from "./ui";
import { Combobox, type Choice } from "./combobox";
import { products } from "./catalog";
const visibleLeadSources = [
  { id: "google", name: "Google Maps", state: "AWAITING_APPROVAL" },
  { id: "bing", name: "Bing Search", state: "NOT_CONNECTED" },
  { id: "facebook", name: "Facebook Pages", state: "AWAITING_APPROVAL" },
  { id: "instagram", name: "Instagram Business", state: "AWAITING_APPROVAL" },
  { id: "google_search", name: "Google Search", state: "NOT_CONNECTED" },
  { id: "brave", name: "Brave Search", state: "NOT_CONNECTED" },
  { id: "overture", name: "Overture Places", state: "NOT_CONFIGURED" },
  {
    id: "imports",
    name: "Authorized Business Directories",
    state: "NOT_CONFIGURED",
  },
];
function sourceStateLabel(state: string) {
  switch (state) {
    case "AVAILABLE":
      return "Available";
    case "AWAITING_APPROVAL":
      return "Approval required";
    case "TEMPORARILY_UNAVAILABLE":
      return "Temporarily unavailable";
    case "UNSUPPORTED_FOR_SEARCH":
      return "Unavailable for this search";
    case "NOT_CONFIGURED":
      return "No permitted records yet";
    default:
      return "Not connected";
  }
}
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
    search: boolean;
    domainSearch?: boolean;
  }>("/api/status");
  const { data: session } = useResource<{ user?: { id: string } }>(
    "/api/session",
  );
  const [niche, setNiche] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [strategy, setStrategy] = useState("auto");
  const [sourceOverride, setSourceOverride] = useState<{
    product: "contacts" | "opportunities";
    sources: string[];
  } | null>(null);
  const [sourceError, setSourceError] = useState("");
  const {
    data: sourceSettings,
    error: sourceSettingsError,
    loading: sourceSettingsLoading,
  } = useResource<{
    selected: string[];
    supported: string[];
    catalog: { id: string; name: string; state: string; reason: string }[];
  }>(
    product === "contacts" || product === "opportunities"
      ? `/api/source-preferences?product=${product}`
      : "",
  );
  const sources =
    (sourceOverride?.product === product ? sourceOverride.sources : null) ??
    sourceSettings?.selected ??
    [];
  async function updateSources(next: string[]) {
    if (product !== "contacts" && product !== "opportunities") return;
    setSourceOverride({ product, sources: next });
    setSourceError("");
    try {
      await api("/api/source-preferences", {
        method: "PUT",
        body: JSON.stringify({ product, sources: next }),
      });
    } catch (e) {
      setSourceError(
        e instanceof Error ? e.message : "Could not save source choices.",
      );
    }
  }
  const available =
    product === "domains" ? status?.domainSearch : status?.search;
  const loadCities = useCallback(
    async (q: string, offset: number, signal: AbortSignal) => {
      const data = await api<{ cities: string[]; nextOffset: number | null }>(
        `/api/cities?country=${country}&region=${region}&q=${encodeURIComponent(q)}&offset=${offset}`,
        { signal },
      );
      return {
        options: data.cities.map((label) => ({ id: label, label })),
        nextOffset: data.nextOffset,
      };
    },
    [country, region],
  );
  const loadNiches = useCallback(
    async (q: string, _offset: number, signal: AbortSignal) => {
      const data = await api<{ suggestions: Choice[] }>(
        `/api/niches?q=${encodeURIComponent(q)}`,
        { signal },
      );
      return { options: data.suggestions };
    },
    [],
  );
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      if (product === "contacts" || product === "opportunities") {
        if (!sources.length)
          throw new Error("Choose at least one available lead source.");
        await api("/api/source-preferences", {
          method: "PUT",
          body: JSON.stringify({ product, sources }),
        });
      }
      const result = await api<{ jobId: string }>("/api/jobs", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          product,
          ...(product === "domains"
            ? {
                scope: "global",
                domain: portfolio.length ? undefined : data.get("domain"),
                domains: portfolio.length ? portfolio : undefined,
                domainKind: strategy,
                ownershipAffirmed: data.get("ownership") === "on",
                professionalContext: String(data.get("context") ?? ""),
                filters:
                  data.get("filterCountry") || data.get("filterIndustry")
                    ? {
                        country:
                          String(data.get("filterCountry") || "")
                            .trim()
                            .toUpperCase() || undefined,
                        industry:
                          String(data.get("filterIndustry") || "").trim() ||
                          undefined,
                      }
                    : undefined,
              }
            : {
                country,
                region,
                city: city.trim(),
                niche: niche.trim(),
                categoryId,
                sources:
                  product === "new"
                    ? ["overture", "imports", "canada"]
                    : sources,
              }),
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
        <h1>{item.title}</h1>
        <p>
          {product === "contacts"
            ? "Research website owners and their public business contacts."
            : product === "opportunities"
              ? "Research operating businesses without an identified independent website."
              : product === "domains"
                ? "Research a worldwide shortlist of businesses with a closely related name or domain."
                : "Research recent incorporation records in supported regions."}
        </p>
      </div>
      <div className="tool-layout">
        <div className="stack">
          {status && !available && (
            <div className="notice" role="status">
              <strong>Search temporarily unavailable.</strong> We’re preparing
              the research service. Please try again later, or{" "}
              <Link className="link" href="/tour">
                take the sample tour
              </Link>
              .
            </div>
          )}
          {available && !session?.user && (
            <div className="notice">
              <Link className="link" href="/sign-in">
                Sign in
              </Link>{" "}
              to start a search and keep your research together.
            </div>
          )}
          <form
            className="search-form stack"
            onSubmit={submit}
            aria-busy={busy}
          >
            <ErrorNotice message={error} />
            <div className="formgrid">
              {product === "domains" && (
                <>
                  <label className="full">
                    Your domain
                    <input
                      name="domain"
                      placeholder="yourdomain.com"
                      required={!portfolio.length}
                      maxLength={253}
                    />
                  </label>
                  <label>
                    Matching strategy
                    <select
                      name="domainKind"
                      value={strategy}
                      onChange={(e) => setStrategy(e.target.value)}
                    >
                      <option value="auto">Automatic</option>
                      <option value="brandable">Brandable name</option>
                      <option value="exact">Exact-match brand/domain</option>
                      <option value="personal">
                        Public professional full name
                      </option>
                    </select>
                  </label>
                  <label>
                    Professional context
                    <input
                      name="context"
                      required={strategy === "personal"}
                      placeholder="Practice, profession or company"
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
                          if (rows.length > 25) {
                            setError("Upload up to 25 domains.");
                            return;
                          }
                          setPortfolio(rows);
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
              {product !== "domains" && (
                <>
                  <Combobox
                    label="Country"
                    name="country"
                    value={country === "US" ? "United States" : "Canada"}
                    options={[
                      { id: "US", label: "United States" },
                      { id: "CA", label: "Canada" },
                    ]}
                    required
                    onChange={() => {}}
                    onSelect={(choice) => {
                      setCountry(choice.id as "US" | "CA");
                      setRegion(choice.id === "US" ? "NY" : "ON");
                      setCity("");
                    }}
                  />
                  <Combobox
                    key={country}
                    label={country === "US" ? "State" : "Province / territory"}
                    name="region"
                    value={String(regions[country][region])}
                    options={Object.entries(regions[country]).map(
                      ([id, label]) => ({ id, label: String(label) }),
                    )}
                    required
                    onChange={() => {}}
                    onSelect={(choice) => {
                      setRegion(choice.id);
                      setCity("");
                    }}
                  />
                  <Combobox
                    key={`${country}-${region}`}
                    label="City"
                    name="city"
                    value={city}
                    onChange={setCity}
                    load={loadCities}
                    custom
                    required
                    attribution="GeoNames, CC BY 4.0"
                    placeholder="Search or choose a city"
                  />
                  <Combobox
                    label="Business niche"
                    name="niche"
                    value={niche}
                    onChange={(value) => {
                      setNiche(value);
                      setCategoryId(undefined);
                    }}
                    onSelect={(choice) =>
                      setCategoryId(
                        choice.id === "custom" ? undefined : choice.id,
                      )
                    }
                    load={loadNiches}
                    custom
                    required
                    attribution="2022 NAICS with business-name synonyms"
                    placeholder="Plumber, salon, electrician…"
                  />
                </>
              )}
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
              {(product === "contacts" || product === "opportunities") && (
                <fieldset
                  className="full stack source-selector"
                  aria-busy={sourceSettingsLoading}
                >
                  <legend>Lead sources</legend>
                  <p className="source-selector-copy">
                    Choose where to find your leads. Select one or more sources
                    to discover relevant businesses and contacts.
                  </p>
                  <div className="row">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!sourceSettings?.supported.length}
                      onClick={() =>
                        void updateSources(sourceSettings?.supported ?? [])
                      }
                    >
                      Select all available
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!sourceSettings}
                      onClick={() => void updateSources([])}
                    >
                      Clear selection
                    </Button>
                  </div>
                  <p className="source-selection-count" aria-live="polite">
                    {
                      sources.filter((id) =>
                        sourceSettings?.supported.includes(id),
                      ).length
                    }{" "}
                    selected
                    {sourceSettings?.supported.length
                      ? ` of ${sourceSettings.supported.length} available`
                      : ""}
                  </p>
                  <div className="source-options">
                    {(sourceSettings?.catalog ?? visibleLeadSources).map(
                      (source) => {
                        const selectable = Boolean(
                          sourceSettings?.supported.includes(source.id) &&
                          source.state === "AVAILABLE",
                        );
                        const status = sourceSettings
                          ? sourceStateLabel(source.state)
                          : sourceSettingsLoading
                            ? "Checking availability"
                            : "Sign in to check availability";
                        return (
                          <label
                            className={`source-option${selectable ? " is-available" : " is-unavailable"}`}
                            key={source.id}
                          >
                            <input
                              aria-label={source.name}
                              type="checkbox"
                              disabled={!sourceSettings || !selectable}
                              checked={Boolean(
                                selectable && sources.includes(source.id),
                              )}
                              onChange={(event) =>
                                void updateSources(
                                  event.target.checked
                                    ? [...sources, source.id]
                                    : sources.filter((id) => id !== source.id),
                                )
                              }
                            />
                            <span>
                              <span className="source-option-name">
                                {source.name}
                              </span>
                              <span className="source-option-state">
                                {selectable ? "Available" : status}
                              </span>
                            </span>
                          </label>
                        );
                      },
                    )}
                  </div>
                  {!sourceSettingsLoading && !sourceSettings && (
                    <p className="source-selector-status" role="status">
                      {session?.user
                        ? "Source availability could not be loaded. Reload to try again."
                        : sourceSettingsError
                          ? "Sign in to check which sources are available for your workspace."
                          : "Sign in to check which sources are available for your workspace."}
                    </p>
                  )}
                  {sourceSettings && !sourceSettings.supported.length && (
                    <p className="source-selector-status" role="status">
                      No discovery sources are available for this workspace yet.
                    </p>
                  )}
                  <ErrorNotice message={sourceError} />
                </fieldset>
              )}
              {product === "domains" && (
                <details className="full advanced-filters">
                  <summary>Advanced filters</summary>
                  <div className="formgrid">
                    <label>
                      Country code (optional)
                      <input
                        name="filterCountry"
                        placeholder="Any country"
                        maxLength={2}
                        pattern="[A-Za-z]{2}"
                      />
                    </label>
                    <label>
                      Industry (optional)
                      <input
                        name="filterIndustry"
                        placeholder="Any industry"
                        maxLength={100}
                      />
                    </label>
                  </div>
                </details>
              )}
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
              Qualified exports include only recently verified business contacts
              that pass the quality checks.
              {product === "opportunities" &&
                " A missing website field alone is never treated as proof that a business has no website."}
            </div>
            <div className="row between search-submit">
              <span className="small muted">
                {product === "domains"
                  ? "Worldwide research. A match does not establish buying intent."
                  : "Results depend on available regional coverage."}
              </span>
              <Button
                type="submit"
                disabled={busy || !available || !session?.user}
              >
                {busy ? "Starting search…" : "Start search"}
                <ArrowRight size={15} />
              </Button>
            </div>
          </form>
          {product === "new" && (
            <section className="card">
              <h3>Coverage & freshness</h3>
              <p className="small">
                Recently registered businesses are available only in supported
                regions. Canadian coverage currently includes federal records.
                US coverage varies by state; live state filing feeds are not
                connected. Registration alone does not establish current trading
                activity.
              </p>
            </section>
          )}
        </div>
        <aside className="search-notes">
          <details>
            <summary>Qualification &amp; coverage</summary>
            <ol className="step-list" style={{ marginTop: 16 }}>
              {[
                [
                  "Discover",
                  product === "domains"
                    ? "Discover closely related domains worldwide using authorized sources."
                    : "Use permitted records matching your location and niche.",
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
                  "Recent verification and quality checks decide what qualifies.",
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
              {product === "domains"
                ? "Worldwide discovery depends on permitted sources and independent website evidence. A short or empty shortlist can be the correct result."
                : "All US states and Canadian provinces are searchable. A location in the form does not guarantee available records."}
            </p>
            <details className="search-example">
              <summary>Example search</summary>
              <p className="small">{item.example}</p>
            </details>
          </details>
        </aside>
      </div>
    </>
  );
}
