export type Product = "contacts" | "opportunities" | "domains" | "new";
export type WebsiteStatus =
  | "OWNED_SITE_FOUND"
  | "NO_OWNED_SITE_FOUND"
  | "SITE_UNREACHABLE"
  | "PARKED_OR_FOR_SALE"
  | "SOCIAL_ONLY"
  | "UNKNOWN"
  | "REVIEW_REQUIRED";
export type ActivityStatus =
  "LIKELY_ACTIVE" | "CLOSED" | "TEMPORARILY_CLOSED" | "UNKNOWN" | "CONFLICTING";
export type EmailStatus =
  | "LIKELY_DELIVERABLE"
  | "INVALID"
  | "CATCH_ALL"
  | "UNKNOWN"
  | "DISPOSABLE"
  | "DO_NOT_MAIL"
  | "UNVERIFIED";
export type Quality =
  "QUALIFIED" | "NEEDS_REVIEW" | "REJECTED" | "PENDING_VERIFICATION";
export type FieldRight = {
  source: string;
  url: string;
  license: string;
  persist: boolean;
  export: boolean;
  attribution: string;
};
export type Evidence = {
  kind:
    | "activity"
    | "closure"
    | "temporary_closure"
    | "registration"
    | "website"
    | "absence"
    | "contact";
  url: string;
  observedAt: string;
  detail: string;
  source: string;
  independent?: boolean;
};
export type Verification = {
  status: EmailStatus;
  nativeStatus: string;
  provider: string;
  checkedAt: string;
  mx: "PRESENT" | "ABSENT" | "UNKNOWN";
  detail: string;
};
export type Contact = {
  email: string;
  sourceUrl: string;
  foundAt: string;
  binding: "EXACT_BUSINESS" | "UNCERTAIN";
  rights: FieldRight;
  verification?: Verification;
};
export type WebsiteCheck = {
  status: WebsiteStatus;
  checkedAt: string;
  url?: string;
  detail: string;
  identity: boolean;
  functional: boolean;
};
export type BusinessRecord = {
  id: string;
  source: string;
  sourceId: string;
  name: string;
  country: "US" | "CA";
  region: string;
  city: string;
  niche: string;
  websites: string[];
  socials: string[];
  contacts: Contact[];
  evidence: Evidence[];
  fieldRights: Record<string, FieldRight>;
  operatingStatus:
    "open" | "permanently_closed" | "temporarily_closed" | "unknown";
  sourceUpdatedAt?: string;
  importedAt: string;
  website?: WebsiteCheck;
  quality?: {
    status: Quality;
    reasons: string[];
    checkedAt: string;
    activity: ActivityStatus;
  };
  registrationDate?: string;
  registryId?: string;
  fixture?: boolean;
  suppressed?: boolean;
  domainMatch?: {
    domain: string;
    tier: string;
    reasons: string[];
    rank: number;
    ambiguous: boolean;
  };
};
export type SearchInput = {
  product: Product;
  country: "US" | "CA";
  region: string;
  city: string;
  niche: string;
  sources: string[];
  limit: number;
  queryBudget: number;
  domain?: string;
  domains?: string[];
  domainKind?: "brandable" | "personal" | "exact";
  ownershipAffirmed?: boolean;
  professionalContext?: string;
  since?: string;
  until?: string;
};
export type SourceState =
  | "READY_FOR_IMPORT"
  | "MISSING_CREDENTIALS"
  | "CONFIGURED_UNTESTED"
  | "RESTRICTED"
  | "NOT_CONNECTED";
export type SourceInfo = {
  id: string;
  displayName: string;
  availability: SourceState;
  licensePolicy: string;
  permittedPersistenceFields: string[];
  permittedExportFields: string[];
  requiresKey: boolean;
  docs: string;
  limitations: string;
  rawRetention: string;
  batchLimit: number;
};
export interface LeadSourceAdapter extends SourceInfo {
  search(
    input: SearchInput,
    context: { ownerId: string; jobId: string },
  ): Promise<{ ids: string[]; nextCursor?: string }>;
}
