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
const titles: Record<string, string> = {
  dashboard: "Overview",
  "business-contacts": "Business Contact Finder",
  "website-opportunities": "Website Opportunity Finder",
  "domain-buyer-finder": "Domain Buyer Finder",
  "new-businesses": "New Business Finder",
  leads: "Saved leads",
  jobs: "Search history",
  "settings/sources": "Sources & integrations",
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
  if (path === "settings/sources") return <Sources />;
  if (path === "settings/account") return <Account />;
  notFound();
}
