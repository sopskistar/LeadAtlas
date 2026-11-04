import type {
  BusinessRecord,
  Contact,
  Evidence,
  FieldRight,
  Verification,
  WebsiteCheck,
} from "../core/types";
import type { DomainStrategy } from "../core/domain";
export type DomainResearch = {
  domains: string[];
  strategy: DomainStrategy;
  professionalContext?: string;
  filters?: { country?: string; industry?: string };
  limit: number;
  queryBudget: number;
};
export type DiscoveryHint = { url: string; provider: string };
export type DiscoveryContext = {
  consume: (provider: string) => Promise<void>;
  signal?: AbortSignal;
};
// Search responses stay transient. A hint is never identity/activity/contact evidence.
export interface SearchProviderAdapter {
  id: string;
  available(): boolean;
  discover(query: string, context: DiscoveryContext): Promise<DiscoveryHint[]>;
}
export interface CandidateDiscovery {
  discover(
    input: DomainResearch,
    context: DiscoveryContext,
  ): Promise<DiscoveryHint[]>;
}
export interface DomainMatcher {
  match(
    domain: string,
    business: BusinessRecord,
    strategy: DomainStrategy,
  ): BusinessRecord["domainMatch"];
}
export interface BusinessIdentityValidator {
  validate(
    record: BusinessRecord,
    approvedHosts: string[],
    rights: FieldRight,
  ): Promise<BusinessRecord & { website?: WebsiteCheck }>;
}
export interface PublicContactDiscovery {
  discover(
    record: BusinessRecord,
    context: DiscoveryContext,
  ): Promise<Contact[]>;
}
export interface EmailVerifier {
  verify(
    contact: Contact,
    consume: DiscoveryContext["consume"],
  ): Promise<Verification>;
}
export interface EvidenceAssessment {
  assess(record: BusinessRecord): NonNullable<BusinessRecord["quality"]>;
}
export interface ResearchExplainer {
  explain(
    evidence: Pick<Evidence, "url" | "detail" | "observedAt">[],
  ): Promise<{ text: string; evidenceIndexes: number[]; untrusted: true }>;
}
