"""Sync explicitly approved dissection source slots without rebuilding site chrome.

Preserves the existing offline import map, tutorials, shared assets and launcher.
No Downloads dependency. Use --check for a non-mutating CI check.
"""
import argparse
import importlib.util
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MODULES = ("anatomy.js", "frog.js", "heart.js", "fish.js",
           "cockroach.js", "dissect.js", "env.js", "shell.js", "main.js")
STARTUP = "// Module-scoped bindings are invisible to an injected eval"


def slot_pattern(name):
    return re.compile(r"(^/\* ===== " + re.escape(name) + r" =+ \*/\r?\n)"
                      r"[\s\S]*?(?=^/\* ===== [\w.-]+ =+ \*/|^" + re.escape(STARTUP) + r")", re.M)


def render():
    spec = importlib.util.spec_from_file_location("lab_assembler", ROOT / "src/lab/assemble.py")
    assembler = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(assembler)
    # Use the assembler's exact transforms, with explicitly closed file reads.
    raw = []
    for name in assembler.MODULES:
        source = (ROOT / "src/lab" / name).read_text(encoding="utf-8")
        source = assembler.IMPORT_RE.sub("", source)
        source = assembler.EXPORT_BLOCK_RE.sub("", source)
        source = assembler.EXPORT_RE.sub("", source)
        raw.append((name, source))
    assembler.check_collisions(raw)
    assembler.check_shell_css(dict(raw)["shell.js"])
    target = ROOT / "lab.html"
    original = target.read_bytes()
    newline = "\r\n" if b"\r\n" in original else "\n"
    text = original.decode("utf-8")
    for name in MODULES:
        pattern = slot_pattern(name)
        if len(pattern.findall(text)) != 1:
            raise ValueError(f"Expected exactly one dissection slot: {name}")
        source = dict(raw)[name].rstrip("\n").replace("\n", newline)
        text = pattern.sub(lambda m: m[1] + source + newline * 3, text)
    return target, original, text.encode("utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    target, before, after = render()
    if args.check and before != after:
        parser.exit(1, "Dissection sources are out of sync. Run python scripts/build-dissection.py\n")
    if not args.check and before != after:
        target.write_bytes(after)
    print("Dissection source slots in sync; shared page shell preserved.")


if __name__ == "__main__":
    main()
