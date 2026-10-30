import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { ingest } from "../src/lib/server/imports";
config({ path: ".env.local" });
config();
async function main() {
  const { values } = parseArgs({
    options: { owner: { type: "string" }, manifest: { type: "string" } },
  });
  if (!values.owner || !values.manifest)
    throw new Error(
      "Usage: npm run ingest -- --owner USER_ID --manifest data/batch.json",
    );
  if (!(process.env.ADMIN_USER_IDS ?? "").split(",").includes(values.owner))
    throw new Error("Import owner must be an ADMIN_USER_IDS account");
  const manifest = JSON.parse(await readFile(values.manifest, "utf8"));
  const content = await readFile(manifest.file, "utf8");
  console.info(
    await ingest(values.owner, {
      ...manifest,
      content,
      permissionConfirmed: manifest.permissionConfirmed === true,
    }),
  );
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : "Import failed");
    process.exit(1);
  });
