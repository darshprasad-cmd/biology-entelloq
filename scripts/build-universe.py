"""Sync only approved Universe source slots, preserving offline imports and chrome.

The full assembler is deliberately not executed. --check never writes files.
"""
import argparse
import hashlib
import importlib.util
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MODULES = ("kit.js", "core.js", "stage_cosmic.js", "stage_molecular.js", "ui.js")


def slot_pattern(name):
    return re.compile(r"(^/\* ===== " + re.escape(name) + r" =+ \*/\r?\n)"
                      r"[\s\S]*?(?=^/\* ===== [\w.-]+ =+ \*/|^</script>)", re.M)


def shell(text):
    for name in MODULES:
        pattern = slot_pattern(name)
        if len(pattern.findall(text)) != 1:
            raise ValueError(f"Expected exactly one Universe slot: {name}")
        text = pattern.sub(lambda m: m[1] + "APPROVED UNIVERSE SOURCE SLOT\n", text)
    return text.replace("\r\n", "\n")


def render():
    spec = importlib.util.spec_from_file_location("universe_assembler", ROOT / "src/universe/assemble.py")
    assembler = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(assembler)
    raw = []
    for name in assembler.MODULES:
        source = (ROOT / "src/universe" / name).read_text(encoding="utf-8")
        source = assembler.IMPORT_RE.sub("", source)
        source = assembler.EXPORT_RE.sub("", source)
        raw.append((name, source))
    assembler.check_collisions(raw)
    target = ROOT / "universe.html"
    original = target.read_bytes()
    text = original.decode("utf-8")
    expected = (ROOT / "tests/fixtures/universe-shell.sha256").read_text().strip()
    if hashlib.sha256(shell(text).encode()).hexdigest() != expected:
        raise ValueError("Universe protected shell changed: import map, original modules and launcher must be preserved")
    newline = "\r\n" if b"\r\n" in original else "\n"
    for name in MODULES:
        source = dict(raw)[name].rstrip("\n").replace("\n", newline)
        text = slot_pattern(name).sub(lambda m: m[1] + source + newline * 3, text)
    return target, original, text.encode("utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    target, before, after = render()
    if args.check and before != after:
        parser.exit(1, "Universe sources are out of sync. Run python scripts/build-universe.py\n")
    if not args.check and before != after:
        target.write_bytes(after)
    print("Universe source slots in sync; offline imports and shared shell preserved.")


if __name__ == "__main__":
    main()
