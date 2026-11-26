"""Pure, dependency-free helpers: link cleaning, hard pre-filter, and the anti-hallucination checks. Unit tested in test_worker.py."""
import re
from urllib.parse import urlparse

URL_RE = re.compile(r"https://[^\s<>\"'\)\]]+", re.I)
JUNK_HOST = re.compile(r"(^|\.)(facebook|twitter|x|instagram|linkedin|youtube|tiktok|pinterest|t\.me|whatsapp)\.(com|me)$|(^|\.)(list-manage|mailchimp|sendgrid|mandrillapp|mailgun|click\.|links?\.|track|trk|email\.|e\.)", re.I)
JUNK_PATH = re.compile(r"unsubscribe|optout|opt-out|preferences|privacy|terms|manage[-_]?subscription|view[-_]?in[-_]?browser|/share|/pixel|\.(png|jpe?g|gif|svg|webp|css|js)(\?|$)", re.I)
JOB_RE = re.compile(r"application received|your application|interview|job alert|we.re hiring|new jobs? for you|recruiter", re.I)
NEWS_RE = re.compile(r"newsletter|weekly digest|webinar|\bsale\b|% off|discount|limited time|deal of", re.I)
# A link is a candidate only if it plausibly points at a credential page.
KEEP_HINT = re.compile(r"cert|credential|badge|verify|validate|achievement|award|diploma|record|accredible|credly|coursera|udemy|nptel|swayam|digitalprofile|openbadge", re.I)


def clean_links(urls):
    seen, out = set(), []
    for u in urls:
        u = u.rstrip(".,;:!?")
        try:
            p = urlparse(u)
        except ValueError:
            continue
        if p.scheme != "https" or not p.hostname or JUNK_HOST.search(p.hostname) or JUNK_PATH.search(p.path + ("?" + p.query if p.query else "")):
            continue
        key = u.split("#")[0]
        if key not in seen:
            seen.add(key)
            out.append(key)
    return out[:30]


def candidate_links(links):
    """Prefer links that look like credential pages; keep the rest only if nothing else exists."""
    hinted = [l for l in links if KEEP_HINT.search(l)]
    return hinted or links


def hard_prefilter(subject, body, links, has_pdf):
    """Returns a reason to ignore the email (zero LLM cost), or None to continue."""
    if not has_pdf and not links:
        return "no PDF and no usable link"
    if JOB_RE.search(subject or ""):
        return "job-application email"
    if NEWS_RE.search(subject or "") and not has_pdf and not any(KEEP_HINT.search(l) for l in links):
        return "marketing / newsletter"
    return None


def credential_in_text(cred, text):
    """A credential id is kept only if it appears verbatim in the source text. Otherwise it is null."""
    if not cred or str(cred).strip().lower() in {"null", "none", "n/a", ""}:
        return None
    c = str(cred).strip()
    return c if c.lower() in (text or "").lower() else None


MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]


def date_in_text(iso, text):
    """An issue date is kept only when its year and month are visible in the source text (any common spelling)."""
    if not iso or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", iso):
        return None
    y, m, d = iso.split("-")
    t = (text or "").lower()
    mi = int(m)
    month_ok = MONTHS[mi - 1] in t or MONTHS[mi - 1][:3] in t or re.search(rf"\b0?{mi}[/.-]", t) or re.search(rf"[/.-]0?{mi}[/.-]", t) or iso in t
    return iso if y in t and month_ok else None


def url_allowed(url, candidates):
    """The verification URL must be one of the links actually present in the email. The model may not invent one."""
    return url if url and url in set(candidates) else None


def looks_like_login_wall(text, status=200):
    if status in (401, 403, 429):
        return True
    t = (text or "")[:4000].lower()
    return len(t.strip()) < 80 or bool(re.search(r"sign in to continue|log in to continue|please (sign|log) in|enable javascript|access denied|captcha|just a moment", t))
