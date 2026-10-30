import type { Metadata } from "next";
import "./globals.css";
import { themeScript } from "@/lib/core/theme-script";
export const metadata: Metadata = {
  title: {
    default: "LeadAtlas — Better Leads. Better Opportunities.",
    template: "%s | LeadAtlas",
  },
  description:
    "Business discovery with sourced contacts, explicit verification evidence, and quality-first lead exports.",
  icons: {
    icon: "/brand/leadatlas-icon.png",
    apple: "/brand/leadatlas-icon.png",
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
