"""Portable-output contracts, independent of the preserved authoring pages."""
import base64
import gzip
import importlib.util
import json
from pathlib import Path
import re
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("single_file_builder", ROOT / "scripts/build-single-file.py")
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)


def unpack(value):
    return gzip.decompress(base64.b64decode(value))


class SingleFileBuild(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = BUILDER.build_manifest()

    def test_complete_document_and_prepared_asset_inventory(self):
        manifest = self.manifest
        self.assertEqual(manifest["version"], 1)
        self.assertEqual(set(manifest["pages"]), set(BUILDER.PAGES))
        self.assertEqual(manifest["bridge"], (ROOT / "src/single-file/bridge.js").read_text(encoding="utf-8"))
        for name in BUILDER.MODULES + BUILDER.EXTRA_ASSETS:
            self.assertIn(name, manifest["assets"])
        for path in (ROOT / "assets/previews").glob("*.webp"):
            self.assertIn(path.relative_to(ROOT).as_posix(), manifest["assets"])
        for path in (ROOT / "src/single-file/vendor/three-addons").rglob("*.js"):
            self.assertIn(path.relative_to(ROOT).as_posix(), manifest["assets"])
        self.assertEqual({name for name in manifest["assets"] if name.endswith(".glb")},
                         {"assets/specimens/frog.glb", "assets/specimens/cockroach.glb"})

    def test_every_payload_roundtrips_and_has_portable_metadata(self):
        for name, payload in self.manifest["pages"].items():
            with self.subTest(page=name):
                document = unpack(payload).decode("utf-8")
                self.assertIn("<html", document.lower())
                self.assertIn("</html>", document.lower())
                self.assertNotIn(str(ROOT), document)
        for name, item in self.manifest["assets"].items():
            with self.subTest(asset=name):
                self.assertFalse(Path(name).is_absolute())
                self.assertNotIn("\\", name)
                self.assertIn("/", item["type"])
                data = unpack(item["data"])
                self.assertTrue(data)
                if Path(name).suffix not in (".js", ".css"):
                    expected = (ROOT / name).read_bytes()
                    if Path(name).suffix in (".md", ".txt", ".json", ".svg"):
                        expected = expected.replace(b"\r\n", b"\n").replace(b"\r", b"\n")
                    self.assertEqual(data, expected)

    def test_all_local_script_and_stylesheet_dependencies_are_inlined(self):
        for name, payload in self.manifest["pages"].items():
            document = unpack(payload).decode("utf-8")
            for block in BUILDER.BLOCKS.finditer(document):
                if block["attrs"] is None:
                    continue
                attrs = BUILDER.attributes(block["attrs"])
                if "src" in attrs:
                    self.assertRegex(attrs["src"], r"^(?:https?:)?//", name)
            for href in re.findall(r'<link\b[^>]*rel=["\']stylesheet["\'][^>]*href=["\']([^"\']+)', document, re.I):
                self.assertRegex(href, r"^(?:https?:)?//", name)
        app = unpack(self.manifest["pages"]["app.html"]).decode("utf-8")
        self.assertRegex(app, r'<script\b[^>]*data-app="biology"[^>]*>')
        self.assertRegex(app, r'<script\b[^>]*data-bioq-assistant="app"[^>]*>')
        self.assertNotRegex(app, r"(?m)^prefetch(?:Lab|Sections)\(\);")
        self.assertIn("url.protocol === 'file:' && window.BioqLocation.protocol === 'file:'", app)
        self.assertIn("/\\/lab\\.html$/.test(url.pathname)", app)
        self.assertIn('function openLaunch(k,{push=true,sub=null}={}){', app)
        self.assertIn('openLaunch(k,{push,sub}); return;', app)
        self.assertIn('+(sub?"#"+sub:"");', app)
        self.assertIn('window.BioqHistory.pushState({launch:k},"","#"+k+(sub?"/"+sub:""))', app)

    def test_module_graph_uses_embedded_import_map_addresses(self):
        for name in BUILDER.MODULES:
            source = unpack(self.manifest["assets"][name]["data"]).decode("utf-8")
            for match in BUILDER.IMPORTS.finditer(source):
                self.assertFalse(match["path"].startswith(("./", "../")), name)
                if match["path"].startswith(BUILDER.PREFIX):
                    self.assertIn(match["path"][len(BUILDER.PREFIX):], self.manifest["assets"])
        lab = unpack(self.manifest["pages"]["lab.html"]).decode("utf-8")
        self.assertIn("import('" + BUILDER.PREFIX + "src/lab/prepared-loader.js')", lab)
        loader = unpack(self.manifest["assets"]["src/lab/prepared-loader.js"]["data"]).decode("utf-8")
        self.assertIn("pageURL = () => 'https://biology.entelloq.com/lab.html'", loader)
        for boundary in ("same-origin relative GLB URL required", "same-origin HTTP(S) required",
                         "asset stream exceeds size budget", "PL_preflight(data.buffer, specimenId)"):
            self.assertIn(boundary, loader)

    def test_opaque_import_maps_remain_byte_identical(self):
        for name in ("lab.html", "universe.html"):
            pattern = r'<script\b[^>]*type=["\']importmap["\'][^>]*>([\s\S]*?)</script>'
            original = re.search(pattern, (ROOT / name).read_text(encoding="utf-8"), re.I).group(1)
            prepared = re.search(pattern, unpack(self.manifest["pages"][name]).decode("utf-8"), re.I).group(1)
            self.assertEqual(prepared, original)

    def test_generated_browser_api_sweep_does_not_reuse_the_transform_mask(self):
        # This intentionally checks raw executable-block text independently of
        # code_mask. A mask bug previously hid every Learn route after a nested
        # template regexp, so testing that same mask's output could not catch it.
        browser_api = re.compile(
            r"(?<![\w$.])(?:(?:window|globalThis|root|win|doc\s*\.\s*defaultView)\s*\.\s*)?"
            r"location\s*\.\s*(?:hash|search|pathname|href|origin|protocol|reload|replace|assign|host)\b|"
            r"(?<![\w$.])(?:window\s*\.\s*)?history\s*\.\s*(?:pushState|replaceState|back|forward|go)\s*\("
        )
        sources = []
        for name, payload in self.manifest["pages"].items():
            for block in BUILDER.BLOCKS.finditer(unpack(payload).decode("utf-8")):
                if block["attrs"] is not None and BUILDER.attributes(block["attrs"]).get("type", "") in (
                        "", "module", "text/javascript", "application/javascript"):
                    sources.append((name, block["body"]))
        sources.extend((name, unpack(asset["data"]).decode("utf-8"))
                       for name, asset in self.manifest["assets"].items() if name.endswith(".js"))
        remaining = [(name, source[max(0, match.start() - 30):match.end() + 40])
                     for name, source in sources for match in browser_api.finditer(source)]
        self.assertEqual(remaining, [])
        learn = unpack(self.manifest["pages"]["learn.html"]).decode("utf-8")
        self.assertIn('window.BioqLocation.hash = url(topic, id)', learn)
        self.assertIn("parts = window.BioqLocation.hash.slice(1).split('/')", learn)

    def test_output_serialization_is_safe_and_deterministic(self):
        sample = b"Biology \xe2\x86\x92 one portable document\n" * 20
        first = BUILDER.packed(sample)
        self.assertEqual(first, BUILDER.packed(sample))
        self.assertEqual(base64.b64decode(first)[4:8], b"\0\0\0\0")
        self.assertEqual(base64.b64decode(first)[9], 255, "portable gzip OS marker")
        self.assertEqual(unpack(first), sample)
        fixture = {"version": 1, "pages": {}, "assets": {}, "bridge": "// </script><script>bad</script>"}
        with patch.object(BUILDER, "build_manifest", return_value=fixture):
            output = BUILDER.render_output()
            self.assertEqual(output, BUILDER.render_output())
        data = re.search(r'<script id="bioq-manifest" type="application/json">([\s\S]*?)</script>', output).group(1)
        self.assertEqual(json.loads(data), fixture)
        self.assertNotIn("</script", data.lower())
        self.assertNotIn("__BIOQ_MANIFEST__", output)
        self.assertNotIn("__BIOQ_HOST__", output)


class SingleFileTransform(unittest.TestCase):
    def test_real_learn_routes_and_mode_switch_survive_nested_regex_templates(self):
        source = (ROOT / "src/library/learn.js").read_text(encoding="utf-8")
        result = BUILDER.transform_js(source)
        self.assertIn('window.BioqLocation.hash = url(topic, id)', result)
        self.assertIn("parts = window.BioqLocation.hash.slice(1).split('/')", result)
        self.assertNotRegex(result, r"(?<![\w$.])location\s*\.")
        # The triggering regexp stays untouched inside the template expression.
        self.assertIn(r"/^https:\/\//.test(source.url || '')", result)

    def test_regexes_after_operators_and_control_parens_do_not_hide_later_code(self):
        source = r'''const template = `${source && /^https:\/\//.test(source.url) ? `yes ${location.hash}` : ''}`;
const a = source || /location\.hash/.test(value);
const b = source ?? /location/.test(value);
const c = value => /location/.test(value);
if (ready) /location/.test(value);
const quotient = count++ / 2;
location.hash = '#learn'; history.replaceState({}, '', '#learn');'''
        result = BUILDER.transform_js(source)
        self.assertIn('${window.BioqLocation.hash}', result)
        self.assertIn("window.BioqLocation.hash = '#learn'", result)
        self.assertIn('window.BioqHistory.replaceState', result)
        self.assertIn(r'/location\.hash/', result)
        self.assertIn('count++ / 2', result)

    def test_text_payloads_normalize_checkout_newlines_without_changing_binary(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'notes.txt').write_bytes(b'one\r\ntwo\r\n')
            (root / 'picture.png').write_bytes(b'\x89PNG\r\n\x1a\n')
            package = BUILDER.Package(root)
            package.add('notes.txt'); package.add('picture.png')
            self.assertEqual(unpack(package.assets['notes.txt']['data']), b'one\ntwo\n')
            self.assertEqual(unpack(package.assets['picture.png']['data']), b'\x89PNG\r\n\x1a\n')

    def test_virtual_browser_apis_preserve_literals_and_unrelated_properties(self):
        source = '''// location.hash and history.back() in a comment
const literal = "location.hash";
const pattern = /window.location/;
const html = `<b>location.hash</b>${location.hash}`;
const a = location.hash + window.location.search + globalThis.location.href;
const b = root.location && win.location && doc.defaultView.location;
history.pushState({}, '', '#learn'); window.history.back(); other.history.back();
const c = {location: 'data'}; other.location = 3;
'''
        result = BUILDER.transform_js(source)
        for unchanged in ('"location.hash"', '/window.location/', '<b>location.hash</b>',
                          'other.history.back()', "{location: 'data'}", 'other.location = 3'):
            self.assertIn(unchanged, result)
        for replacement in ('${window.BioqLocation.hash}', 'window.BioqLocation.search',
                            'globalThis.BioqLocation.href', 'root.BioqLocation',
                            'win.BioqLocation', 'doc.defaultView.BioqLocation',
                            'window.BioqHistory.pushState', 'window.BioqHistory.back'):
            self.assertIn(replacement, result)

    def test_null_origin_package_bridges_keep_sender_validation(self):
        source = """if (location.origin === 'null' || event.origin !== location.origin || event.source !== frame.contentWindow) return;
if (location.origin !== 'null') parent.postMessage({bioqContext: value}, location.origin);
"""
        result = BUILDER.transform_js(source)
        self.assertIn("(window.BioqLocation.origin === 'null' && !window.BioqPackage)", result)
        self.assertIn("(window.BioqLocation.origin !== 'null' || !!window.BioqPackage)", result)
        self.assertIn("event.origin !== window.BioqLocation.origin", result)
        self.assertIn("event.source !== frame.contentWindow", result)
        self.assertIn("(window.BioqLocation.origin === 'null' ? '*' : window.BioqLocation.origin)", result)

    def test_missing_and_escaping_dependencies_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "page.html").write_text('<html><body><img src="missing.png"></body></html>', encoding="utf-8")
            package = BUILDER.Package(root)
            with self.assertRaisesRegex(ValueError, "Missing local dependency"):
                package.document("page.html")
            with self.assertRaisesRegex(ValueError, "escapes repository"):
                package.local("../outside.js", "page.html")

    def test_events_transform_but_json_stays_opaque(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "page.html").write_text('''<html><head><script type="application/json">{"route":"location.hash"}</script></head>
<body><button onclick="location.reload()">Again</button><script>location.hash='#learn';</script></body></html>''', encoding="utf-8")
            document = BUILDER.Package(root).document("page.html")
            self.assertIn('{"route":"location.hash"}', document)
            self.assertIn('onclick="window.BioqLocation.reload()"', document)
            self.assertIn("window.BioqLocation.hash='#learn'", document)

    def test_distribution_contains_one_app_and_compatibility_redirect(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(BUILDER, "render_output", return_value="<html>portable</html>"):
            destination = Path(directory)
            files = BUILDER.build(destination)
            self.assertEqual(set(files), {"index.html", "404.html", "CNAME", ".nojekyll"})
            self.assertEqual((destination / "CNAME").read_bytes(), (ROOT / "CNAME").read_text(encoding="utf-8").encode("utf-8"))
            before = {path.name: path.stat().st_mtime_ns for path in destination.iterdir()}
            BUILDER.build(destination, check=True)
            self.assertEqual(before, {path.name: path.stat().st_mtime_ns for path in destination.iterdir()})
            (destination / "index.html").write_text("stale", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "stale"):
                BUILDER.build(destination, check=True)
        redirect = BUILDER.redirect_page()
        self.assertIn('"lab.html":"lab"', redirect)
        self.assertIn('"learn.html":"learn"', redirect)
        self.assertIn('location.replace("/"', redirect)


if __name__ == "__main__":
    unittest.main()
