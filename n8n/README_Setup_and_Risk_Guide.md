# Taha Udaipurwala — Robotics/AI Cold-Outreach n8n Starter

**Package contents**
- `01_main_pipeline.json` — job discovery, filtering, posting fetch, Apollo contact search/enrichment, Hunter verification, LLM draft, deterministic code gate, human approval, daily quota check and Gmail send.
- `02_reply_detection.json` — hourly Gmail reply matching, replied / opted-out state updates and audit log.
- `03_follow_up.json` — once-only follow-up flow with verification, LLM draft, the same code gate, human approval, quota check, same-thread reply, and deferred-send recovery.
- `Code_Node_Snippets.md` — the Code-node JavaScript.
- `LLM_System_Prompt.md` — grounded system prompt.
- `Google_Sheets_Schema.csv` — field types and definitions.
- `Google_Sheets_Headers.txt` — exact row-1 header strings for the three tabs.

These are **importable workflow templates, not a fully credentialed live deployment**. The JSON syntax, node references and connection targets are validated, but node behavior still needs a test import in your own n8n version, credential selection, sheet mapping refresh, and live API tests. Do not activate until every checklist item below passes.

## Profile filled from the information already available

- Name: **Taha Udaipurwala**
- Target focus: early-career Robotics Software Engineer, Robotics Engineer, AI/ML Engineer, Autonomous Systems Engineer, Computer Vision Engineer, Embedded Software Engineer, Controls Engineer, plus related internships / graduate roles.
- Location preference: India, remote, global.
- Companies to start: NVIDIA, Boston Dynamics, Figure AI, Tesla, Agility Robotics.
- Schedule: 08:00 IST job scan; 09:00 IST follow-up queue; hourly reply scan.

Still must be supplied by you (not guessed):
- `RESUME_URL` — public/share-accessible resume link.
- `PORTFOLIO_URL` — public portfolio link.
- `PROFILE_GMAIL` — Gmail used to send recruiter emails and receive your approval notifications.
- API keys and Google Sheet ID.

## Important setup values

Create one Google Spreadsheet with exactly these three tabs: `Jobs`, `Contacts`, `Log`. Paste the matching header row from `Google_Sheets_Headers.txt` into row 1 of each tab. `Google_Sheets_Schema.csv` is the field/type dictionary. In every Google Sheets node, select the actual spreadsheet and matching tab after import, then refresh the column mapping.

### Where your profile comes from (no retyping)
Your name, bio, email, portfolio link and resume links are read live from your portfolio at
`<PORTFOLIO_URL>/api/public/outreach-profile` (public data only). Edit them in the portfolio Admin (Resume Studio, Profile, Projects)
and the workflows pick up the change on the next run. The workflow stops with a clear error if anything is missing (for example no resume uploaded).

### Environment variables (self-hosted n8n)
Required:
```bash
PORTFOLIO_URL=https://your-live-portfolio-domain
APIFY_TOKEN=...
APOLLO_API_KEY=...
HUNTER_API_KEY=...
OPENAI_API_KEY=...
SEND_RAMP_START_DATE=YYYY-MM-DD
LIVE_SENDS_ENABLED=false
```
Optional overrides (leave unset to use the portfolio values): `PROFILE_NAME`, `PROFILE_BIO`, `RESUME_URL`, `PROFILE_GMAIL`, `OPENAI_MODEL`, `LOCATION_PREFERENCE`.

## Credentials to attach after import

1. **Google Sheets OAuth2** — choose the same Google account that owns the spreadsheet; grant read/write access.
2. **Gmail OAuth2** — attach the sender Gmail on the three Gmail nodes and Gmail Trigger. Ensure the sending account is the account you control. Gmail nodes are deliberately not connected to any AI node directly.
3. **Apify token** — `APIFY_TOKEN` or an Apify credential.
4. **Apollo API key** — `APOLLO_API_KEY`; people search and people bulk enrichment permissions. Apollo charges credits for enriched people, not just search results; the workflow selects only up to ten candidates in the first pass.
5. **Hunter API key** — `HUNTER_API_KEY`; only Hunter status `valid` passes. Accept-all, unknown, webmail, disposable, risky and invalid are rejected.
6. **OpenAI API key** — `OPENAI_API_KEY`; separate API billing applies. ChatGPT subscription does not automatically include API credits.

## Important node configuration after import

