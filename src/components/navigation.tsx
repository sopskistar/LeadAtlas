"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { ThemeSwitcher } from "./theme";
import { features } from "./catalog";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      className={`brand ${compact ? "compact-brand" : ""}`}
      href="/"
      aria-label="LeadAtlas home"
    >
      <Image
        className="logo"
        src="/brand/leadatlas-wordmark.png"
        width={202}
        height={72}
        alt="LeadAtlas"
        priority
      />
    </Link>
  );
}
export function MobileMenu({
  children,
  label = "Navigation",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className="icon-button mobile-menu-trigger"
        aria-label={`Open ${label.toLowerCase()} menu`}
      >
        <Menu size={22} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="mobile-menu">
          <div className="row between">
            <Brand />
            <Dialog.Close className="icon-button" aria-label="Close menu">
              <X size={22} />
            </Dialog.Close>
          </div>
          <Dialog.Title className="sr-only">{label}</Dialog.Title>
          <Dialog.Description className="sr-only">
            Choose a page or press Escape to close.
          </Dialog.Description>
          <div
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setOpen(false);
            }}
          >
            {children}
          </div>
          <ThemeSwitcher />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function PublicHeader() {
  return (
    <header className="landing-nav">
      <Brand />
      <nav className="public-links" aria-label="Main navigation">
        <Link href="/#features">Features</Link>
        <Link href="/#how-it-works">How it works</Link>
        <Link href="/#who-its-for">Who it’s for</Link>
      </nav>
      <div className="header-actions">
        <ThemeSwitcher />
        <Link className="sign-in-link" href="/sign-in">
          Sign in
        </Link>
        <Link className="button desktop-cta" href="/sign-up">
          Get started <ArrowUpRight size={16} />
        </Link>
        <MobileMenu>
          <nav aria-label="Mobile navigation" className="mobile-links">
            <Link href="/#features">Features</Link>
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/#who-its-for">Who it’s for</Link>
            <hr className="divider" />
            {features.map((p) => (
              <Link key={p.path} href={p.path}>
                {p.title}
              </Link>
            ))}
            <Link href="/sign-in">Sign in</Link>
            <Link className="button" href="/sign-up">
              Get started
            </Link>
          </nav>
        </MobileMenu>
      </div>
    </header>
  );
}
