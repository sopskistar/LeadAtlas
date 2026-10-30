import Link from "next/link";
import {
  ArrowUpRight,
  Globe2,
  Store,
  ScanSearch,
  Building2,
} from "lucide-react";
export const products = [
  {
    path: "/business-contacts",
    id: "contacts",
    title: "Business Contact Finder",
    short: "Business contacts",
    icon: Globe2,
    desc: "Find active businesses with functioning websites and sourced, verified public emails.",
  },
  {
    path: "/website-opportunities",
    id: "opportunities",
    title: "Website Opportunity Finder",
    short: "Website opportunities",
    icon: Store,
    desc: "Research businesses with no identified independent website. Keep uncertainty visible.",
  },
  {
    path: "/domain-buyer-finder",
    id: "domains",
    title: "Domain Buyer Finder",
    short: "Domain buyers",
    icon: ScanSearch,
    desc: "Match your domain to existing brands, professional names and close domain variations.",
  },
  {
    path: "/new-businesses",
    id: "new",
    title: "New Business Finder",
    short: "New businesses",
    icon: Building2,
    desc: "Discover recent incorporation records, then independently research activity and contacts.",
  },
] as const;
export function ProductCards() {
  return (
    <div className="tool-grid">
      {products.map((p) => (
        <Link href={p.path} className="card tool-card" key={p.id}>
          <div className="tool-icon">
            <p.icon size={21} />
          </div>
          <h3>{p.title}</h3>
          <p>{p.desc}</p>
          <span
            className="row small"
            style={{ color: "var(--blue)", fontWeight: 600 }}
          >
            Open finder <ArrowUpRight size={15} />
          </span>
        </Link>
      ))}
    </div>
  );
}
