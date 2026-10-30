import { it, expect } from "vitest";
import { business, NOW } from "./fixtures/business";
import { suppressMailboxes } from "../src/lib/core/suppression";
import { qualifiedCsv } from "../src/lib/core/csv";
it("suppresses the same opted-out mailbox across distinct business/location records", () => {
  const a = business({ fixture: false });
  const b = business({
    fixture: false,
    name: "Another branch",
    city: "Albany",
  });
  const blocked = new Set([a.contacts[0].email]);
  expect(
    qualifiedCsv(
      [suppressMailboxes(a, blocked), suppressMailboxes(b, blocked)],
      "contacts",
      NOW,
    ).count,
  ).toBe(0);
});
it("does not suppress an unrelated valid mailbox", () => {
  const a = business({ fixture: false });
  expect(
    qualifiedCsv(
      [suppressMailboxes(a, new Set(["other@different.example"]))],
      "contacts",
      NOW,
    ).count,
  ).toBe(1);
});
