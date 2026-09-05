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

    def test_vendor_data_matches_repository_bytes(self):
        vendor = ROOT / "src" / "lab" / "vendor" / "OrbitControls.js"
        encoded = BUILDER.data_module(vendor)
        self.assertTrue(encoded.startswith("data:text/javascript;base64,"))
        self.assertEqual(base64.b64decode(encoded.split(",", 1)[1]), vendor.read_bytes())

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
