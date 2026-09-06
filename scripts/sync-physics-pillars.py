"""Inline the shared Physics layout layer into the eight Biology pillar pages.

Run with --check to verify generated styles without writing. This deliberately
does not rebuild authored content, scripts, the app shell, or immersive worlds.
"""
import argparse
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PAGES = ("learn", "lessons", "reason", "labs", "solve", "explore", "me", "about")
START = "<!-- PHYSICS-PILLAR-LAYOUT:START -->"
END = "<!-- PHYSICS-PILLAR-LAYOUT:END -->"
FONT = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
        'family=Inter:wght@400..800&amp;family=Space+Grotesk:wght@300..700'
        '&amp;family=JetBrains+Mono:wght@400..600&amp;display=swap">')


def render(page):
    if page not in PAGES:
        raise ValueError("Only the eight pillar pages are layout targets")
    target = ROOT / f"{page}.html"
    original = target.read_bytes()
    newline = "\r\n" if b"\r\n" in original else "\n"
    text = original.decode("utf-8")
    css = (ROOT / "src/physics-layout/pillars.css").read_text(encoding="utf-8").rstrip("\n")
    if "</style" in css.lower():
        raise ValueError("The stylesheet must not close its containing HTML style element")
    block = newline.join((START, FONT, '<style id="physics-pillar-layout">',
                          css.replace("\n", newline), "</style>", END))
    starts, ends = text.count(START), text.count(END)
    if (starts, ends) == (0, 0):
        if text.count("</head>") != 1:
            raise ValueError(f"{page}: expected exactly one closing head")
        text = text.replace("</head>", block + newline + "</head>")
    elif (starts, ends) == (1, 1) and text.index(START) < text.index(END):
        pattern = re.compile(re.escape(START) + r"[\s\S]*?" + re.escape(END))
        text = pattern.sub(lambda match: block, text)
    else:
        raise ValueError(f"{page}: missing or ambiguous layout boundaries")
    return target, original, text.encode("utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify only; do not write")
    args = parser.parse_args()
    # Validate every source and target before changing any generated page.
    results = [render(page) for page in PAGES]
    stale = [target.name for target, before, after in results if before != after]
    if args.check:
        if stale:
            parser.exit(1, "Pillar layouts out of sync: " + ", ".join(stale) +
                        "\nRun python scripts/sync-physics-pillars.py\n")
        print("All eight pillar layouts match their shared stylesheet.")
        return
    for target, before, after in results:
        if before != after:
            target.write_bytes(after)
    print("Pillar layouts synced: " + (", ".join(stale) or "no changes"))


if __name__ == "__main__":
    main()
