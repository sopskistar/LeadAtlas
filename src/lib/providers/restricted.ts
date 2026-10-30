// Official, bounded research calls only. These responses never enter business storage,
// workflow step results, logs or exports. Permission review is still required.
export async function googlePlaceIds(textQuery: string) {
  if (
    !process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_DISPLAY_APPROVED !== "true"
  )
    throw new Error(
      "Google display access is restricted pending credentials and use review",
    );
  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": "places.id",
      },
      body: JSON.stringify({ textQuery, pageSize: 5 }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok)
    throw new Error(
      `Google permission or quota error: HTTP ${response.status}`,
    );
  const data = (await response.json()) as { places?: { id: string }[] };
  return (data.places ?? []).map((p) => p.id);
}
export async function metaKnownProfile(
  kind: "facebook" | "instagram",
  identifier: string,
) {
  if (process.env.META_APPROVAL_CONFIRMED !== "true")
    throw new Error(
      "Meta application permissions and use case are awaiting explicit approval review",
    );
  if (
    !process.env.META_ACCESS_TOKEN ||
    !process.env.META_GRAPH_VERSION ||
    !/^v\d+\.\d+$/.test(process.env.META_GRAPH_VERSION)
  )
    throw new Error("Meta access/version not configured; approval required");
  if (!/^[a-zA-Z0-9._]{1,100}$/.test(identifier))
    throw new Error("Invalid public profile identifier");
  // Facebook arbitrary Page access requires approved PPCA. Instagram requires professional Business Discovery access.
  const baseId =
    kind === "facebook" ? identifier : process.env.META_INSTAGRAM_ACCOUNT_ID;
  if (!baseId) throw new Error("Instagram professional account ID missing");
  const url = new URL(
    `https://graph.facebook.com/${process.env.META_GRAPH_VERSION}/${baseId}`,
  );
  url.searchParams.set(
    "fields",
    kind === "facebook"
      ? "id,name,link"
      : `business_discovery.username(${identifier}){id,username,website,name}`,
  );
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new Error(
      `Meta permission/approval failure: HTTP ${response.status}`,
    );
  // Deliberately do not persist or expose content through LeadAtlas. This only tests the approved endpoint.
  await response.arrayBuffer();
  return { accessTest: "API_RESPONDED", exportAllowed: false };
}
