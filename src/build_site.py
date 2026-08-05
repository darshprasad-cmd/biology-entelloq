"""
Build the deployable website for biology.entelloq.com out of the shipped
single-file products.

The products are authored to be opened straight off the filesystem, so they are
named for humans ("Biology Entelloq - Dissection Lab.html") and link to each
other by those names. That is right for a file you double-click and wrong for a
URL — nobody wants biology.entelloq.com/Biology%20Entelloq%20-%20Learn.html.

So this does not rename the source. It copies each product to a slug, rewrites
every internal link to match, and leaves the originals untouched — one source,
two artifacts. Re-runnable: it wipes and rebuilds the output directory.

Usage: python build_site.py [outdir]        (default: ../site)
"""
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(os.path.expanduser("~"), "Downloads")
OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, "site")

DOMAIN = "biology.entelloq.com"

# source filename -> URL slug
PAGES = {
    # The front door is the root. The app shell moved to /app.html when the launch
    # page was added — every internal link to it is rewritten from this one map, so
    # nothing else in the product has to know the URL changed.
    "Biology Entelloq - Launch.html":          "index.html",
    "Biology Entelloq.html":                  "app.html",
    "Biology Entelloq - Learn.html":           "learn.html",
    "Biology Entelloq - Lessons.html":         "lessons.html",
    "Biology Entelloq - Reason.html":          "reason.html",
    "Biology Entelloq - Labs.html":            "labs.html",
    "Biology Entelloq - Solve.html":           "solve.html",
    "Biology Entelloq - Explore.html":         "explore.html",
    "Biology Entelloq - Me.html":              "me.html",
    "Biology Entelloq - About.html":           "about.html",
    "Biology Entelloq - Dissection Lab.html":  "lab.html",
    "Biology Universe.html":                   "universe.html",
}


def rewrite_links(html):
    """
    Point every internal link at its slug. Longest source name first, so
    "Biology Entelloq - Learn.html" is never half-matched by the shorter
    "Biology Entelloq.html" sitting inside it.
    """
    for name in sorted(PAGES, key=len, reverse=True):
        slug = PAGES[name]
        for variant in (name, name.replace(" ", "%20")):
            html = html.replace("./" + variant, "./" + slug)
            html = html.replace('"' + variant, '"' + slug)
            html = html.replace("'" + variant, "'" + slug)
    return html


def fix_embed_guard(html):
    """
    The shell intercepts clicks on links to other Biology Entelloq pages and routes
    them up to the parent instead of navigating the iframe. It recognises them by
    the words in the FILENAME — which the slugging above has just removed, so
    without this every in-section link would blow the iframe out of the app shell.
    Re-point the test at the slug set.
    """
    old = r"/(Biology Entelloq|Biology Universe)/i.test(h)"
    new = r"/^\.?\/?(index|app|learn|lessons|reason|labs|solve|explore|me|about|lab|universe)\.html/i.test(h.replace(/^\.\//,''))"
    if old in html:
        html = html.replace(old, new)

    # The shell recognises links to ITSELF with a regex literal, where the dot is
    # escaped: /Biology Entelloq\.html#(.+)$/. The backslash means the plain-string
    # rewrite above sails straight past it, so the regex would still be hunting for
    # a filename that no longer exists on the site and EVERY shell deep-link
    # ("./index.html#explore/graph") would be a dead click. Rewrite the escaped
    # form too.
    html = html.replace(r"Biology Entelloq\.html", r"app\.html")
    return html


def main():
    # Remove only what THIS script generates. Emphatically not shutil.rmtree(OUT):
    # the output directory is also the git repository, so wiping it would delete
    # .git and take the whole history with it — and on Windows it fails outright
    # the moment any process has the directory open.
    os.makedirs(OUT, exist_ok=True)
    for stale in list(PAGES.values()) + ["CNAME", ".nojekyll", "404.html"]:
        p = os.path.join(OUT, stale)
        if os.path.isfile(p):
            os.remove(p)

    missing, built = [], 0
    for name, slug in PAGES.items():
        src = os.path.join(SRC, name)
        if not os.path.exists(src):
            missing.append(name)
            continue
        html = open(src, encoding="utf-8").read()
        html = fix_embed_guard(rewrite_links(html))
        open(os.path.join(OUT, slug), "w", encoding="utf-8", newline="\n").write(html)
        built += 1
        print("  %-14s <- %s  (%.0f KB)" % (slug, name, len(html.encode("utf-8")) / 1024))

    # GitHub Pages: the custom domain, and .nojekyll so nothing is filtered by the
    # Jekyll pipeline (which skips files it does not recognise).
    open(os.path.join(OUT, "CNAME"), "w", encoding="utf-8", newline="\n").write(DOMAIN + "\n")
    open(os.path.join(OUT, ".nojekyll"), "w", encoding="utf-8", newline="\n").write("")

    # The social card has to be a real fetchable file — a scraper cannot read a
    # data: URI out of <meta property="og:image">, so this one image is the sole
    # exception to everything else being inlined.
    og = os.path.join(SRC, "bioq-og.jpg")
    if os.path.exists(og):
        shutil.copy2(og, os.path.join(OUT, "bioq-og.jpg"))
        print("  bioq-og.jpg    <- social card")

    # A 404 that keeps people inside the product rather than on a GitHub page.
    open(os.path.join(OUT, "404.html"), "w", encoding="utf-8", newline="\n").write(
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        "<title>Not found — Biology Entelloq</title>"
        "<style>html,body{height:100%;margin:0}body{background:#04070a;color:#eaf2f5;"
        'font:16px/1.6 system-ui,sans-serif;display:grid;place-items:center;text-align:center;padding:24px}'
        "h1{font-size:2rem;letter-spacing:-.03em;margin:0 0 10px}p{color:#9fb2bc;margin:0 0 22px}"
        "a{color:#34d399;text-decoration:none;border:1px solid rgba(52,211,153,.35);"
        "border-radius:999px;padding:10px 20px;display:inline-block}</style></head><body><div>"
        "<h1>Nothing lives here.</h1><p>That page is not part of Biology Entelloq.</p>"
        '<a href="/">Back to the front door</a></div></body></html>'
    )

    if missing:
        print("\n  ! missing from %s:" % SRC)
        for m in missing:
            print("      " + m)
    print("\n  %d pages -> %s" % (built, OUT))
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print("  total %.1f MB" % (total / 1048576))
    return 0 if not missing else 1


sys.exit(main())
