"""Inline the Physics-matched app stylesheet without rebuilding Biology products."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
page = ROOT / "app.html"
css = (ROOT / "src/physics-layout/app.css").read_text(encoding="utf-8")
before = page.read_text(encoding="utf-8")
block = '<style id="physics-layout-css">\n' + css.rstrip() + '\n</style>'
pattern = re.compile(r'<style id="physics-layout-css">[\s\S]*?</style>')
if len(pattern.findall(before)) > 1:
    raise SystemExit("Ambiguous shell style slot")
after = pattern.sub(lambda _: block, before) if pattern.search(before) else before.replace("</head>", block + "\n</head>", 1)
if "--check" in sys.argv:
    if after != before:
        raise SystemExit("Run python scripts/sync-physics-shell.py")
    print("Physics shell stylesheet matches its source")
else:
    page.write_text(after, encoding="utf-8", newline="\n")
    print("Synced Biology shell layout")
