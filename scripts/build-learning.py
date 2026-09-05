"""Sync only the two learning-page source slots; never rebuild shared chrome or labs.

Run without arguments to generate lessons.html and reason.html, or with --check
to verify they are in sync. All paths are fixed and relative to this script.
"""
import argparse
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PAGES = ("lessons", "reason")


def render(page):
    target = ROOT / f"{page}.html"
    original = target.read_bytes()
    newline = "\r\n" if b"\r\n" in original else "\n"
    text = original.decode("utf-8")
    for tag, extension in (("style", "css"), ("script", "js")):
        source = (ROOT / "src" / f"_{page}.{extension}").read_text(encoding="utf-8").rstrip("\n")
        source = source.replace("\n", newline)
        # A source slot starts on its own line; inline documentation contains
        # literal tag examples that must never be interpreted as real slots.
        pattern = re.compile(rf'^(<{tag} id="page-{extension}">)[\s\S]*?(</{tag}>)', re.MULTILINE)
        if len(pattern.findall(text)) != 1:
            raise ValueError(f"{page}: expected exactly one page-{extension} source slot")
        text = pattern.sub(lambda m: m[1] + newline + source + newline + m[2], text)
    return target, original, text.encode("utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify only; do not write files")
    args = parser.parse_args()
    # Validate every boundary before writing either generated file.
    results = [render(page) for page in PAGES]
    stale = [target.name for target, before, after in results if before != after]
    if args.check:
        if stale:
            parser.exit(1, "Out of sync: " + ", ".join(stale) + "\nRun python scripts/build-learning.py\n")
        print("Learning page source slots are in sync; shared chrome and lab are not build targets.")
        return
    for target, before, after in results:
        if before != after:
            target.write_bytes(after)
    print("Synced " + (", ".join(stale) or "no changes") + "; no other files touched.")


if __name__ == "__main__":
    main()
