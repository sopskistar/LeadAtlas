import type { Metadata } from "next";
import "./globals.css";
import { themeScript } from "@/lib/core/theme-script";
export const metadata: Metadata = {
  title: {
    default: "LeadAtlas | Business research",
    template: "%s | LeadAtlas",
  },
  description:
    "Business discovery with sourced contacts, explicit verification evidence, and quality-first lead exports.",
  icons: {
    icon: [
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/brand/apple-touch-icon.png",
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
        <style>{`/* Hallmark · theme: custom · hero: custom index · job: sign up · posture: restrained · v2.0.0 */`}</style>
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
