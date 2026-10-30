import { notFound, redirect } from "next/navigation";
import { SearchForm } from "@/components/search-form";
import {
  Dashboard,
  JobList,
  JobDetail,
  SavedLeads,
  ExportHistory,
} from "@/components/workspace";
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
  "settings/account": "Account & privacy",
  exports: "Exports",
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return { title: titles[slug.join("/")] ?? "Research" };
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
