"""Build only the public lab.html from repository sources, without Downloads.

The existing lab's post-module integration tail is preserved byte-for-byte
apart from newline normalization. This includes its ecosystem switcher and any
lab-specific embedding additions. No other public page is read for rebuilding
or written. Known feature-tutorial head includes are also retained when present.
Run --check to verify generated-output drift without writing.
"""

from __future__ import annotations

import argparse
import base64
import importlib.util
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
LAB = ROOT / "lab.html"
SOURCE = ROOT / "src" / "lab"
IMPORT_MAP = re.compile(r'<script type="importmap">\s*(\{.*?\})\s*</script>', re.S)
MODULE_SCRIPT = re.compile(r'<script type="module">.*?</script>', re.S)
SWITCHER_START = "<!-- ENTELLOQ-ECOSYSTEM-SWITCHER:START -->"
SWITCHER_END = "<!-- ENTELLOQ-ECOSYSTEM-SWITCHER:END -->"
TUTORIAL_HEAD_TAGS = (
    '<link rel="stylesheet" href="assets/feature-tutorials.css">',
    '<script defer src="assets/feature-tutorials.js" data-app="biology"></script>',
)


def load_assembler():
    spec = importlib.util.spec_from_file_location("frog_lab_assembler", SOURCE / "assemble.py")
    if spec is None or spec.loader is None:
        raise RuntimeError("Cannot load the lab assembler")
    assembler = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(assembler)
    return assembler


def integration_tail(existing: str) -> str:
    scripts = list(MODULE_SCRIPT.finditer(existing))
    if len(scripts) != 1:
        raise ValueError("Expected one application module in current lab.html; refusing to discard integrations")
    body_end = existing.rfind("</body>")
    if body_end < scripts[0].end():
        raise ValueError("Current lab.html has no closing body after its module")
    tail = existing[scripts[0].end():body_end]
    if tail.count(SWITCHER_START) != 1 or tail.count(SWITCHER_END) != 1:
        raise ValueError("Expected exactly one existing ecosystem switcher in the lab integration tail")
    return tail


def data_module(path: Path) -> str:
    # Git may check JavaScript out with CRLF on Windows and LF in CI. Normalize
    # line endings before encoding so the data URI is identical on both hosts.
    # Work in bytes: preserve every other byte, including vendor license notices,
    # Unicode, and any BOM, without parsing or rewriting third-party code.
    source = path.read_bytes().replace(b"\r\n", b"\n").replace(b"\r", b"\n")
    return "data:text/javascript;base64," + base64.b64encode(source).decode("ascii")


def preserve_head_integrations(existing: str, generated: str) -> str:
    """Keep the explicit upstream tutorial integrations, never arbitrary scripts."""
    head_end = existing.find("</head>")
    existing_head = existing[:head_end] if head_end >= 0 else ""
    retained = []
    for tag in TUTORIAL_HEAD_TAGS:
        count = existing_head.count(tag)
        if count > 1:
            raise ValueError("Duplicate feature tutorial include in current lab head")
        if count == 1:
            if generated.count(tag) > 1:
                raise ValueError("Duplicate feature tutorial include in assembler template")
            if tag not in generated:
                retained.append(tag)
    if retained:
        if generated.count("</head>") != 1:
            raise ValueError("Assembler template lacks its unique closing head")
        generated = generated.replace("</head>", "\n".join(retained) + "\n</head>", 1)
    return generated


def assemble_html(existing: str) -> str:
    assembler = load_assembler()
    sources = [(name, assembler.load(name)) for name in assembler.MODULES]
    assembler.check_collisions([(name, source) for name, source in sources if source])
    for name, source in sources:
        if name == "shell.js" and source:
            assembler.check_shell_css(source)
    bodies = [
        "\n/* ===== %s %s */\n%s" % (name, "=" * (58 - len(name)), source)
        for name, source in sources
    ]
    html = assembler.TEMPLATE.replace("/*__MODULES__*/", "\n".join(bodies))
    html = html.replace(
        "/*__CSSINJECT__*/",
        "document.getElementById('shellcss').textContent = SHELL_CSS;"
        if any("SHELL_CSS" in body for body in bodies) else "",
    )

    map_match = IMPORT_MAP.search(existing)
    if map_match is None:
        raise ValueError("Current lab.html lacks its import map")
    imports = json.loads(map_match.group(1))["imports"]
    imports["three"] = data_module(SOURCE / "vendor" / "three.module.min.js")
    imports["three/addons/controls/OrbitControls.js"] = data_module(SOURCE / "vendor" / "OrbitControls.js")
    new_map = '<script type="importmap">\n' + json.dumps({"imports": imports}, ensure_ascii=False, separators=(",", ":")) + "\n</script>"
    html, replacements = IMPORT_MAP.subn(lambda _match: new_map, html, count=1)
    if replacements != 1:
        raise ValueError("Assembler template lacks its expected import map")

    built_module = MODULE_SCRIPT.search(html)
    if built_module is None:
        raise ValueError("Assembler output lacks its application module")
    body_end = html.rfind("</body>")
    html = html[:built_module.end()] + integration_tail(existing) + html[body_end:]
    html = preserve_head_integrations(existing, html)
    if "/*__MODULES__*/" in html or "/*__CSSINJECT__*/" in html:
        raise ValueError("Unexpanded assembly marker")
    if html.count(SWITCHER_START) != 1 or html.count(SWITCHER_END) != 1:
        raise ValueError("Ecosystem switcher was duplicated or dropped")
    return html


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Compare output without writing any public file")
    args = parser.parse_args()
    if not LAB.is_file():
        parser.error("lab.html must exist so its current shell integrations can be preserved")
    existing = LAB.read_text(encoding="utf-8")
    generated = assemble_html(existing)
    if args.check:
        if generated != existing:
            print("lab.html differs from current repository modules; run python scripts/build-frog-lab.py")
            return 1
        print("lab.html is current; vendored renderer and existing integrations preserved")
        return 0
    if generated == existing:
        print("lab.html already current")
        return 0
    # The only public output target is a literal repository-relative lab.html.
    LAB.write_text(generated, encoding="utf-8", newline="\n")
    print("Built lab.html (%s bytes); no other public files changed" % len(generated.encode("utf-8")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
