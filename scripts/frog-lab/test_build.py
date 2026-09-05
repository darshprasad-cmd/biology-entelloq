"""Read-only safety checks for the lab-only assembler wrapper."""

import base64
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("frog_builder_test_subject", ROOT / "scripts" / "build-frog-lab.py")
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)


class LabBuildSafetyTests(unittest.TestCase):
    def fixture(self, extra=""):
        return (
            '<html><body><script type="importmap">{"imports":{"three":"old-vendor","three/addons/":"https://example.test/addons/"}}</script><script type="module">startApp();</script>\n'
            + extra
            + BUILDER.SWITCHER_START
            + '<aside id="eqx-panel">Existing integration</aside>'
            + BUILDER.SWITCHER_END
            + "\n</body></html>"
        )

    def test_preserves_integration_tail_without_rewriting_it(self):
        embed = '<!-- __BIOQ_EMBED__ --><script>parent.postMessage({ready:true},"*");</script>\n'
        source = self.fixture(embed)
        tail = BUILDER.integration_tail(source)
        self.assertIn(embed, tail)
        self.assertIn('<aside id="eqx-panel">Existing integration</aside>', tail)
        self.assertNotIn("startApp", tail)

    def test_missing_switcher_stops_build(self):
        with self.assertRaises(ValueError):
            BUILDER.integration_tail(self.fixture().replace(BUILDER.SWITCHER_END, ""))

    def test_ambiguous_modules_stop_build(self):
        with self.assertRaises(ValueError):
            BUILDER.integration_tail(self.fixture('<script type="module">otherApp();</script>'))

    def test_vendor_data_matches_canonical_repository_bytes(self):
        for name in ("three.module.min.js", "OrbitControls.js"):
            with self.subTest(vendor=name):
                vendor = ROOT / "src" / "lab" / "vendor" / name
                encoded = BUILDER.data_module(vendor)
                self.assertTrue(encoded.startswith("data:text/javascript;base64,"))
                canonical = vendor.read_bytes().replace(b"\r\n", b"\n").replace(b"\r", b"\n")
                self.assertEqual(base64.b64decode(encoded.split(",", 1)[1]), canonical)

    def test_vendor_encoding_is_identical_for_lf_crlf_and_cr_checkouts(self):
        vendor = ROOT / "src" / "lab" / "vendor" / "OrbitControls.js"
        canonical = vendor.read_bytes().replace(b"\r\n", b"\n").replace(b"\r", b"\n")
        encodings = []
        for newline in (b"\n", b"\r\n", b"\r"):
            with self.subTest(newline=newline):
                with patch.object(Path, "read_bytes", return_value=canonical.replace(b"\n", newline)):
                    encodings.append(BUILDER.data_module(vendor))
        self.assertEqual(len(set(encodings)), 1)

    def test_vendor_normalization_preserves_license_unicode_bom_and_code(self):
        canonical = (
            b"\xef\xbb\xbf/*!\n * @license\n * Copyright 2010-2026 Three.js Authors\n * SPDX-License-Identifier: MIT\n */\n"
            + "export const label = 'βiology';\nexport const escaped = '\\r\\n';".encode("utf-8")
        )
        with patch.object(Path, "read_bytes", return_value=canonical.replace(b"\n", b"\r\n")):
            encoded = BUILDER.data_module(Path("fixture-vendor.js"))
        self.assertEqual(base64.b64decode(encoded.split(",", 1)[1]), canonical)

    def test_assembly_is_identical_across_vendor_checkout_line_endings(self):
        # Model Linux and Windows vendor checkouts without writing any source or
        # generated artifact. All remaining assembly inputs stay exactly equal.
        read_bytes = Path.read_bytes

        def vendor_with_newlines(path, newline):
            source = read_bytes(path)
            if path.parent.name == "vendor" and path.suffix == ".js":
                source = source.replace(b"\r\n", b"\n").replace(b"\r", b"\n")
                return source.replace(b"\n", newline)
            return source

        existing = BUILDER.LAB.read_text(encoding="utf-8")
        with patch.object(Path, "read_bytes", lambda path: vendor_with_newlines(path, b"\n")):
            linux = BUILDER.assemble_html(existing)
        with patch.object(Path, "read_bytes", lambda path: vendor_with_newlines(path, b"\r\n")):
            windows = BUILDER.assemble_html(existing)
        self.assertEqual(linux, windows)

    def test_only_public_output_is_current_repository_lab(self):
        self.assertEqual(BUILDER.LAB.resolve(), (ROOT / "lab.html").resolve())
        self.assertNotIn("Downloads", str(BUILDER.LAB))

    def test_assembly_refreshes_modules_but_retains_host_integrations(self):
        template = '<html><body><script type="importmap">{"imports":{"three":"template-vendor"}}</script><script type="module">/*__MODULES__*/\n/*__CSSINJECT__*/</script>\n</body></html>'
        assembler = SimpleNamespace(
            MODULES=["frog-test.js"],
            TEMPLATE=template,
            load=lambda name: 'const frogBuildSafety = "current-source";',
            check_collisions=lambda sources: None,
        )
        original = self.fixture("<!-- lab-specific-embed -->")
        with patch.object(BUILDER, "load_assembler", return_value=assembler):
            result = BUILDER.assemble_html(original)
        self.assertIn('const frogBuildSafety = "current-source";', result)
        self.assertEqual(BUILDER.integration_tail(result), BUILDER.integration_tail(original))
        imports = json.loads(BUILDER.IMPORT_MAP.search(result).group(1))["imports"]
        self.assertEqual(imports["three/addons/"], "https://example.test/addons/")
        self.assertTrue(imports["three"].startswith("data:text/javascript;base64,"))
        self.assertTrue(imports["three/addons/controls/OrbitControls.js"].startswith("data:text/javascript;base64,"))

    def test_retains_known_tutorial_head_includes_exactly_once(self):
        tags = "\n".join(BUILDER.TUTORIAL_HEAD_TAGS)
        existing = "<html><head>\n" + tags + "\n</head><body></body></html>"
        template = "<html><head>\n</head><body></body></html>"
        generated = BUILDER.preserve_head_integrations(existing, template)
        self.assertEqual(generated, existing)
        self.assertEqual(BUILDER.preserve_head_integrations(existing, generated), existing)
        self.assertEqual(BUILDER.preserve_head_integrations(template, template), template)

    def test_duplicate_tutorial_head_include_stops_build(self):
        tag = BUILDER.TUTORIAL_HEAD_TAGS[0]
        with self.assertRaises(ValueError):
            BUILDER.preserve_head_integrations("<head>" + tag + tag + "</head>", "<head></head>")


if __name__ == "__main__":
    unittest.main()
