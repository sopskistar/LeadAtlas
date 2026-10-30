"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  History,
  Cable,
  Settings,
  Download,
  ExternalLink,
} from "lucide-react";
import { features } from "./catalog";
import { useResource } from "./ui";
import { Brand, MobileMenu } from "./navigation";
import { ThemeSwitcher } from "./theme";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { data } = useResource<{ user?: { name: string }; isAdmin: boolean }>(
    "/api/session",
  );
  const nav = [
    { path: "/dashboard", short: "Overview", icon: LayoutDashboard },
    ...features,
    { path: "/jobs", short: "Search history", icon: History },
    { path: "/exports", short: "Exports", icon: Download },
  ];
  const navigation = (
    <>
      <div className="sidebar-section">YOUR WORKSPACE</div>
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
      <div className="sidebar-section">ACCOUNT</div>
      <nav aria-label="Settings">
        <Link
          className={`nav-item ${path === "/settings/account" ? "active" : ""}`}
          href="/settings/account"
        >
          <Settings size={18} />
          <span>Account & privacy</span>
        </Link>
        {data?.isAdmin && (
          <Link
            className={`nav-item ${path === "/admin/sources" ? "active" : ""}`}
            href="/admin/sources"
          >
            <Cable size={18} />
            <span>Admin · Data sources & operations</span>
          </Link>
        )}
      </nav>
    </>
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        {navigation}
        <div className="sidebar-footer">
          <p>
            Quality leads.
            <br />
            Clearer opportunities.
          </p>
          <Link className="row" href="/terms">
            Responsible research <ExternalLink size={12} />
          </Link>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="app-header">
          <div className="row">
            <MobileMenu label="Workspace">{navigation}</MobileMenu>
            <div className="breadcrumb">
              Workspace <span aria-hidden="true"> / </span>
              <span>
                {nav.find((p) => p.path === path)?.short ??
                  "Account & settings"}
              </span>
            </div>
            <div className="workspace-mobile-brand">
              <Brand />
            </div>
          </div>
          <div className="header-actions">
            <ThemeSwitcher />
            <Link
              href={data?.user ? "/settings/account" : "/sign-in"}
              className="button secondary account-link"
            >
              {data?.user?.name ?? "Sign in"}
            </Link>
          </div>
        </header>
        <main id="main-content" className="content">
          {children}
        </main>
      </div>
    </div>
  );
}
