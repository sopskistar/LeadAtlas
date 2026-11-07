import { readFile } from "node:fs/promises";
import { describe, it, expect } from "vitest";
describe("approved transparent logo assets", () => {
  it("serves the original approved PNG byte-for-byte without cropping or flattening", async () => {
    expect(await readFile("public/brand/leadatlas-icon-v2.png")).toEqual(
      await readFile("leadatlas-icon-v2.png"),
    );
  });
  it.each([
    [16, "favicon-16"],
    [24, "app-icon-24"],
    [32, "favicon-32"],
    [64, "app-icon-64"],
    [180, "apple-touch-icon"],
    [192, "app-icon-192"],
    [512, "app-icon-512"],
  ] as const)(
    "keeps a square RGBA %ipx supporting icon",
    async (size, name) => {
      const png = await readFile(`public/brand/${name}.png`);
      expect(png.subarray(1, 4).toString()).toBe("PNG");
      expect(png.readUInt32BE(16)).toBe(size);
      expect(png.readUInt32BE(20)).toBe(size);
      expect(png[25]).toBe(6);
    },
  );
});
