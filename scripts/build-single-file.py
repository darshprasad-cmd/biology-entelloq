"""Package the authored Biology site into one independently portable application.

Source pages remain the authoring format. The generated manifest carries every
local runtime dependency; only optional online services retain network URLs.
"""
from __future__ import annotations

import argparse
import base64
import gzip
import html
import io
import json
import re
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PREFIX = "https://biology.entelloq.com/__single__/"
PAGES = ("index.html", "app.html", "learn.html", "lessons.html", "reason.html",
         "labs.html", "solve.html", "explore.html", "me.html", "about.html",
         "lab.html", "universe.html")
MODULES = ("src/lab/prepared-loader.js", "src/lab/specimen-assets.js",
           "src/lab/vendor/loaders/GLTFLoader.js",
           "src/lab/vendor/utils/BufferGeometryUtils.js")
EXTRA_ASSETS = ("assets/specimens/frog.glb", "assets/specimens/cockroach.glb",
                "assets/specimens/FROG-ATTRIBUTION.md",
                "assets/specimens/COCKROACH-ATTRIBUTION.md",
                "src/lab/vendor/THREE-LICENSE.txt", "favicon.png", "bioq-og.jpg")
MIME = {".js": "text/javascript", ".css": "text/css", ".png": "image/png",
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
        ".svg": "image/svg+xml", ".gif": "image/gif", ".glb": "model/gltf-binary",
        ".md": "text/plain", ".txt": "text/plain", ".json": "application/json",
        ".woff": "font/woff", ".woff2": "font/woff2", ".mp4": "video/mp4"}
BLOCKS = re.compile(r"<!--[\s\S]*?-->|<style\b[^>]*>[\s\S]*?</style\s*>|"
                    r"<script\b(?P<attrs>[^>]*)>(?P<body>[\s\S]*?)</script\s*>", re.I)
ATTRS = re.compile(r"(?P<name>[-\w:]+)\s*=\s*(?P<q>['\"])(?P<value>[\s\S]*?)(?P=q)")
TAGS = re.compile(r"<(?P<tag>[a-z][\w:-]*)\b(?P<attrs>[^>]*)>", re.I)
PATH_LITERALS = re.compile(r"(?P<q>['\"`])(?P<path>(?:\./|/)?(?:assets|src)/"
                           r"[a-zA-Z0-9_./ -]+\.(?:js|css|glb|webp|png|jpg|jpeg|gif|svg|md|txt|woff2?|mp4))(?P=q)")
IMPORTS = re.compile(r"\b(?:from\s*|import\s*\(\s*|import\s*)(?P<q>['\"])(?P<path>[^'\"\r\n]+)(?P=q)")
IDENTIFIER = re.compile(r"[\w$]+")


def packed(data: bytes) -> str:
    """Stable across runs, with neither timestamps nor original filenames."""
    buffer = io.BytesIO()
    # GzipFile writes the portable OS marker (255). gzip.compress on some
    # Python releases delegates to zlib and records the build machine's OS.
    with gzip.GzipFile(filename="", mode="wb", fileobj=buffer, compresslevel=9, mtime=0) as stream:
        stream.write(data)
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def attributes(source: str) -> dict[str, str]:
    return {m["name"].lower(): html.unescape(m["value"]) for m in ATTRS.finditer(source)}


