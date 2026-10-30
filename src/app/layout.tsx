import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "LeadAtlas — Find Businesses. Find Opportunities.",
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
