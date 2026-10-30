import { EventEmitter } from "node:events";
import { describe, it, expect, vi, beforeEach } from "vitest";
const fixtures = vi.hoisted(() => ({
  addresses: [{ address: "8.8.8.8", family: 4 }],
  status: 200,
  headers: {} as Record<string, string>,
  body: "hello",
  pinned: "",
}));
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => fixtures.addresses),
}));
vi.mock("node:https", () => ({
  request: vi.fn((_url, options, callback) => {
    const req = Object.assign(new EventEmitter(), {
      end: () => {
        queueMicrotask(() => {
          options.lookup(
            "approved.example",
            {},
            (_error: unknown, address: string) => {
              fixtures.pinned = address;
            },
          );
          const response = Object.assign(new EventEmitter(), {
            statusCode: fixtures.status,
            headers: fixtures.headers,
            resume: () => {},
            destroy: () => {},
          });
          callback(response);
          response.emit("data", Buffer.from(fixtures.body));
          response.emit("end");
          req.emit("close");
        });
      },
      destroy: (error: Error) => {
        req.emit("error", error);
        req.emit("close");
      },
    });
    return req;
  }),
}));
import { safeFetch } from "../src/worker/safe-fetch";
beforeEach(() => {
  fixtures.addresses = [{ address: "8.8.8.8", family: 4 }];
  fixtures.status = 200;
  fixtures.headers = { "content-type": "text/html" };
  fixtures.body = "hello";
  fixtures.pinned = "";
});
describe("safe fetch transport", () => {
  it("pins the validated DNS address into the actual connection", async () => {
    const result = await safeFetch("https://approved.example/", [
      "approved.example",
    ]);
    expect(result.body).toBe("hello");
    expect(fixtures.pinned).toBe("8.8.8.8");
  });
  it("blocks DNS rebinding-style mixed private/public answers before connecting", async () => {
    fixtures.addresses.push({ address: "127.0.0.1", family: 4 });
    await expect(
      safeFetch("https://approved.example/", ["approved.example"]),
    ).rejects.toThrow("Unsafe DNS");
    expect(fixtures.pinned).toBe("");
  });
  it("does not follow unapproved redirect hosts", async () => {
    fixtures.status = 302;
    fixtures.headers = { location: "https://unapproved.example/" };
    await expect(
      safeFetch("https://approved.example/", ["approved.example"]),
    ).rejects.toThrow("not authorized");
  });
  it("blocks compressed payloads and oversized responses", async () => {
    fixtures.headers = { "content-encoding": "gzip" };
    await expect(
      safeFetch("https://approved.example/", ["approved.example"]),
    ).rejects.toThrow("Compressed");
    fixtures.headers = {};
    fixtures.body = "a".repeat(100);
    await expect(
      safeFetch("https://approved.example/", ["approved.example"], 10),
    ).rejects.toThrow("size limit");
  });
});