def code_mask(source: str) -> str:
    """Hide JS strings/comments while retaining code inside template expressions.

    This is a lexical mask, not a JavaScript reformatter. Original spelling,
    comments, regular expressions and embedded HTML strings are kept verbatim.
    """
    out = list(source)
    size = len(source)

    def hide(start: int, end: int) -> None:
        for j in range(start, end):
            if out[j] not in "\r\n":
                out[j] = " "

    def scan(i: int, in_expression: bool = False) -> int:
        depth = 0
        previous = ""
        parens = []
        while i < size:
            ch = source[i]
            if ch in "'\"":
                start, quote = i, ch
                i += 1
                while i < size:
                    if source[i] == "\\":
                        i += 2
                    elif source[i] == quote:
                        i += 1
                        break
                    else:
                        i += 1
                hide(start, min(i, size)); previous = "value"; continue
            if ch == "`":
                hide(i, i + 1); i += 1
                while i < size:
                    if source[i] == "\\":
                        hide(i, min(i + 2, size)); i += 2
                    elif source[i] == "`":
                        hide(i, i + 1); i += 1; break
                    elif source.startswith("${", i):
                        hide(i, i + 2); i = scan(i + 2, True)
                    else:
                        hide(i, i + 1); i += 1
                previous = "value"; continue
            if source.startswith("//", i):
                end = source.find("\n", i)
                if end < 0: end = size
                hide(i, end); i = end; continue
            if source.startswith("/*", i):
                end = source.find("*/", i + 2)
                end = size if end < 0 else end + 2
                hide(i, end); i = end; continue
            # A slash after an expression-opening token begins a regexp.
            if ch == "/" and previous in ("", "(", "[", "{", "=", ":", ",", ";", "!", "?",
                    "&", "|", "+", "-", "*", "%", "^", "~", "<", ">", "/", "=>", "control-close",
                    "return", "case", "throw", "yield", "await", "void", "typeof", "delete", "in", "instanceof", "else", "do"):
                start = i; i += 1; in_class = False
                while i < size and source[i] not in "\r\n":
                    if source[i] == "\\": i += 2; continue
                    if source[i] == "[": in_class = True
                    elif source[i] == "]": in_class = False
                    elif source[i] == "/" and not in_class:
                        i += 1
                        while i < size and source[i].isalpha(): i += 1
                        break
                    i += 1
                hide(start, min(i, size)); previous = "value"; continue
            if source.startswith(("++", "--"), i):
                previous = "value"; i += 2; continue
            if source.startswith("=>", i):
                previous = "=>"; i += 2; continue
            if ch == "(":
                parens.append(previous in ("if", "while", "for", "with", "switch", "catch"))
            elif ch == ")":
                previous = "control-close" if parens and parens.pop() else ")"
                i += 1; continue
            if ch == "{" : depth += 1
            elif ch == "}":
                if in_expression and depth == 0:
                    hide(i, i + 1); return i + 1
                depth -= 1
            if ch.isalpha() or ch in "_$":
                match = IDENTIFIER.match(source, i)
                previous = match.group(0); i += len(previous); continue
            if not ch.isspace(): previous = ch
            i += 1
        return i

    scan(0)
    return "".join(out)


def transform_js(source: str) -> str:
    mask = code_mask(source)
    edits: list[tuple[int, int, str]] = []
    location = re.compile(r"(?<![\w$.])(?:(?:window|globalThis|root|win|doc\s*\.\s*defaultView)\s*\.\s*)?location\b")
    for match in location.finditer(mask):
        # An object-literal property named location is data, not the browser API.
        if re.match(r"\s*:", mask[match.end():]):
            continue
        old = source[match.start():match.end()]
        replacement = re.sub(r"location$", "BioqLocation", old) if "." in old else "window.BioqLocation"
        edits.append((match.start(), match.end(), replacement))
    history = re.compile(r"(?<![\w$.])(?:window\s*\.\s*)?history(?=\s*\.\s*(?:pushState|replaceState|back|forward|go)\s*\()")
    edits += [(m.start(), m.end(), "window.BioqHistory") for m in history.finditer(mask)]
    for start, end, value in sorted(edits, reverse=True):
        source = source[:start] + value + source[end:]
    # Embedded file documents retain a null origin. Source-window validation
    # still authenticates the package's existing parent/child message bridges.
    mask = code_mask(source)
    guards = re.compile(r"(?P<origin>(?:window|globalThis|root|win|doc\s*\.\s*defaultView)\s*\.\s*BioqLocation\s*\.\s*origin)\s*(?P<op>===|!==)\s*(['\"])null\3")
    edits = []
    for match in guards.finditer(source):
        if not mask[match.start():match.start() + 3].strip():
            continue
        suffix = " && !window.BioqPackage" if match["op"] == "===" else " || !!window.BioqPackage"
        edits.append((match.start(), match.end(), "(" + match.group(0) + suffix + ")"))
    for match in re.finditer(r"\bpostMessage\s*\(", mask):
        depth, comma, end = 1, None, match.end()
        while end < len(mask) and depth:
            ch = mask[end]
            if ch in "([{": depth += 1
            elif ch in ")]}": depth -= 1
            elif ch == "," and depth == 1: comma = end
            end += 1
        if depth or comma is None:
            continue
        argument = source[comma + 1:end - 1].strip()
        if re.fullmatch(r"(?:window|globalThis|root|win|doc\s*\.\s*defaultView)\s*\.\s*BioqLocation\s*\.\s*origin", argument):
            edits.append((comma + 1, end - 1, " (" + argument + " === 'null' ? '*' : " + argument + ")"))
    for start, end, value in sorted(edits, reverse=True):
        source = source[:start] + value + source[end:]
    return source


