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
const budgets = {
  limit: z.number().int().min(1).max(100).default(10),
  queryBudget: z.number().int().min(0).max(200).default(20),
};
export const domainSearchSchema = z
  .object({
    product: z.literal("domains"),
    scope: z.literal("global").default("global"),
    domain: domainSchema.optional(),
    domains: z.array(domainSchema).min(1).max(25).optional(),
    domainKind: z
      .enum(["auto", "brandable", "personal", "exact"])
      .default("auto"),
    ownershipAffirmed: z.literal(true),
    professionalContext: z.string().trim().max(200).optional(),
    filters: z
      .object({
        country: z
          .string()
          .regex(/^[A-Z]{2}$/)
          .optional(),
        industry: z.string().trim().min(2).max(100).optional(),
      })
      .optional(),
    sources: z
      .array(z.enum(["brave", "dataforseo", "commoncrawl", "imports"]))
      .max(4)
      .default([]),
    ...budgets,
  })
  .superRefine((v, ctx) => {
    if (!(v.domain || v.domains?.length))
      ctx.addIssue({
        code: "custom",
        path: ["domain"],
        message: "Enter a domain or upload a portfolio.",
      });
    if (v.domainKind === "personal" && !v.professionalContext?.trim())
      ctx.addIssue({
        code: "custom",
        path: ["professionalContext"],
        message:
          "Public professional context is required for personal-name matching.",
      });
  });
export const localSearchSchema = z
  .object({
    product: z.enum(["contacts", "opportunities", "new"]),
    country: z.enum(["US", "CA"]),
    region: z.string().trim().toUpperCase(),
    city: z.string().trim().min(1).max(100),
    niche: z.string().trim().min(1).max(150),
    categoryId: z
      .string()
      .regex(/^naics:2022:[0-9]{6}$/)
      .optional(),
    sources: z
      .array(z.enum(["overture", "imports", "canada"]))
      .min(1)
      .max(3),
    since: z.iso.date().optional(),
    until: z.iso.date().optional(),
    ...budgets,
  })
  .superRefine((v, ctx) => {
    if (!validRegion(v.country, v.region))
      ctx.addIssue({
        code: "custom",
        path: ["region"],
        message: "Choose a valid state or province.",
      });
    if (v.product === "new" && (!v.since || !v.until || v.since > v.until))
      ctx.addIssue({
        code: "custom",
        message: "A valid incorporation date range is required.",
      });
  });
// Existing JSON job inputs are never rewritten. Newly submitted domain searches
// use this distinct contract; old geography fields are stripped, never defaulted.
export const searchSchema = z.union([domainSearchSchema, localSearchSchema]);
