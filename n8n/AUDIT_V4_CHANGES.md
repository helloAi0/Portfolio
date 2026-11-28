# V4 audit of the n8n cold-outreach package (2026-11-27)

Method: static graph analysis of all three workflows plus execution of the real Code-node JavaScript against test inputs.
NOT tested: live n8n, Google Sheets, Gmail, Apollo, Hunter, OpenAI, Apify (no network or credentials here).

## Graph safety checks (all pass)
- No unreachable nodes, unique node IDs/names, every connection target and every `$('Node')` reference exists, all Code-node JS parses.
- Every path to the cold-email Gmail node and the follow-up Gmail node passes through a Wait (human approval) node.
  The only Gmail nodes reachable without a Wait are (a) the approval emails to YOUR address (`$env.PROFILE_GMAIL`) and
  (b) the deferred-send nodes, which only send rows already carrying `Approved At` / `Follow-Up Approved At` from an earlier approval.
- No LLM/HTTP node connects directly to a Gmail node: LLM -> Parse -> Code Gate -> If -> Save Pending -> Owner email -> Wait.
- Opted-out contacts are excluded in the follow-up queue.

## Bugs fixed
1. Reply detection handled only the FIRST reply per hourly batch (Prepare nodes used `.item` in all-items mode), so later replies were never logged, and "mark as read" read an ID from merged items. Rewritten to map over all matches; added a `Prepare Read Marks` node.
2. Opt-out detection flagged replies containing or starting with "stop"/"no" (e.g. "Stop by tomorrow", "No longer hiring") and read quoted original text. CORRECTION (2026-11-28): the first fix still matched replies that START with "stop"/"no"; found in review and fixed. Now opt-out = explicit phrases (unsubscribe, remove me, please stop emailing...), or a reply that is ONLY "no"/"stop"/"unsubscribe" (optional punctuation), or "no thanks". Quoted text is stripped. Tested on 15 messages against the real node code.
3. Initial-email code gate (both attempts) did not enforce 3-5 sentences, the exact opt-out sentence, or the exact job title. Added.

4. Profile no longer typed by hand: both the main and follow-up workflows call `<PORTFOLIO_URL>/api/public/outreach-profile` (new endpoint in the portfolio repo) for name, bio, email, portfolio URL and resume link; env vars are optional overrides, and the run fails loudly if a field is missing.

## Code-gate tests run (real node code)
good draft passes; banned phrase, two question marks, placeholder, wrong recipient, unverified email, missing portfolio URL, too short, missing opt-out line and wrong job title each fail with the right reason.
Daily cap: 5/day on ramp day 1 (30 after 21 days); `LIVE_SENDS_ENABLED=false` blocks all sends; duplicate SEND_RESERVED+SEND_SUCCESS rows for one send count once.
Reply matcher: opt-out / normal reply / already-handled message / unknown sender classified correctly.

## Risks to check in staging (unchanged, cannot be proven offline)
- Many Code nodes use `$('Node').item` in "run once for all items" mode. It works while Split In Batches uses batchSize 1 (as configured) and items keep pairedItem. If n8n reports "Can't get data for expression" / missing paired item, switch that node to `.first()`.
- Apollo endpoint access/plan, response shapes, Hunter statuses, Google Sheets column mapping, Gmail thread reply, and whether your mail scanner consumes approval links.
- Google Sheets is not transactional: serialise executions (concurrency 1).
- Set PORTFOLIO_URL (the only profile value needed) and keep LIVE_SENDS_ENABLED=false until the staging steps in the README pass.

## Portfolio hookup (added later)
- Main workflow has a second trigger, `Manual Scan — Portfolio Button` (webhook POST `outreach-run-now`) guarded by `Run Secret Matches?` (header `x-run-secret` must equal env `N8N_RUN_SECRET`). It feeds the same first node as the 08:00 schedule, so the scan, code gate and approval gate are identical.
- Set `N8N_RUN_SECRET` in n8n (any 24+ character random string).

- The manual-scan webhook now answers immediately: 200 {started:true} when the secret matches, 401 when `N8N_RUN_SECRET` is unset in n8n or differs. The header lookup is case-insensitive. The portfolio shows the 401 as a red message instead of failing silently, and only ever says "Scan started" (never "complete").
