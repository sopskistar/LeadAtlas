import Link from "next/link";
import {
  ArrowUpRight,
  Globe2,
  Store,
  ScanSearch,
  Building2,
  ListChecks,
} from "lucide-react";
export const products = [
  {
    path: "/business-contacts",
    id: "contacts",
    title: "Businesses With Websites",
    short: "Businesses With Websites",
    icon: Globe2,
    desc: "Find active businesses with functioning websites and sourced, verified public emails.",
    example:
      "Find plumbing companies in Dallas that have websites and verified business emails.",
  },
  {
    path: "/website-opportunities",
    id: "opportunities",
    title: "Businesses Without Websites",
    short: "Businesses Without Websites",
    icon: Store,
    desc: "Find businesses that appear to be operating, have no identifiable independent website, and have publicly available business emails to verify.",
    example:
      "Find cleaning companies in Houston that don’t have websites but have publicly available business emails.",
  },
  {
    path: "/domain-buyer-finder",
    id: "domains",
    title: "Domain Buyer Finder",
    short: "Domain Buyer Finder",
    icon: ScanSearch,
    desc: "Match your domain to existing brands, professional names and close domain variations.",
    example:
      "Find businesses using a close variation of a domain you own, such as getoceanwise.com for oceanwise.com.",
  },
  {
    path: "/new-businesses",
    id: "new",
    title: "New Business Finder",
    short: "New Business Finder",
    icon: Building2,
    desc: "Discover recent incorporation records, then independently research activity and contacts.",
    example:
      "Find recently registered businesses in Toronto and research their websites and public contacts.",
  },
] as const;
export const features = [
  ...products,
  {
    path: "/leads",
    id: "leads",
    title: "Lead Management & Export",
    short: "Lead Management & Export",
    icon: ListChecks,
    desc: "Save, organize, review and deduplicate leads. Export contacts that pass fresh verification and quality checks.",
    example:
      "Save your agency shortlist, remove unsuitable contacts, and export qualified business names and emails.",
  },
] as const;
export function productName(id: string) {
  return products.find((p) => p.id === id)?.title ?? id;
}
export function ProductCards() {
  return (
    <div className="tool-grid">
      {features.map((p, i) => (
        <Link href={p.path} className="card tool-card" key={p.id}>
          <div className="row between">
            <div className="tool-icon">
              <p.icon size={21} />
            </div>
            <span className="feature-number">0{i + 1}</span>
          </div>
          <h3>{p.title}</h3>
          <p>{p.desc}</p>
          <div className="feature-example">
            <span>TRY A SEARCH LIKE</span>
            {p.example}
          </div>
          <span
            className="row small"
            style={{ color: "var(--blue)", fontWeight: 600 }}
          >
            {p.id === "leads" ? "Manage your leads" : "Explore this finder"}{" "}
            <ArrowUpRight size={15} />
          </span>
        </Link>
      ))}
    </div>
  );
}
