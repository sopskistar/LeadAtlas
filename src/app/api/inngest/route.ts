import { serve } from "inngest/next";
import { inngest, searchWorkflow } from "@/lib/server/inngest";
export const maxDuration = 60;
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [searchWorkflow],
});
