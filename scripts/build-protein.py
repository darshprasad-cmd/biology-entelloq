"""Sync only Protein Atlas slots inside the existing Explore page."""
import argparse
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def render(root=ROOT):
    target = root / "explore.html"
    original = target.read_bytes()
    newline = "\r\n" if b"\r\n" in original else "\n"
    text = original.decode("utf-8")
    for kind, tag, anchor in (("css", "style", "</head>"), ("html", None, "  <!-- ===================== TREE OF LIFE ===================== -->"), ("js", "script", "<!-- __BIOQ_EMBED__ -->")):
        start, end = f"<!-- PROTEIN-ATLAS-{kind.upper()}:START -->", f"<!-- PROTEIN-ATLAS-{kind.upper()}:END -->"
        content = (root / f"src/protein/atlas.{kind}").read_text(encoding="utf-8").rstrip("\n")
        if tag and f"</{tag}" in content.lower():
            raise ValueError("Protein source must not close its own slot")
        body = f'<{tag} id="protein-atlas-{kind}">\n{content}\n</{tag}>' if tag else content
        block = (start + "\n" + body + "\n" + end).replace("\n", newline)
        if text.count(start) == text.count(end) == 1:
            text = re.sub(re.escape(start) + r"[\s\S]*?" + re.escape(end), lambda match: block, text)
        elif start not in text and end not in text and text.count(anchor) == 1:
            text = text.replace(anchor, block + newline + anchor, 1)
        else:
            raise ValueError("Missing or ambiguous Protein Atlas source boundary")
    return target, original, text.encode("utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    target, before, after = render()
    if args.check and before != after:
        parser.exit(1, "Protein Atlas is stale. Run python scripts/build-protein.py\n")
    if not args.check and before != after:
        target.write_bytes(after)
    print("Protein Atlas source slots are in sync; no other page is a build target.")


if __name__ == "__main__":
    main()