class Package:
    def __init__(self, root: Path = ROOT):
        self.root = Path(root).resolve()
        self.assets: dict[str, dict[str, str]] = {}
        self.processing: set[str] = set()

    def local(self, value: str, owner: str, *, required: bool = True) -> str | None:
        value = html.unescape(value).strip()
        if not value or value.startswith(("#", "//")) or "${" in value:
            return None
        url = urlsplit(value)
        if url.scheme:
            return None
        raw = unquote(url.path)
        if not raw:
            return None
        path = self.root / raw.lstrip("/") if raw.startswith("/") else self.root / PurePosixPath(owner).parent / raw
        resolved = path.resolve()
        if not resolved.is_relative_to(self.root):
            raise ValueError(f"Local dependency escapes repository: {owner}: {value}")
        name = resolved.relative_to(self.root).as_posix()
        if required and not resolved.is_file():
            raise ValueError(f"Missing local dependency: {owner}: {value}")
        return name

    def imports(self, source: str, owner: str) -> str:
        mask = code_mask(source)
        def change(match: re.Match) -> str:
            if mask[match.start():match.start() + 4].strip() == "":
                return match.group(0)
            specifier = match["path"]
            if not specifier.startswith(("./", "../", "/")):
                return match.group(0)
            name = self.local(specifier, owner)
            self.add(name)
            return match.group(0).replace(specifier, PREFIX + name, 1)
        return IMPORTS.sub(change, source)

    def discover_literals(self, source: str, owner: str) -> None:
        for match in PATH_LITERALS.finditer(source):
            name = self.local(match["path"], owner)
            if name not in PAGES:
                self.add(name)

    def css(self, source: str, owner: str) -> str:
        def change(match: re.Match) -> str:
            value = match["url"].strip().strip("'\"")
            name = self.local(value, owner)
            if name:
                self.add(name)
                return "url('./" + name + "')"
            return match.group(0)
        return re.sub(r"url\(\s*(?P<url>[^)]+)\s*\)", change, source, flags=re.I)

    def add(self, name: str | None) -> None:
        if not name or name in self.assets or name in self.processing or name in PAGES:
            return
        path = self.root / name
        if not path.is_file():
            raise ValueError(f"Missing local dependency: {name}")
        self.processing.add(name)
        suffix = path.suffix.lower()
        data = path.read_bytes()
        if suffix in (".js", ".css", ".md", ".txt", ".json", ".svg"):
            data = data.replace(b"\r\n", b"\n").replace(b"\r", b"\n")
        if suffix == ".js":
            source = data.decode("utf-8")
            self.discover_literals(source, name)
            if name == "src/lab/prepared-loader.js":
                needle = "pageURL = () => globalThis.location.href"
                if source.count(needle) != 1:
                    raise ValueError("Prepared loader pageURL contract changed")
                source = source.replace(needle, "pageURL = () => 'https://biology.entelloq.com/lab.html'", 1)
            source = self.imports(transform_js(source), name)
            data = source.encode("utf-8")
        elif suffix == ".css":
            data = self.css(data.decode("utf-8"), name).encode("utf-8")
        self.assets[name] = {"type": MIME.get(suffix, "application/octet-stream"), "data": packed(data)}
        self.processing.remove(name)

    def document(self, name: str) -> str:
        source = (self.root / name).read_text(encoding="utf-8")
        if name == "app.html":
            immersive_routes = (
                ('function openLaunch(k,{push=true}={}){', 'function openLaunch(k,{push=true,sub=null}={}){'),
                ('openLaunch(k,{push}); return;', 'openLaunch(k,{push,sub}); return;'),
                ('const src="./"+v.file+(v.k==="lab"||k==="lab"?"?instant=1":"");',
                 'const src="./"+v.file+(v.k==="lab"||k==="lab"?"?instant=1":"")+(sub?"#"+sub:"");'),
                ('history.pushState({launch:k},"","#"+k)',
                 'history.pushState({launch:k},"","#"+k+(sub?"/"+sub:""))'),
                ('return url.origin === location.origin && /\\/lab\\.html$/.test(url.pathname);',
                 "return (url.origin === location.origin || (window.BioqPackage && url.protocol === 'file:' && location.protocol === 'file:')) && /\\/lab\\.html$/.test(url.pathname);"),
            )
            for old, new in immersive_routes:
                if source.count(old) != 1:
                    raise ValueError("App immersive route contract changed: " + old)
                source = source.replace(old, new, 1)
            source = re.sub(r"(?m)^prefetch(?:Lab|Sections)\(\);\s*$",
                            "// Every section is already included in the single-file package.", source)
        self.discover_literals(source, name)

        def script(match: re.Match) -> str:
            if match["attrs"] is None:
                if match.group(0).lower().startswith("<style"):
                    return self.css(match.group(0), name)
                return match.group(0)
            attrs, body = match["attrs"], match["body"]
            data = attributes(attrs)
            kind = data.get("type", "").lower()
            if kind and kind not in ("module", "text/javascript", "application/javascript"):
                return match.group(0)
            owner = name
            if "src" in data:
                owner = self.local(data["src"], name)
                if not owner:
                    return match.group(0)
                self.add(owner)
                body = gzip.decompress(base64.b64decode(self.assets[owner]["data"])).decode("utf-8")
                attrs = re.sub(r"\s*src\s*=\s*(['\"])[\s\S]*?\1", "", attrs, count=1, flags=re.I)
            else:
                body = self.imports(transform_js(body), owner)
            return "<script" + attrs + ">" + re.sub(r"</script", r"<\/script", body, flags=re.I) + "</script>"

        source = BLOCKS.sub(script, source)
        # Work only on markup between script/style/comment blocks. JavaScript
        # templates and opaque import-map data are not parsed as real elements.
        def markup(fragment: str) -> str:
            def tag(match: re.Match) -> str:
                attrs = attributes(match["attrs"])
                kind = match["tag"].lower()
                for attr in ("src", "poster", "href"):
                    if attr not in attrs: continue
                    local = self.local(attrs[attr], name)
                    if local and local not in PAGES:
                        self.add(local)
                if kind == "link" and attrs.get("rel", "").lower() == "stylesheet":
                    local = self.local(attrs.get("href", ""), name)
                    if local:
                        text = gzip.decompress(base64.b64decode(self.assets[local]["data"])).decode("utf-8")
                        return '<style data-bioq-source="' + local + '">' + text + '</style>'
                def event(attr: re.Match) -> str:
                    if not attr["name"].lower().startswith("on"):
                        return attr.group(0)
                    value = transform_js(html.unescape(attr["value"]))
                    return attr["name"] + '=' + attr["q"] + html.escape(value, quote=True) + attr["q"]
                return "<" + match["tag"] + ATTRS.sub(event, match["attrs"]) + ">"
            return TAGS.sub(tag, fragment)

        pieces, cursor = [], 0
        for match in BLOCKS.finditer(source):
            pieces.extend((markup(source[cursor:match.start()]), match.group(0)))
            cursor = match.end()
        pieces.append(markup(source[cursor:]))
        return "".join(pieces)

    def manifest(self) -> dict:
        pages = {name: packed(self.document(name).encode("utf-8")) for name in PAGES}
        for name in (*MODULES, *EXTRA_ASSETS):
            self.add(name)
        previews = self.root / "assets/previews"
        if not previews.is_dir():
            raise ValueError("Missing dynamic preview directory: assets/previews")
        for path in sorted(previews.iterdir()):
            if path.is_file() and path.suffix.lower() in (".webp", ".png", ".jpg"):
                self.add(path.relative_to(self.root).as_posix())
        # Optional postprocessing uses the same pinned Three revision. The
        # runtime imports these modules through exact three/addons/* map keys.
        addons = self.root / "src/single-file/vendor/three-addons"
        if addons.is_dir():
            for path in sorted(addons.rglob("*.js")):
                self.add(path.relative_to(self.root).as_posix())
        bridge = (self.root / "src/single-file/bridge.js").read_text(encoding="utf-8")
        return {"version": 1, "pages": pages, "assets": dict(sorted(self.assets.items())), "bridge": bridge}


