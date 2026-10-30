import { z } from "zod";
import { validRegion } from "./locations";
import { parse } from "tldts";
export const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(253)
  .refine((v) => {
    if (!/^[a-z0-9.-]+$/.test(v) || v.includes("xn--") || v.includes(".."))
      return false;
    const p = parse(v);
    return !!p.domain && p.domain === v && !!p.isIcann && !p.subdomain;
  }, "Enter a registered ASCII domain only; Unicode/punycode names require manual review.");
export const searchSchema = z
  .object({
    product: z.enum(["contacts", "opportunities", "domains", "new"]),
    country: z.enum(["US", "CA"]),
    region: z.string().trim().toUpperCase(),
    city: z.string().trim().min(1).max(100),
    niche: z.string().trim().min(1).max(100),
    sources: z
      .array(z.enum(["overture", "imports", "canada"]))
      .min(1)
      .max(3),
    limit: z.number().int().min(1).max(100),
    queryBudget: z.number().int().min(0).max(200),
    domain: domainSchema.optional(),
    domains: z.array(domainSchema).max(25).optional(),
    domainKind: z.enum(["brandable", "personal", "exact"]).optional(),
    ownershipAffirmed: z.boolean().optional(),
    professionalContext: z.string().trim().max(200).optional(),
    since: z.iso.date().optional(),
    until: z.iso.date().optional(),
  })
  .superRefine((v, ctx) => {
    if (!validRegion(v.country, v.region))
      ctx.addIssue({
        code: "custom",
        path: ["region"],
        message: "Choose a valid state or province.",
      });
    if (
      v.product === "domains" &&
      (!(v.domain || v.domains?.length) ||
        !v.ownershipAffirmed ||
        !v.domainKind)
    )
      ctx.addIssue({
        code: "custom",
        message: "Domain, strategy and ownership affirmation are required.",
      });
    if (
      v.product === "domains" &&
      v.domainKind === "personal" &&
      !v.professionalContext?.trim()
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Public professional context is required for personal-name matching.",
      });
    if (v.product === "new" && (!v.since || !v.until || v.since > v.until))
      ctx.addIssue({
        code: "custom",
        message: "A valid incorporation date range is required.",
      });
  });
