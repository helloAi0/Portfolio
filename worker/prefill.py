"""
ATS form PRE-FILL (Playwright). Runs in GitHub Actions or local WSL, never in the web container.

It opens a public job-application page, fills the standard fields, attaches the right resume, takes a screenshot and reports how
confident it is. It NEVER submits: the owner reviews the screenshot in Admin and presses Submit himself.
Safety: no logged-in LinkedIn/Naukri sessions, no CAPTCHA solving (a CAPTCHA is reported, not bypassed), and any POST that looks like a
form submission is blocked at the network layer as a second lock behind "never click Submit".
"""
import re
from urllib.parse import urlparse

STANDARD = {  # field key -> label/name/placeholder patterns
    "first_name": r"first\s*name|given\s*name|fname",
    "last_name": r"last\s*name|family\s*name|surname|lname",
    "full_name": r"^(full\s*)?name\b|your\s*name",
    "email": r"e-?mail",
    "phone": r"phone|mobile|contact\s*number",
    "location": r"\b(current\s*)?(location|city)\b",
    "linkedin": r"linkedin",
    "github": r"github",
    "website": r"website|portfolio|personal\s*(site|url)",
}
# Voluntary self-identification / demographic questions are deliberately never answered by a bot.
SKIP = re.compile(r"gender|race|ethnic|veteran|disabilit|pronoun|sexual|religio|hispanic|demographic|eeo|self-identif|salary|compensation|visa|sponsor|authori[sz]ed|relocat|notice period|how did you hear", re.I)
SUBMIT_URL = re.compile(r"submit|/applications?(/|$|\?)|/apply(/|$|\?)|applicationform", re.I)


def ats_of(url):
    h = (urlparse(url).hostname or "").lower()
    for name in ("greenhouse", "lever", "ashbyhq", "wellfound", "internshala"):
        if name in h:
            return "ashby" if name == "ashbyhq" else name
    return "other"


def application_url(url):
    """Lever and Ashby keep the form on a sub-page of the posting."""
    u = url.split("#")[0].rstrip("/")
    a = ats_of(u)
    if a == "lever" and not u.endswith("/apply"): return u + "/apply"
    if a == "ashby" and not u.endswith("/application"): return u + "/application"
    return u


def classify(text):
    """Maps a field's label/name/placeholder to a standard key, 'skip' (never answer) or None (custom question)."""
    t = (text or "").strip().lower()
    if not t: return None
    if SKIP.search(t): return "skip"
    for key, pat in STANDARD.items():
        if re.search(pat, t, re.I): return key
    return None


def confidence(filled_required, total_required, custom_required, captcha):
    """0..1. Penalises unrecognised required questions and CAPTCHAs; never above 0.95 (a human always checks)."""
    if total_required == 0: return 0.2
    c = filled_required / total_required
    c -= 0.15 * custom_required
    if captcha: c -= 0.2
    return round(max(0.0, min(0.95, c)), 2)


async def prefill_page(page, applicant, phone, resume_path):
    """Fills what it recognises. Returns a report; never clicks anything that submits."""
    await page.route("**/*", lambda route: route.abort() if route.request.method in ("POST", "PUT", "PATCH") and SUBMIT_URL.search(route.request.url) else route.continue_())
    captcha = await page.locator("iframe[src*='recaptcha'], iframe[src*='hcaptcha'], .g-recaptcha, .h-captcha, [data-sitekey]").count() > 0
    values = {"first_name": applicant["firstName"], "last_name": applicant["lastName"], "full_name": applicant["fullName"], "email": applicant["email"],
              "phone": phone, "location": applicant["city"], "linkedin": applicant.get("linkedin"), "github": applicant.get("github"), "website": applicant.get("github")}
    filled_req = total_req = custom_req = 0; custom_questions = []; filled = []
    controls = page.locator("input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select")
    for i in range(await controls.count()):
        el = controls.nth(i)
        if not await el.is_visible(): continue
        meta = await el.evaluate("""e => { const l = e.id && document.querySelector(`label[for="${CSS.escape(e.id)}"]`);
            const wrap = e.closest('label, .field, .form-group, [class*=question], [class*=Field]');
            return { label: (l && l.innerText) || (wrap && wrap.innerText) || '', name: e.name || '', ph: e.placeholder || '', aria: e.getAttribute('aria-label') || '', req: e.required || e.getAttribute('aria-required') === 'true', tag: e.tagName.toLowerCase() }; }""")
        text = " ".join([meta["label"], meta["name"], meta["ph"], meta["aria"]])
        key = classify(text)
        required = bool(meta["req"] or "*" in meta["label"])
        if key == "skip": continue
        if required: total_req += 1
        val = values.get(key) if key else None
        if key and val and meta["tag"] != "select":
            await el.fill(str(val)); filled.append(key)
            if required: filled_req += 1
        elif required and not key:
            custom_req += 1; custom_questions.append(re.sub(r"\s+", " ", meta["label"] or meta["name"]).strip()[:300] or "(unlabelled question)")
    attached = False
    files = page.locator("input[type=file]")
    if resume_path and await files.count():
        try: await files.first.set_input_files(resume_path); attached = True
        except Exception: attached = False
    # Required file input counts as one required field.
    if await files.count():
        total_req += 1
        if attached: filled_req += 1
    return {"filled": filled, "resumeAttached": attached, "captcha": captcha, "customQuestions": custom_questions,
            "essayFree": custom_req == 0 and not captcha, "formConfidence": confidence(filled_req, total_req, custom_req, captcha)}
