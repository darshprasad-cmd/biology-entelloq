"""Synchronize additive learning-tool entries without rebuilding other source slots."""
import argparse
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SECTIONS = ("solve", "me", "learn", "reason", "labs", "explore")

def outputs(root=ROOT):
    for section in SECTIONS:
        path = root / (section + ".html")
        before = path.read_bytes()
        newline = "\r\n" if b"\r\n" in before else "\n"
        text = before.decode("utf-8")
        for kind, content, anchor in (
            ("CSS", '<link rel="stylesheet" href="src/learning-tools/host.css">', "</head>"),
            ("JS", '<script src="src/learning-tools/host.js" data-section="' + section + '"></script>', "<!-- __BIOQ_EMBED__ -->"),
        ):
            start, end = "<!-- LEARNING-TOOLS-" + kind + ":START -->", "<!-- LEARNING-TOOLS-" + kind + ":END -->"
            block = newline.join((start, content, end))
            if text.count(start) == text.count(end) == 1:
                text = re.sub(re.escape(start) + r"[\s\S]*?" + re.escape(end), lambda match: block, text)
            elif start not in text and end not in text and text.count(anchor) == 1:
                text = text.replace(anchor, block + newline + anchor, 1)
            else:
                raise ValueError("Missing or ambiguous learning-tools boundary in " + section)
        yield path, before, text.encode("utf-8")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for path, before, after in outputs():
        if args.check and before != after:
            parser.exit(1, "Learning-tool slots are stale: " + str(path) + "\n")
        if not args.check and before != after:
            path.write_bytes(after)
    print("Learning-tool entries are synchronized in six existing Biology sections.")
