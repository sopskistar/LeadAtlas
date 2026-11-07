import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/navigation";
import { SubscriptionAction } from "@/components/homepage-engagement";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Product updates",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ action: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { action } = await params;
  if (action !== "confirm" && action !== "unsubscribe") notFound();
  const { token } = await searchParams;
  return (
    <>
      <PublicHeader />
      <main id="main-content" className="content updates-action">
        <SubscriptionAction
          mode={action}
          token={typeof token === "string" && token.length <= 150 ? token : ""}
        />
      </main>
    </>
  );
}
