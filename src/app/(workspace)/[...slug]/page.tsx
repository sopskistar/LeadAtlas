import { notFound, redirect } from "next/navigation";
import { SearchForm } from "@/components/search-form";
import {
  Dashboard,
  JobList,
  JobDetail,
  SavedLeads,
  ExportHistory,
} from "@/components/workspace";
import { TestimonialsAdmin } from "@/components/testimonials-admin";
import { Sources } from "@/components/sources";
import { Account } from "@/components/account";
import { pageIdentity, isAdmin } from "@/lib/server/access";
const titles: Record<string, string> = {
  dashboard: "Overview",
  "business-contacts": "Businesses With Websites",
  "website-opportunities": "Businesses Without Websites",
  "domain-buyer-finder": "Domain Buyer Finder",
  "new-businesses": "New Business Finder",
  leads: "Lead Management & Export",
  jobs: "Search history",
  "admin/sources": "Data sources & operations",
  "admin/testimonials": "Customer testimonials",
  "settings/account": "Account & privacy",
  exports: "Exports",
};
const descriptions: Record<string, string> = {
  dashboard: "Review your LeadAtlas research workspace and recent activity.",
  "business-contacts": "Research businesses with functioning independent websites.",
  "website-opportunities": "Research active businesses without an identified independent website.",
  "domain-buyer-finder": "Find worldwide businesses with evidence-based domain name relationships.",
  "new-businesses": "Research newly registered businesses and their public business presence.",
  leads: "Save, tag and export qualified business prospects.",
  jobs: "Review and resume your source-controlled searches.",
  "admin/sources": "Manage authorized discovery sources and workspace operations.",
  "admin/testimonials": "Review and manage permitted customer testimonials.",
  "settings/account": "Manage your LeadAtlas account and privacy controls.",
  exports: "Review qualified prospect exports from your workspace.",
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = slug.join("/");
  return {
    title: titles[path] ?? "Research",
    description: descriptions[path] ?? "Private LeadAtlas business research workspace.",
    robots: { index: false, follow: false },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = slug.join("/");
  if (path === "settings/sources") redirect("/admin/sources");
  if (path.startsWith("admin/")) {
    const identity = await pageIdentity();
    if (!identity) redirect("/sign-in");
    if (!isAdmin(identity.user.id)) notFound();
    if (path === "admin/sources") return <Sources />;
    if (path === "admin/testimonials") return <TestimonialsAdmin />;
    notFound();
  }
  if (
    ["leads", "jobs", "exports", "settings/account"].includes(path) ||
    slug[0] === "searches"
  ) {
    if (!(await pageIdentity())) redirect("/sign-in");
  }
  if (path === "search") redirect("/dashboard");
  if (path === "domain-finder") redirect("/domain-buyer-finder");
  if (path === "dashboard") return <Dashboard />;
  if (path === "business-contacts") return <SearchForm product="contacts" />;
  if (path === "website-opportunities")
    return <SearchForm product="opportunities" />;
  if (path === "domain-buyer-finder") return <SearchForm product="domains" />;
  if (path === "new-businesses") return <SearchForm product="new" />;
  if (path === "jobs") return <JobList />;
  if (slug[0] === "searches" && slug.length === 2)
    return <JobDetail id={slug[1]} />;
  if (path === "leads") return <SavedLeads />;
  if (path === "exports") return <ExportHistory />;
  if (path === "settings/account") return <Account />;
  notFound();
}
