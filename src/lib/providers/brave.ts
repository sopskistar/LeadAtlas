export async function discoveryUrls(
  query: string,
  consume: (provider: string) => Promise<void>,
) {
  if (!process.env.BRAVE_SEARCH_API_KEY) return [];
  await consume("brave");
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query.slice(0, 500));
  url.searchParams.set("count", "5");
  url.searchParams.set("result_filter", "web");
  const response = await fetch(url, {
    headers: {
      "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(
      `Brave returned HTTP ${response.status}; no result substitution`,
    );
  const data = (await response.json()) as {
    web?: { results?: { url: string }[] };
  };
  // URLs are transient discovery hints. Do not return snippets, persist the response or treat absence as proof.
  return (data.web?.results ?? [])
    .map((r) => r.url)
    .filter((v) => /^https?:\/\//.test(v))
    .slice(0, 5);
}
