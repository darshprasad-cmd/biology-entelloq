"""The learning builder may replace source slots, never shared page chrome."""
import importlib.util
from pathlib import Path
import re
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("learning_build", ROOT / "scripts/build-learning.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class LearningBuildContract(unittest.TestCase):
    def test_only_two_learning_pages_are_targets(self):
        self.assertEqual(builder.PAGES, ("lessons", "reason"))

    def test_generated_pages_are_in_sync_and_build_is_idempotent(self):
        for page in builder.PAGES:
            with self.subTest(page=page):
                target, before, after = builder.render(page)
                self.assertEqual(target, ROOT / f"{page}.html")
                self.assertEqual(before, after, "Run python scripts/build-learning.py")

    def test_shared_markup_and_inline_tag_documentation_are_not_source_slots(self):
        slots = re.compile(rb'^<(?:style id="page-css"|script id="page-js")>[\s\S]*?</(?:style|script)>', re.MULTILINE)
        for page in builder.PAGES:
            with self.subTest(page=page):
                _, before, after = builder.render(page)
                self.assertEqual(len(slots.findall(before)), 2)
                self.assertEqual(slots.sub(b"SOURCE_SLOT", before), slots.sub(b"SOURCE_SLOT", after))
                self.assertIn(b'fill <main id="page"> and add scoped rules in <style id="page-css">.', after)

    def test_missing_or_ambiguous_slots_fail_without_writing(self):
        for data in (b"<html></html>", b'<style id="page-css"></style>\n<style id="page-css"></style>'):
            with self.subTest(data=data), patch.object(Path, "read_bytes", return_value=data), patch.object(Path, "write_bytes") as write:
                with self.assertRaisesRegex(ValueError, "exactly one page-css"):
                    builder.render("lessons")
                write.assert_not_called()


if __name__ == "__main__":
    unittest.main()
