"""
Build the Labs page.

Labs is the one pillar whose behaviour lives across several files: the shell and
registry in _labs.js, then one or more bench modules that self-register into it.
build_page.py takes a single -js argument, so the pieces are concatenated here
first — which is also the one place the ORDER is decided, and order is load-bearing:

  _labs.js        must come first (it defines LABS before anything registers)
  _lab_bench.js   next — it holds the canonical copy of the four benches whose ids
                  also appear in the modules below, and LABS.register is
                  first-wins, so being first is what keeps those copies shipping
  the rest        contribute the benches that exist nowhere else

Run:  python build_labs.py
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ORDER = ["_labs.js", "_lab_bench.js", "_lab_ecology.js", "_lab_molecular.js", "_lab_physiology.js"]
COMBINED = os.path.join(HERE, "_labs_all.js")
OUT = os.path.join(HERE, "Biology Entelloq - Labs.html")


def main():
    parts, seen = [], []
    for name in ORDER:
        p = os.path.join(HERE, name)
        if not os.path.exists(p):
            print("  ! missing %s" % name)
            continue
        src = open(p, encoding="utf-8").read()
        parts.append("/* ===== %s ===== */\n%s" % (name, src))
        ids = [ln.split('"')[1] for ln in src.splitlines() if 'LABS.register("' in ln]
        seen.append((name, ids))
        print("  %-22s %6.1f KB   %s" % (name, len(src) / 1024, " ".join(ids) or "-"))

    combined = "\n\n".join(parts)
    open(COMBINED, "w", encoding="utf-8", newline="\n").write(combined)

    # Report what actually ships, and what a duplicate id costs, so a silent
    # regression here is visible at build time rather than in the browser.
    shipped, dupes = [], []
    for _name, ids in seen:
        for i in ids:
            (dupes if i in shipped else shipped).append(i)
    print("\n  benches shipping (%d): %s" % (len(shipped), ", ".join(shipped)))
    if dupes:
        print("  duplicate ids suppressed (first-wins): %s" % ", ".join(sorted(set(dupes))))

    r = subprocess.run([sys.executable, os.path.join(HERE, "build_page.py"),
                        "labs", "labs", "Labs — Biology Entelloq",
                        "_labs_main.html", "_labs.css", "_labs_all.js", OUT], cwd=HERE)
    if r.returncode:
        raise SystemExit("build_page failed")
    for step in ("inject_embed.py", "inject_atmo.py"):
        subprocess.run([sys.executable, os.path.join(HERE, step), OUT], cwd=HERE)
    os.remove(COMBINED)
    print("\n  wrote %s (%.1f KB)" % (OUT, os.path.getsize(OUT) / 1024))


main()