def build_manifest(root: Path = ROOT) -> dict:
    return Package(root).manifest()


def render_output(root: Path = ROOT) -> str:
    root = Path(root)
    shell = (root / "src/single-file/shell.html").read_text(encoding="utf-8")
    host = (root / "src/single-file/host.js").read_text(encoding="utf-8")
    manifest = build_manifest(root)
    data = json.dumps(manifest, ensure_ascii=True, separators=(",", ":")).replace("<", "\\u003c")
    for placeholder in ("__BIOQ_MANIFEST__", "__BIOQ_HOST__"):
        if shell.count(placeholder) != 1:
            raise ValueError(f"Single-file shell requires exactly one {placeholder}")
    return shell.replace("__BIOQ_MANIFEST__", data).replace("__BIOQ_HOST__", re.sub(r"</script", r"<\/script", host, flags=re.I))


def redirect_page() -> str:
    routes = {name: ("" if name == "index.html" else "home" if name == "app.html" else name[:-5]) for name in PAGES}
    # GitHub Pages invokes this document for old multi-file application URLs.
    return '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Biology Entelloq</title><p>Opening Biology Entelloq… <a href="/">Continue</a></p><script>' + \
        'const routes=' + json.dumps(routes, separators=(",", ":")) + ';const name=location.pathname.split("/").pop();const route=routes[name];const sub=location.hash.slice(1);let hash=route===undefined?"":route;if(name==="app.html")hash=sub||"home";else if(route&&sub)hash+="/"+sub;location.replace("/"+location.search+(hash?"#"+hash:""));</script>\n'


def build(output: Path, check: bool = False, root: Path = ROOT) -> dict[str, bytes]:
    output, root = Path(output), Path(root)
    files = {"index.html": render_output(root).encode("utf-8"),
             "404.html": redirect_page().encode("utf-8"),
             "CNAME": (root / "CNAME").read_text(encoding="utf-8").encode("utf-8"), ".nojekyll": b""}
    for name, data in files.items():
        destination = output / name
        if check:
            if not destination.is_file() or destination.read_bytes() != data:
                raise ValueError(f"Single-file output is missing or stale: {destination}")
        else:
            output.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(data)
    return files


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "dist", help="Output directory (default: dist)")
    parser.add_argument("--check", action="store_true", help="Verify an existing output without writing")
    args = parser.parse_args()
    try:
        files = build(args.output, args.check)
    except (OSError, ValueError) as error:
        parser.exit(1, str(error) + "\n")
    print(f"{'Verified' if args.check else 'Built'} single-file Biology: {args.output / 'index.html'} ({len(files['index.html']):,} bytes)")


if __name__ == "__main__":
    main()
