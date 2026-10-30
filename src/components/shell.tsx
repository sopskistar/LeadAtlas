"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bookmark,
  History,
  Cable,
  Settings,
  Download,
  ExternalLink,
} from "lucide-react";
import { products } from "./catalog";
import { useResource } from "./ui";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { data } = useResource<{ user?: { name: string } }>("/api/session");
  const nav = [
    { path: "/dashboard", short: "Overview", icon: LayoutDashboard },
    ...products,
    { path: "/leads", short: "Saved leads", icon: Bookmark },
    { path: "/jobs", short: "Search history", icon: History },
    { path: "/exports", short: "Exports", icon: Download },
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="sidebar-brand" href="/" aria-label="LeadAtlas home">
          <Image
            className="logo"
            src="/brand/leadatlas-wordmark.png"
            width={202}
            height={72}
            alt="LeadAtlas"
            priority
          />
        </Link>
        <Link className="mobile-brand" href="/" aria-label="LeadAtlas home">
          <Image
            src="/brand/leadatlas-icon.png"
            width={52}
            height={45}
            className="logo"
            alt="LeadAtlas"
          />
        </Link>
        <div className="sidebar-section">WORKSPACE</div>
        <nav aria-label="Workspace">
          {nav.map((p) => (
            <Link
              title={p.short}
              className={`nav-item ${path === p.path ? "active" : ""}`}
              href={p.path}
              key={p.path}
              aria-current={path === p.path ? "page" : undefined}
            >
              <p.icon size={18} />
              <span>{p.short}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-section">MANAGE</div>
        <nav aria-label="Settings">
          <Link
            title="Sources & integrations"
            className={`nav-item ${path === "/settings/sources" ? "active" : ""}`}
            href="/settings/sources"
          >
            <Cable size={18} />
            <span>Sources & integrations</span>
          </Link>
          <Link
            title="Account & privacy"
            className="nav-item"
            href="/settings/account"
          >
            <Settings size={18} />
            <span>Account & privacy</span>
          </Link>
        </nav>
        <div className="sidebar-footer">
          <p>
            Quality over quantity.
            <br />
            Evidence before export.
          </p>
          <Link className="row" href="/terms">
            Responsible research <ExternalLink size={12} />
          </Link>
        </div>
      </aside>
      <div>
        <header className="app-header">
          <div className="breadcrumb">
            Workspace <span style={{ margin: "0 10px" }}>/</span>
            <span style={{ color: "var(--navy)" }}>
              {nav.find((p) => p.path === path)?.short ?? "Research & settings"}
            </span>
          </div>
          <div className="row">
            <span className="badge">US & Canada</span>
            <Link
              href={data?.user ? "/settings/account" : "/sign-in"}
              className="button secondary"
              style={{ padding: "8px 12px", fontSize: 12 }}
            >
              {data?.user?.name ?? "Sign in"}
            </Link>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
