from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGES = (
    "index.html", "app.html", "learn.html", "lessons.html", "reason.html",
    "labs.html", "solve.html", "explore.html", "me.html", "about.html",
    "lab.html", "universe.html", "404.html",
)


class StaticSiteContract(unittest.TestCase):
    def test_published_page_inventory_is_complete(self):
        for name in PAGES:
            path = ROOT / name
            self.assertTrue(path.is_file(), name)
            self.assertGreater(path.stat().st_size, 20, name)

    def test_custom_domain_and_pages_files_are_stable(self):
        self.assertEqual((ROOT / "CNAME").read_text(encoding="utf-8").strip(), "biology.entelloq.com")
        self.assertTrue((ROOT / ".nojekyll").is_file())

    def test_immersive_sources_and_artifacts_stay_paired(self):
        pairs = (
            ("src/lab/assemble.py", "lab.html"),
            ("src/universe/assemble.py", "universe.html"),
            ("src/_atmo.js", "index.html"),
        )
        for source, artifact in pairs:
            self.assertTrue((ROOT / source).is_file(), source)
            self.assertTrue((ROOT / artifact).is_file(), artifact)

    def test_product_identity_remains_present(self):
        for name in ("index.html", "app.html", "lab.html", "universe.html"):
            text = (ROOT / name).read_text(encoding="utf-8").lower()
            self.assertIn("biology", text, name)


if __name__ == "__main__":
    unittest.main()
