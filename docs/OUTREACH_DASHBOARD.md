# Outreach Agent dashboard (Admin -> Outreach Agent)

**Division of labour (do not blur it):** n8n does everything (scrape, Apollo, Hunter, OpenAI, code gate, approval, Gmail send).
The Google Sheet (tabs Jobs / Contacts / Log) is the only state store. The portfolio only *reads* the sheet and can *trigger* a scan.

| Question | Answer |
|---|---|
| Where does the page read from? | The Google Sheet, through the Sheets API with a read-only service account. No new database table. |
| Approve / Reject buttons? | None. Approval stays the email link that calls n8n's `$execution.resumeUrl`. |
| Does the portfolio run the pipeline? | No. `/api/admin/outreach/run` only POSTs to an n8n webhook. |
| Workflow editor? | No. Four tables and two buttons. |
| Where do API keys live? | Apify/Apollo/Hunter/OpenAI: only n8n. Portfolio holds only a read-only Google service account and the n8n trigger URL/secret. |

## Setup
1. Google Cloud: create a service account, enable the Google Sheets API, create a JSON key.
2. Share the outreach spreadsheet with the service account's email as **Viewer**.
3. Set secrets (`.dev.vars` locally; `npx wrangler secret put NAME` on Cloudflare): `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY` (the `private_key` value from the JSON), `OUTREACH_SHEET_ID` (the long id in the sheet URL).
4. Run scan now: import the new main workflow (it now has a webhook trigger "Manual Scan — Portfolio Button"), set `N8N_RUN_SECRET` in n8n, activate the workflow, then set `N8N_RUN_WEBHOOK_URL` (production webhook URL) and the same `N8N_RUN_SECRET` in the portfolio. Without the matching secret n8n ignores the call.
5. Admin -> Outreach Agent -> Refresh.

The older "Manual Drafts" tab is a separate hand-written draft helper (it stores drafts in the portfolio DB and sends nothing). It is not part of the agent's state.
