"""
Inline Sign in with Google (_auth.js) into every Biology Entelloq page.

Same contract as inject_atmo.py, and for the same reason: these pages ship as
self-contained single files, so the module has to live inside each one. Re-runnable
— it REPLACES the previous copy rather than stacking another.

The module is inert on a page with no [data-bioq-account] host, so injecting it
everywhere is safe: pages that should not show an account control simply do not,
and a page that grows one later needs no rebuild of anything but itself.

Usage:
    python inject_auth.py <file.html> [<file.html> ...]
    python inject_auth.py --all
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DOWNLOADS = os.path.join(os.path.expanduser("~"), "Downloads")

OPEN_TAG = '<script id="auth-js">'
CLOSE_TAG = "</script>"
BLOCK_RE = re.compile(re.escape(OPEN_TAG) + r".*?" + re.escape(CLOSE_TAG), re.S)

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


def source():
    src = open(os.path.join(HERE, "_auth.js"), encoding="utf-8").read()
    if "</script" in src.lower():
        raise SystemExit("_auth.js contains a literal </script> — escape it before inlining")
    return src


def inject(path, src):
    if not os.path.exists(path):
        return "missing"
    html = open(path, encoding="utf-8").read()
    block = OPEN_TAG + "\n" + src + "\n" + CLOSE_TAG
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
    src = source()
    if args == ["--all"]:
        targets = [os.path.join(r, n) for n in ALL for r in (HERE, DOWNLOADS)
                   if os.path.exists(os.path.join(r, n))]
    else:
        targets = args
    if not targets:
        raise SystemExit("nothing to do — pass files or --all")
    for p in targets:
        print("  %-10s %s" % (inject(p, src), p))
    print("  sign-in: %d bytes per page" % len(src))


main()
