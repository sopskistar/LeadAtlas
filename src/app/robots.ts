import type { MetadataRoute } from "next";

const origin = "https://www.leadatlas.xyz";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy", "/terms", "/tour"],
        disallow: [
          "/api/",
          "/dashboard",
          "/business-contacts",
          "/website-opportunities",
          "/domain-buyer-finder",
          "/new-businesses",
          "/leads",
          "/jobs",
          "/searches/",
          "/exports",
          "/admin/",
          "/settings/",
          "/sign-in",
          "/sign-up",
          "/forgot-password",
          "/reset-password",
          "/updates/",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
