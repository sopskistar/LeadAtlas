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
    discoveryDescription:
      "Find active businesses with functioning websites and reliable public contact information.",
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
    discoveryDescription:
      "Discover active businesses without an identified website and find their public business contacts.",
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
    discoveryDescription:
      "Find businesses using related names or domain variations that may be upgrade prospects for your domain.",
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
    discoveryDescription:
      "Discover newly registered businesses and research their public presence and contacts.",
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
const summaries: Record<string, string> = {
  contacts: "Functioning websites. Sourced business contacts.",
  opportunities: "Website opportunities, supported by independent research.",
  domains: "Close brand names and existing domain variations.",
  new: "Recent incorporation records. Activity checked separately.",
  leads: "Saved research, notes and qualified CSV exports.",
};
export function ProductCards({ headingLevel = 3 }: { headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="feature-index">
      {features.map((p) => (
        <Link href={p.path} className="feature-row" key={p.id}>
          <div className="feature-heading">
            <p.icon size={21} aria-hidden="true" />
            <Heading>{p.title}</Heading>
          </div>
          <p>{summaries[p.id]}</p>
          <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}
