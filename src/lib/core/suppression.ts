import type { BusinessRecord } from "./types";
export function suppressMailboxes(
  record: BusinessRecord,
  addresses: Set<string>,
): BusinessRecord {
  return {
    ...record,
    contacts: record.contacts.map((c) =>
      addresses.has(c.email.toLowerCase())
        ? {
            ...c,
            verification: {
              status: "DO_NOT_MAIL",
              provider: "user_feedback",
              nativeStatus: "suppressed",
              checkedAt: new Date().toISOString(),
              mx: c.verification?.mx ?? "UNKNOWN",
              detail:
                "This mailbox is suppressed by owner feedback, including on other business records",
            },
          }
        : c,
    ),
  };
}
