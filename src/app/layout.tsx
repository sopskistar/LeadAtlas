import type { Metadata } from "next";
import "./globals.css";
import { themeScript } from "@/lib/core/theme-script";
export const metadata: Metadata = {
  metadataBase: new URL("https://www.leadatlas.xyz"),
  title: {
    default: "LeadAtlas | Business research",
    template: "%s | LeadAtlas",
  },
  description:
    "Business discovery with sourced contacts, explicit verification evidence, and quality-first lead exports.",
  openGraph: {
    type: "website",
    siteName: "LeadAtlas",
    title: "LeadAtlas | Business research",
    description:
      "Find relevant businesses, review contact evidence, and organize qualified prospects.",
  },
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