- Set the same Google Spreadsheet ID in every Google Sheets node and re-select the actual tab by name. Refresh columns; ensure `Jobs` matches on `Job Link`, `Contacts` on `Email`, and appends to `Log`.
- Select the right OAuth credential on all Gmail and Google Sheets nodes.
- Set `PROFILE_NAME`, `PROFILE_BIO`, `PROFILE_GMAIL`, `RESUME_URL`, and `PORTFOLIO_URL` in the n8n environment. Verify them on a draft preview.
- The main workflow uses Apify's maintained Google Search Results Scraper actor (`apify/google-search-scraper`). It searches the careers domains in the profile config without a country-only restriction so the India / remote / global preference is not limited to Indian search results. Search indexing is not exhaustive; validate the career URL list and add each company's official job-board domain if results are missed.
- The job-page HTTP node stores the body in `pageHtml`, then writes the extracted text to the `Jobs` tab before Apollo enrichment. Some job boards block automated HTTP clients or render content using JavaScript. In those cases, the workflow correctly routes insufficient text to human review; an Apify Website Content Crawler or official ATS API integration is the safer extension.
- Apollo people search is sent as a JSON request body with `q_organization_domains_list` and `person_titles`; the domain is derived from the `domainMap` built from the company configuration (there is no catch-all company-domain fallback). Apollo people search does not return email addresses; the workflow calls bulk enrichment separately. Bulk enrichment supports at most 10 people per request. The current template checks the highest-priority 10 candidates and marks `No New Contact` if all are already used. To guarantee a search across every possible Apollo result, extend pagination and process more 10-person batches; do not weaken the global email dedupe rule.
- The contact selector refreshes the `Contacts` tab for each job and excludes any email with a nonblank `Contacted At`, a `Reserved`/`Contacted`/`Do Not Contact` state, or `Opted Out=Y`. This is important because an earlier loop iteration may already have reserved a candidate. Pending approvals reserve the contact. The workflow releases a reservation after rejection, timeout, failed verification or failed draft gate, because no email was sent.
- Approval emails use n8n Wait-node resume URLs. The URLs are bearer links: keep the approval email private. `ignoreBots` is enabled, but test that your mail security scanner does not prefetch and consume links. For stronger security, use a private authenticated approval portal rather than raw links.
- A new follow-up is first marked `Follow-Up Pending Approval` before the owner notification / 48-hour Wait, so the next daily run cannot enqueue a second approval for the same job. After approval, the row is marked `Follow-Up Sending — Reserved` before Gmail is called. If Gmail fails ambiguously after the reservation, that row is deliberately not auto-retried; manually reconcile the Sent folder and thread before changing its status. Confirmed sends become `Followed Up`, set `Follow-Up Sent Date`, and clear `Follow-Up Due Date`, preventing a third email. Follow-ups use Gmail's `thread` → `reply` operation using the stored original `Gmail Thread ID` and `Gmail Message ID`; if those IDs are blank after the first send, stop and fix the initial send mapping before enabling follow-ups.
- Set each workflow timezone to `Asia/Kolkata` if your n8n version does not honor the exported timezone setting. The scan is 08:00 IST and follow-up check is 09:00 IST.

## Build order (do not skip)

### Stage 1–2: scraping and title filtering only — two full days
1. Import only `01_main_pipeline.json`.
2. Disable every node from `Apollo People Search` onward (or start with a temporary copy ending after `Normalize and Deduplicate Jobs`).
3. Run manually and confirm only relevant jobs appear in `Jobs`; verify duplicate `Job Link` values are not appended.
4. Leave the scrape-only workflow running for two days. Review missed jobs / false positives and correct official domains and keywords.

### Stage 3–5: Apollo + email verification
1. Enable Apollo search, rank, bulk-enrichment, selection and Hunter nodes.
2. Test on **10 companies/job records**; verify every recruiter is currently employed by the stated company and the title priority is respected.
3. Check global dedupe in `Contacts`; verify that the same email never gets a second cold-email assignment.
4. Reject every verifier status except `valid`. Confirm Apollo and Hunter credits before scaling.

### Stage 6–9: drafts + human approval, no sending
1. Add the OpenAI draft and both Code-gate nodes.
2. Temporarily disable `Send Approved Cold Email #1` and downstream send updates.
3. Confirm all drafts in `Jobs` are factual and 60–120 words, 3–5 sentences, exactly one `?`, have both links and opt-out line, and contain no placeholders/banned phrases.
4. Test approval, rejection and 48-hour timeout using a non-production test address. Never send to a recruiter while testing.

