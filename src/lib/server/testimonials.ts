import { randomUUID } from "node:crypto";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { testimonials } from "../db/schema";
export const testimonialSchema = z
  .object({
    id: z.uuid().optional(),
    displayName: z.string().trim().min(1).max(100),
    roleOrBusiness: z.string().trim().min(1).max(160),
    text: z.string().trim().min(10).max(1200),
    photoPath: z
      .string()
      .regex(/^\/testimonials\/[a-zA-Z0-9/_-]+\.(png|jpe?g|webp)$/)
      .nullable()
      .default(null),
    photoPermission: z.boolean().default(false),
    permissionStatus: z
      .enum(["PENDING", "GRANTED", "REVOKED"])
      .default("PENDING"),
    permissionEvidence: z.string().trim().max(1000).default(""),
    approvalStatus: z.enum(["DRAFT", "APPROVED"]).default("DRAFT"),
    publishedAt: z.iso.datetime().nullable().default(null),
  })
  .superRefine((v, ctx) => {
    if (v.permissionStatus === "GRANTED" && v.permissionEvidence.length < 8)
      ctx.addIssue({
        code: "custom",
        message: "Record the reviewer's publication permission privately.",
      });
    if (v.photoPath && !v.photoPermission)
      ctx.addIssue({
        code: "custom",
        message: "Photograph publication requires separate permission.",
      });
    if (
      v.approvalStatus === "APPROVED" &&
      (v.permissionStatus !== "GRANTED" || !v.publishedAt)
    )
      ctx.addIssue({
        code: "custom",
        message: "Publication needs granted permission and a publication date.",
      });
  });
export async function publishedTestimonials() {
  if (!process.env.DATABASE_URL) return [];
  return getDb()
    .select({
      id: testimonials.id,
      displayName: testimonials.displayName,
      roleOrBusiness: testimonials.roleOrBusiness,
      text: testimonials.text,
      photoPath: testimonials.photoPath,
      publishedAt: testimonials.publishedAt,
    })
    .from(testimonials)
    .where(
      and(
        eq(testimonials.approvalStatus, "APPROVED"),
        eq(testimonials.permissionStatus, "GRANTED"),
        lte(testimonials.publishedAt, new Date()),
        sql`(${testimonials.photoPath} IS NULL OR ${testimonials.photoPermission}=true)`,
      ),
    )
    .orderBy(desc(testimonials.publishedAt), testimonials.id)
    .limit(5);
}
export async function saveTestimonial(raw: unknown, adminId: string) {
  const input = testimonialSchema.parse(raw),
    id = input.id ?? randomUUID();
  const row = {
    ...input,
    id,
    publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
    approvedAt: input.approvalStatus === "APPROVED" ? new Date() : null,
    updatedBy: adminId,
    updatedAt: new Date(),
  };
  const [saved] = await getDb()
    .insert(testimonials)
    .values(row)
    .onConflictDoUpdate({ target: testimonials.id, set: row })
    .returning();
  return saved;
}
export async function privateTestimonials() {
  return getDb()
    .select()
    .from(testimonials)
    .orderBy(desc(testimonials.updatedAt))
    .limit(50);
}
