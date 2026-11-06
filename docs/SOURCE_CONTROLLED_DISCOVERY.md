# Source-controlled business discovery

Development branch: `feature/source-controlled-discovery`, based on completed frontend commit `d299a31`.

## Implemented

- Businesses With Websites and Businesses Without Websites share an accessible source selector with per-account, per-finder persistent choices. The exact source IDs remain in each saved job and search history.
- The worker executes only the selected source adapters. A combination of Overture and authorized imports runs both; it deduplicates repeated business IDs for that job, records each adapter's version/status/candidate counts and preserves a discovery-source label on results. A failed selected adapter records a source-specific failure; it never silently invokes a replacement.
- Job detail exposes selected sources and outcomes. Existing owner-scoped records, contact verification, suppression, source-rights checks and qualified-only exports remain in place.
- Additive migration `0005_chilly_amphibian.sql` stores per-account/per-finder preferences and per-job source runs. Earlier migrations and stored jobs were not rewritten.

## Operational state

| Channel                           | State                   | Current boundary                                                                                                                                             |
| --------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Overture Places                   | Available when imported | Searches only properly licensed records imported into the user's workspace. No live Overture API search is claimed.                                          |
| Authorized directories / chambers | Available when imported | Searches administrator-imported records with source-specific storage/export rights. No generic directory scraping.                                           |
| Google Maps / Places              | Awaiting approval       | The existing restricted ID-access check is not a persistent business-record adapter. Google content cannot be treated as an unrestricted lead/export source. |
| Bing Search                       | Not connected           | DataForSEO SERP support exists for global domain research; it is not connected to local finder jobs or company identity resolution. Not Bing Maps.           |
| Facebook Pages                    | Awaiting Meta approval  | Existing access test is for a known Page; no broad local discovery or email export.                                                                          |
| Instagram professional profiles   | Awaiting Meta approval  | Existing access test is for known usernames; no general city/niche directory.                                                                                |
| Google Search                     | Not connected           | No approved local-candidate pipeline currently connected.                                                                                                    |
| Brave Search                      | Enrichment hint only    | Existing website-research hints are not initial local-business discovery.                                                                                    |

Credentials alone do not enable these sources. The unavailable integrations have no live discovery implementation for this feature and were not tested with real keys. Credentials and review paths are documented on the admin source page and `.env.example`. Do not report them as operational.

## Deployment and limits

Apply migration 0005 after backing up Neon with `npm run db:migrate`. Deploy the same revision to Vercel and the existing worker; durable search still requires the existing Inngest and worker setup. A live authorized import and Neon worker run remain necessary acceptance tests. Source run counters describe adapter queries and records; they do not fabricate currency costs. Per-contact origin, verification age, suppression and export restrictions continue through the existing pipeline.

The broad Google/Bing/Meta discovery integrations, account-wide “new leads only” comparison and conflict resolution across independently imported versions remain future work. Existing owner-scoped identity deduplication and per-job source-result deduplication are preserved.
