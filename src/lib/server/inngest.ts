import { Inngest } from "inngest";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { jobs } from "../db/schema";
import { workerCall } from "./worker-auth";
export const inngest = new Inngest({
  id: "leadatlas",
  isDev:
    process.env.INNGEST_DEV === "1" && process.env.NODE_ENV !== "production",
});
export const searchWorkflow = inngest.createFunction(
  {
    id: "qualified-business-search",
    triggers: { event: "leadatlas/search.requested" },
    retries: 3,
    concurrency: { limit: 2, key: "event.data.ownerId" },
    cancelOn: [{ event: "leadatlas/search.cancelled", match: "data.jobId" }],
    onFailure: async ({ event }) => {
      const id = event.data.event.data.jobId as string;
      await getDb()
        .update(jobs)
        .set({
          status: "FAILED",
          error:
            "Workflow failed after retries. Inspect worker/Inngest logs; retry resumes completed steps.",
          updatedAt: new Date(),
        })
        .where(and(eq(jobs.id, id), sql`${jobs.status} != 'CANCELLED'`));
    },
  },
  async ({ event, step }) => {
    const jobId = event.data.jobId as string;
    const discovered = await step.run("discover-permitted-records", () =>
      workerCall({ action: "discover", jobId }),
    );
    for (const id of discovered.ids ?? []) {
      let done = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        // Worker returns immediately and stores progress in Postgres. Inngest sleep/polls
        // outlive a Vercel request and resume after a worker restart or expired lease.
        const result = await step.run(`verify-${id}-${attempt}`, () =>
          workerCall({ action: "process", jobId, businessId: id }),
        );
        if (["DONE", "CANCELLED"].includes(result.status ?? "")) {
          done = true;
          break;
        }
        await step.sleep(`wait-${id}-${attempt}`, "10s");
      }
      if (!done)
        throw new Error(
          "Worker did not finish within polling window; resume job to retry",
        );
    }
    return step.run("finish", () => workerCall({ action: "finish", jobId }));
  },
);
