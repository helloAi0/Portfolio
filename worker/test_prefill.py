"""Pre-fill tests against local fixture forms (no internet). Run: python3 worker/test_prefill.py  (needs playwright + chromium)"""
import asyncio, functools, http.server, os, sys, tempfile, threading
sys.path.insert(0, os.path.dirname(__file__))
from prefill import ats_of, application_url, classify, confidence, prefill_page

fail = 0
def ok(n, c, x=None):
    global fail
    print(("PASS " if c else "FAIL ") + n + ("" if c else f"  {x}")); fail += 0 if c else 1

ok("ats detection", ats_of("https://boards.greenhouse.io/x/jobs/1") == "greenhouse" and ats_of("https://jobs.ashbyhq.com/x/1") == "ashby" and ats_of("https://jobs.lever.co/x/1") == "lever" and ats_of("https://example.com") == "other")
ok("lever/ashby application urls", application_url("https://jobs.lever.co/x/1") == "https://jobs.lever.co/x/1/apply" and application_url("https://jobs.ashbyhq.com/x/1") == "https://jobs.ashbyhq.com/x/1/application")
ok("classify standard", classify("First Name *") == "first_name" and classify("E-mail address") == "email" and classify("LinkedIn Profile") == "linkedin")
ok("demographic / visa / salary never answered", all(classify(t) == "skip" for t in ["Gender", "Race / Ethnicity", "Veteran status", "Do you require visa sponsorship?", "Expected salary"]))
ok("custom question is None", classify("Why do you want to work here?") is None)
ok("confidence penalises custom + captcha, capped", confidence(3, 3, 0, False) == 0.95 and confidence(3, 3, 1, True) < 0.7)

APPLICANT = {"firstName": "Taha", "lastName": "Udaipurwala", "fullName": "Taha Udaipurwala", "email": "t@example.com", "city": "Kolkata, India", "github": "https://github.com/x", "linkedin": None}
here = os.path.join(os.path.dirname(__file__), "fixtures")
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=here))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start(); port = srv.server_address[1]
pdf = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False); pdf.write(b"%PDF-1.4 test"); pdf.close()

async def run():
    from playwright.async_api import async_playwright
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); page = await b.new_page()
        posts = []; page.on("request", lambda r: posts.append(r.url) if r.method == "POST" else None)
        await page.goto(f"http://127.0.0.1:{port}/greenhouse_like.html")
        rep = await prefill_page(page, APPLICANT, "+91 00000 00000", pdf.name)
        v = lambda i: page.eval_on_selector(i, "e => e.value")
        ok("standard fields filled", await v("#fn") == "Taha" and await v("#ln") == "Udaipurwala" and await v("#em") == "t@example.com" and await v("#ph") == "+91 00000 00000", rep)
        ok("links filled", await v("#gh") == "https://github.com/x" and await v("#li") == "")
        ok("visa question left blank", await v("#v") == "")
        ok("resume attached", rep["resumeAttached"] and await page.eval_on_selector("#cv", "e => e.files.length") == 1)
        ok("plain form is essay-free with high confidence", rep["essayFree"] and rep["formConfidence"] >= 0.8, rep)
        res = await page.evaluate("fetch('/submit',{method:'POST',body:'x'}).then(()=>'sent').catch(()=>'blocked')")
        ok("network guard blocks a submit-looking POST", res == "blocked", res)
        ok("form never submitted", not await page.evaluate("!!window.__submitted"))
        p2 = await b.new_page(); await p2.goto(f"http://127.0.0.1:{port}/with_essay.html")
        r2 = await prefill_page(p2, APPLICANT, "", None)
        ok("essay + captcha form flagged", not r2["essayFree"] and r2["captcha"] and any("Why do you want" in q for q in r2["customQuestions"]), r2)
        ok("essay field left untouched", await p2.eval_on_selector("#q", "e => e.value") == "")
        ok("confidence low for essay + captcha", r2["formConfidence"] < 0.7, r2)
        await b.close()
asyncio.run(run())
print(f"\n{fail} failed" if fail else "\nALL PASS"); sys.exit(1 if fail else 0)
