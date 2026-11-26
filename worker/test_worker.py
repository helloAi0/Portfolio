"""Run: python3 worker/test_worker.py   (pure helpers, no network)"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from extract import *
fail = 0
def ok(n, c):
    global fail
    print(("PASS " if c else "FAIL ") + n); fail += 0 if c else 1

links = clean_links(["https://www.coursera.org/account/accomplishments/verify/ABC123", "https://x.com/coursera", "https://email.coursera.org/unsubscribe?x=1",
                     "https://www.coursera.org/privacy", "http://insecure.example.com/cert", "https://cdn.x.com/logo.png", "https://www.coursera.org/account/accomplishments/verify/ABC123#top"])
ok("tracking/social/unsubscribe/http/images stripped, dupes merged", links == ["https://www.coursera.org/account/accomplishments/verify/ABC123"])
ok("no pdf and no link is ignored", hard_prefilter("Your certificate", "x", [], False) is not None)
ok("job email ignored", hard_prefilter("Application received for SDE", "x", ["https://a.com/b"], False) == "job-application email")
ok("interview email ignored", hard_prefilter("Interview invitation", "x", ["https://a.com/b"], True) is not None)
ok("newsletter ignored", hard_prefilter("Weekly digest: 50% off", "x", ["https://a.com/b"], False) == "marketing / newsletter")
ok("real certificate email continues", hard_prefilter("Your NPTEL certificate is ready", "x", [], True) is None)
ok("credential id kept only if verbatim", credential_in_text("ABC123", "Your id ABC123 is ready") == "ABC123")
ok("invented credential id dropped", credential_in_text("ZZZ999", "Your id ABC123 is ready") is None)
ok("'null' string credential dropped", credential_in_text("null", "null") is None)
ok("date kept when year+month visible", date_in_text("2026-03-15", "Issued on 15 March 2026") == "2026-03-15")
ok("invented date dropped", date_in_text("2024-01-01", "Issued on 15 March 2026") is None)
ok("malformed date dropped", date_in_text("March 2026", "March 2026") is None)
ok("model-invented URL rejected", url_allowed("https://evil.example/cert", links) is None)
ok("URL from the email accepted", url_allowed(links[0], links) == links[0])
ok("login wall detected", looks_like_login_wall("Please sign in to continue to your dashboard " * 5))
ok("403 is a wall", looks_like_login_wall("x" * 500, 403))
ok("real page is not a wall", not looks_like_login_wall("Certificate of Completion awarded to Taha for Machine Learning. " * 10))
print(f"\n{fail} failed" if fail else "\nALL PASS"); sys.exit(1 if fail else 0)
