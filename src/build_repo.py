"""
Assemble the public Biology Entelloq repository.

The repo is BOTH the website and its source: GitHub Pages serves the root, and
src/ carries everything the pages were built from, so the thing that is deployed
can actually be rebuilt by whoever clones it.

    <repo>/
      index.html learn.html … universe.html   the site (from build_site.py)
      CNAME .nojekyll 404.html README.md .gitignore
      src/                                    the authoring sources

Usage:  python build_repo.py [repo_dir]      (default: ~/biology-entelloq-web)
"""
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REPO = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(
    os.path.expanduser("~"), "biology-entelloq-web")

SRC = os.path.join(REPO, "src")

# (source path, destination inside src/) — authoring sources only, no build output.
SOURCES = [
    ("product/_atmo.js",        "_atmo.js"),
    ("product/_auth.js",        "_auth.js"),
    ("product/inject_auth.py",  "inject_auth.py"),
    ("product/build_labs.py",   "build_labs.py"),
    ("product/_lessons.js",     "_lessons.js"),
    ("product/_lessons.css",    "_lessons.css"),
    ("product/_lessons_main.html", "_lessons_main.html"),
    ("product/_labs.js",        "_labs.js"),
    ("product/_labs.css",       "_labs.css"),
    ("product/_labs_main.html", "_labs_main.html"),
    ("product/_lab_bench.js",   "_lab_bench.js"),
    ("product/_lab_ecology.js", "_lab_ecology.js"),
    ("product/_lab_molecular.js", "_lab_molecular.js"),
    ("product/_lab_physiology.js", "_lab_physiology.js"),
    ("product/_reason.js",      "_reason.js"),
    ("product/_reason.css",     "_reason.css"),
    ("product/_reason_main.html", "_reason_main.html"),
    ("product/_template.html",  "_template.html"),
    ("product/build_page.py",   "build_page.py"),
    ("product/inject_embed.py", "inject_embed.py"),
    ("product/inject_atmo.py",  "inject_atmo.py"),
    ("product/build_site.py",   "build_site.py"),
    ("product/build_repo.py",   "build_repo.py"),
]

GITIGNORE = """\
# build output — the site at the repo root IS the build output and is committed,
# but nothing else transient should be
*.pyc
__pycache__/
.DS_Store
Thumbs.db
node_modules/
"""


def copy_tree(src, dst, skip=()):
    os.makedirs(dst, exist_ok=True)
    n = 0
    for name in sorted(os.listdir(src)):
        if name in skip or name.startswith("."):
            continue
        s, d = os.path.join(src, name), os.path.join(dst, name)
        if os.path.isdir(s):
            n += copy_tree(s, d, skip)
        else:
            shutil.copy2(s, d)
            n += 1
    return n


def main():
    # 1. the site itself, straight into the repo root
    print("building the site …")
    r = subprocess.run([sys.executable, os.path.join(HERE, "build_site.py"), REPO])
    if r.returncode != 0:
        print("\n  ! build_site reported missing pages — fix those before deploying")

    # 2. the authoring sources
    print("\ncopying sources …")
    if os.path.isdir(SRC):
        shutil.rmtree(SRC)
    os.makedirs(SRC)
    for rel, dest in SOURCES:
        s = os.path.join(ROOT, rel)
        if os.path.exists(s):
            shutil.copy2(s, os.path.join(SRC, dest))
        else:
            print("  ! missing source: " + rel)

    # The two immersive worlds are built by their own assemblers from their own
    # module trees; ship those whole so the worlds are rebuildable too. __pycache__
    # and the 670KB vendored three.js copy under universe are skipped — the lab's
    # copy is the one the docs point at.
    # human-*.js built the torso prosection, which was cut from the product. The
    # files stay on the authoring machine (recoverable) but are kept out of the
    # public repo: nothing assembles them, so in here they would be dead code that
    # reads as a feature. wf-*.js are spent build-workflow briefs, same reasoning.
    lab = copy_tree(os.path.join(ROOT, "_build"), os.path.join(SRC, "lab"),
                    skip={"__pycache__", "_check.mjs",
                          "human.js", "human-wall.js", "human-thorax.js",
                          "human-gi.js", "human-deep.js",
                          "wf-app.js", "wf-refine.js", "wf-accurate.js",
                          "wf-fidelity.js", "wf-presence.js"})
    uni = copy_tree(os.path.join(ROOT, "universe", "_build"), os.path.join(SRC, "universe"),
                    skip={"__pycache__", "vendor"})
    print("  lab modules: %d   universe modules: %d" % (lab, uni))

    # 3. repo furniture
    readme = os.path.join(HERE, "README_SITE.md")
    if os.path.exists(readme):
        shutil.copy2(readme, os.path.join(REPO, "README.md"))
    open(os.path.join(REPO, ".gitignore"), "w", encoding="utf-8", newline="\n").write(GITIGNORE)

    total = 0
    for dirpath, _dirs, files in os.walk(REPO):
        if ".git" in dirpath:
            continue
        for f in files:
            total += os.path.getsize(os.path.join(dirpath, f))
    print("\n  repo ready at %s  (%.1f MB)" % (REPO, total / 1048576))


main()
