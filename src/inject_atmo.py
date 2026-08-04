"""
Inline THE LIVING FIELD (_atmo.js) into every Biology Entelloq page.

These pages ship as self-contained single HTML files that people open straight
off the filesystem, so an external <script src> is not an option — the module has
to live inside each file. This script is the one place that inlining happens, and
it is re-runnable: it REPLACES the previous copy rather than stacking a new one,
so editing _atmo.js and re-running is the whole update loop.

Usage:
    python inject_atmo.py <file.html> [<file.html> ...]
    python inject_atmo.py --all          # every product page, source + shipped
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DOWNLOADS = os.path.join(os.path.expanduser("~"), "Downloads")

OPEN_TAG = '<script id="atmo-js">'
CLOSE_TAG = "</script>"
# Non-greedy up to the FIRST </script>, which is safe because the module contains
# no literal "</script>" of its own (verified below before writing).
BLOCK_RE = re.compile(re.escape(OPEN_TAG) + r".*?" + re.escape(CLOSE_TAG), re.S)

# Pages whose <body> carries no data-page get one, because the field takes its
# colour from that attribute and would otherwise fall back to the home green.
PAGE_KEY = {
    "Biology Entelloq - About.html": "about",
    "Biology Entelloq - Labs.html": "labs",
    "Biology Entelloq - Lessons.html": "learn",
    "Biology Entelloq - Reason.html": "solve",
}

# The app shell is authored as "… - App.html" here and ships as the bare
# "Biology Entelloq.html", so both names have to be covered or the source copy
# silently drifts behind whatever was last shipped.
ALL = [
    "Biology Entelloq - App.html",
    "Biology Entelloq.html",
    "Biology Entelloq - Learn.html",
    "Biology Entelloq - Solve.html",
    "Biology Entelloq - Explore.html",
    "Biology Entelloq - Me.html",
    "Biology Entelloq - Lessons.html",
    "Biology Entelloq - Labs.html",
    "Biology Entelloq - Reason.html",
    "Biology Entelloq - About.html",
]


def atmo_source():
    src = open(os.path.join(HERE, "_atmo.js"), encoding="utf-8").read()
    # A literal </script> anywhere inside would terminate the tag early and dump
    # the rest of the module into the page as text. Nothing in _atmo.js should
    # contain one, but assert it rather than discover it as a broken page.
    if "</script" in src.lower():
        raise SystemExit("_atmo.js contains a literal </script> — escape it before inlining")
    return src


def inject(path, src):
    if not os.path.exists(path):
        return "missing"
    html = open(path, encoding="utf-8").read()
    block = OPEN_TAG + "\n" + src + "\n" + CLOSE_TAG

    base = os.path.basename(path)
    key = PAGE_KEY.get(base)
    if key:
        # Operate on the REAL <body> tag — the first one — and test that same tag.
        # The earlier version searched the whole document for any "<body" lacking a
        # data-page (finding one inside a script string) and then substituted the
        # FIRST "<body" regardless, so it re-added the attribute on every run and
        # built up "<body data-page=... data-page=... data-page=...>". HTML keeps
        # the first attribute and drops the rest, so it half-worked and hid itself.
        m = re.search(r"<body\b[^>]*>", html)
        if m:
            tag = m.group(0)
            # Repair any duplicates a previous run left behind, then set it once.
            clean = re.sub(r'\s*data-page="[^"]*"', "", tag)
            fixed = clean.replace("<body", '<body data-page="%s"' % key, 1)
            if fixed != tag:
                html = html[:m.start()] + fixed + html[m.end():]

    if BLOCK_RE.search(html):
        html = BLOCK_RE.sub(lambda _m: block, html, count=1)
        how = "updated"
    elif "</body>" in html:
        html = html.replace("</body>", block + "\n</body>", 1)
        how = "injected"
    else:
        return "no </body>"

    open(path, "w", encoding="utf-8", newline="\n").write(html)
    return how


def main():
    args = sys.argv[1:]
    src = atmo_source()
    if args == ["--all"]:
        targets = []
        for name in ALL:
            for root in (HERE, DOWNLOADS):
                p = os.path.join(root, name)
                if os.path.exists(p):
                    targets.append(p)
    else:
        targets = args
    if not targets:
        raise SystemExit("nothing to do — pass files or --all")

    for p in targets:
        print("  %-10s %s" % (inject(p, src), p))
    print("  living field: %d bytes per page" % len(src))


main()
