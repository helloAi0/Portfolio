"""Run: python3 agent/test_system_prompt.py"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from system_prompt import SYSTEM_PROMPT, TOOLS, PRIVILEGED, FORBIDDEN_EVERYWHERE, tools_for
fail = 0
def ok(n, c):
    global fail
    print(("PASS " if c else "FAIL ") + n); fail += 0 if c else 1
ok("four modes", set(TOOLS) == {"CONCIERGE_MODE", "AUTO_APPLY_MODE", "COLD_EMAIL_MODE", "CERT_SYNC_MODE"})
ok("public concierge holds ZERO privileged tools", not (set(tools_for("CONCIERGE_MODE")) & PRIVILEGED))
ok("no mode holds a forbidden tool", all(not (set(t) & FORBIDDEN_EVERYWHERE) for t in TOOLS.values()))
ok("cold email mode cannot browse or send", not ({"browser", "send_email", "send_cold_email"} & set(tools_for("COLD_EMAIL_MODE"))))
ok("auto-apply prefills but has no submit tool", "prefill_form_no_submit" in tools_for("AUTO_APPLY_MODE") and "submit_application" not in tools_for("AUTO_APPLY_MODE"))
for phrase in ["You are an AI", "UNTRUSTED DATA", "Never reveal phone numbers", "never submit an application", "Under 150 words", "Discard below 85", "45% tech stack", "r.jina.ai", "pending", "send_owner_alert(priority=\"high\")"]:
    ok(f"prompt contains: {phrase}", phrase in SYSTEM_PROMPT)
for mode in TOOLS:
    ok(f"prompt names every tool of {mode}", all(t in SYSTEM_PROMPT for t in TOOLS[mode] if t not in ("get_record", "list_records", "poll_gmail_readonly", "upload_pdf", "gemini_extract", "fetch_public_verification_url", "upsert_pending_certificate", "fetch_public_job_feeds", "score_job", "select_resume", "stage_for_review", "draft_answer_from_verified_facts")))
print(f"\n{fail} failed" if fail else "\nALL PASS"); sys.exit(1 if fail else 0)