### Stage 10: test and ramp
1. Enable live sends only after the above checks pass and the sender identity is configured properly.
2. In a separate staging copy of the workflow and spreadsheet, send 5 test messages to email addresses you control first, never to recruiters. For those staging test rows only, set `Contact Email` and `expectedEmail` to your own address and `emailVerified=true`; keep production on Apollo + Hunter. Test the Wait approval click path, Gmail send result, sheet updates, reply matching and threading. Set `LIVE_SENDS_ENABLED=true` in the staging copy only.
3. Set `SEND_RAMP_START_DATE` to the first live-sending date. The code gate applies this conservative ramp: days 1–7 = 5/day; days 8–14 = 10/day; days 15–21 = 20/day; day 22 onward = 30/day maximum.
4. After staging tests pass, set `LIVE_SENDS_ENABLED=true` in the production environment and begin at 5/day. Keep the human approval gate active forever. Do not raise the cap merely because the node permits it.

## Critical safety / technical qualifications

- **Three-sheet state is not a transactional database.** The quota logic writes a `SEND_RESERVED` log row before Gmail. The quota gate deduplicates `SEND_RESERVED` and `SEND_SUCCESS` entries by `Job Link + Contact Email`, so one send consumes one slot; a reserved slot is still counted if Gmail subsequently fails, which is conservative. To prevent two workflows from simultaneously reading the same quota, serialize production execution globally on self-hosted n8n (for example queue mode with `N8N_CONCURRENCY_PRODUCTION_LIMIT=1`) or implement an atomic lock in a database. Google Sheets alone cannot guarantee atomic check-and-increment under concurrency.
- The template is built for Gmail / Google Workspace sending. Gmail limits, sender reputation, account age, recipient feedback and authentication are independent of the internal 30/day cap. A cap is not a promise of deliverability.
- The approval links are sensitive bearer URLs. If a mail scanner follows the link, use an authenticated approval form/portal instead.
- n8n workflow JSON cannot validate your actual API plan, company job board, Apollo match data, Hunter status, Google OAuth scopes or Gmail account policy. Run in manual/test mode before production.
- Title filtering is applied to the job title only (not the search snippet). The main job discoverer uses public search index results and is not guaranteed to find every new opening. Some sites' terms and robots policies restrict scraping; prefer official APIs/ATS feeds where available and respect site policies.

## Compliance notes (not legal advice)

- **India:** The Digital Personal Data Protection Act, 2023 and DPDP Rules, 2025 are now the relevant privacy framework, with commencement staged across provisions. Treat named recruiter contact details as personal data: document the lawful basis and purpose, minimise what is stored, restrict access, set a retention period, honour opt-outs/deletion requests, and review cross-border processing/vendor terms. Do not assume that a publicly visible email is automatically unrestricted for any use.
- **EU/UK:** GDPR rights include the right to object to processing for direct marketing. Local e-privacy / PECR rules can apply separately to B2B email and vary by recipient type and country. Stop processing/sending when a recipient objects; consult the applicable national regulator's rules before outreach.
- **United States:** CAN-SPAM applies to commercial messages, including B2B; use accurate headers/subject lines, identify the sender, include a valid postal address, provide a clear opt-out and honour opt-outs within the statutory period. An opt-out reply must be reflected immediately in the `Contacts` tab and suppress future sends.
- The current opt-out line is a courtesy, not a substitute for any legally required postal address, sender disclosures or other local requirements. Add your valid postal address / footer after checking the laws for the recipient jurisdiction.
- Keep a global suppression record in `Contacts` (`Opted Out=Y`) and never clear it just to reuse a record. The reply-detection workflow catches common stop phrases and a standalone 'no'; manually process any ambiguous opt-out immediately.

## Official implementation references

- n8n Wait node and resume URL / timeout: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/
- n8n Google Sheets operations: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/
- Apollo People Search: https://docs.apollo.io/docs/find-people-using-filters
- Apollo Bulk People Enrichment (max 10 per call): https://docs.apollo.io/reference/bulk-people-enrichment
- Hunter Email Verifier: https://hunter.io/api-documentation/v2
- Apify Google Search Results Scraper: https://apify.com/apify/google-search-scraper/api
- Gmail sender guidelines: https://support.google.com/mail/answer/81126
- Gmail sending limits: https://support.google.com/mail/answer/22839
- FTC CAN-SPAM guidance: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- GDPR text, Article 21: https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng/
- India DPDP Rules notification: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190655&lang=1&reg=3
