"""
Re-apply the shared Entelloq ecosystem switcher to every Biology Entelloq page.

The switcher is one self-contained block — namespaced `eqx-` CSS, its own JS, no
dependency on the host page — that sits at the end of every product page and is
the only way across to Physics, Quant and the company site.

It exists as a script because it kept disappearing. Twice in one day the switcher
had to be restored by hand, both times for the same reason: a page was regenerated
from its parts by build_page.py, the fresh file was copied over the shipped one,
and the block — which lived nowhere but inside those shipped files — went with it.
A thing that is pasted into twelve files and owned by none of them will be lost
again, so _switcher.html is now the source and this puts it back.

Re-runnable and idempotent: it REPLACES an existing block rather than stacking a
second one, so editing _switcher.html and re-running is the whole update loop.
Run it last, after inject_atmo.py and inject_auth.py, so the block stays at the
end of <body> where its fixed-position launcher expects to be.

Usage:
    python inject_switcher.py <file.html> [<file.html> ...]
    python inject_switcher.py --all      # every product page, source + shipped
    python inject_switcher.py --check    # verify only; non-zero exit if any page
                                         # is missing the block or has drifted
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DOWNLOADS = os.path.join(os.path.expanduser("~"), "Downloads")

START = "<!-- ENTELLOQ-ECOSYSTEM-SWITCHER:START -->"
END = "<!-- ENTELLOQ-ECOSYSTEM-SWITCHER:END -->"
BLOCK_RE = re.compile(re.escape(START) + r".*?" + re.escape(END), re.S)

# The app shell is authored as "… - App.html" and ships as the bare
# "Biology Entelloq.html"; the Lab and the Universe are assembled by their own
# scripts into Downloads only. Cover every name or a copy silently drifts behind.
ALL = [
    "Biology Entelloq - App.html",
    "Biology Entelloq.html",
    "Biology Entelloq - Launch.html",
    "Biology Entelloq - Learn.html",
    "Biology Entelloq - Lessons.html",
    "Biology Entelloq - Reason.html",
    "Biology Entelloq - Labs.html",
    "Biology Entelloq - Solve.html",
    "Biology Entelloq - Explore.html",
    "Biology Entelloq - Me.html",
    "Biology Entelloq - About.html",
    "Biology Entelloq - Dissection Lab.html",
    "Biology Universe.html",
]


def switcher_source():
    path = os.path.join(HERE, "_switcher.html")
    if not os.path.exists(path):
        raise SystemExit("_switcher.html is missing — it is the source, nothing can be injected")
    src = open(path, encoding="utf-8").read().strip()
    if not src.startswith(START) or not src.endswith(END):
        raise SystemExit("_switcher.html must start with the START marker and end with the END marker")
    return src


def inject(path, src, check=False):
    if not os.path.exists(path):
        return "missing"
    html = open(path, encoding="utf-8").read()
    found = BLOCK_RE.search(html)

    if check:
        if not found:
            return "ABSENT"
        return "ok" if found.group(0) == src else "DRIFTED"

    if found:
        if found.group(0) == src:
            return "current"
        html = BLOCK_RE.sub(lambda _m: src, html, count=1)
        how = "updated"
    elif "</body>" in html:
        # Last thing before </body>: the launcher is position:fixed, so where it
        # sits in the source does not affect layout, but keeping it last keeps it
        # above the page's own stacking contexts without a z-index arms race.
        html = html.replace("</body>", src + "\n</body>", 1)
        how = "restored"
    else:
        return "no </body>"

    open(path, "w", encoding="utf-8", newline="\n").write(html)
    return how


def main():
    args = sys.argv[1:]
    check = "--check" in args
    args = [a for a in args if a != "--check"]
    src = switcher_source()

    if not args or args == ["--all"]:
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

    bad = 0
    for p in targets:
        how = inject(p, src, check)
        if how in ("ABSENT", "DRIFTED", "no </body>"):
            bad += 1
        print("  %-9s %s" % (how, p))
    print("  switcher: %d bytes per page, %d page(s)" % (len(src), len(targets)))
    if bad:
        print("\n  ! %d page(s) do not carry the current switcher" % bad)
    return 1 if bad and check else 0


sys.exit(main())
