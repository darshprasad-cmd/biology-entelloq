"""Preserve all dissection boundaries outside the expressly approved realism pass.

Comparison uses Git's canonical blob bytes (thus respecting autocrlf on Windows),
not timestamps, file sizes, or a list of expected changed filenames.
"""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import unittest
import importlib.util

ROOT = Path(__file__).resolve().parents[1]
BASE = "4dcb67d2b1654d74d065b588acbde7831e6f5737"
ORIGINAL = json.loads((ROOT / "tests/fixtures/dissection-original.json").read_text(encoding="utf-8"))
spec = importlib.util.spec_from_file_location("dissection_builder", ROOT / "scripts/build-dissection.py")
BUILDER = importlib.util.module_from_spec(spec)
spec.loader.exec_module(BUILDER)
# The user's September 6 instruction reopens these source slots only. The
# original fingerprint fixture remains unchanged and protects every other byte.
APPROVED = {"src/lab/" + name for name in BUILDER.MODULES} | {"lab.html"}


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT).decode("utf-8").strip()


def region(text, start, end):
    if text.count(start) != 1 or text.count(end) != 1:
        raise AssertionError(f"Protected boundary is missing or ambiguous: {start}")
    return text.split(start, 1)[1].split(end, 1)[0]


class DissectionUnchanged(unittest.TestCase):
    def test_lab_sources_artifact_and_shared_dependencies_are_original_blobs(self):
        self.assertEqual(ORIGINAL["base"], BASE)
        expected = ORIGINAL["files"]
        files = list(expected)
        self.assertGreater(len(files), 35)
        for name in files:
            self.assertTrue((ROOT / name).is_file(), f"Protected file removed: {name}")
        hashes = subprocess.check_output(
            ["git", "hash-object", "--stdin-paths"], cwd=ROOT,
            input=("\n".join(files) + "\n").encode("utf-8"),
        ).decode("utf-8").splitlines()
        self.assertEqual(len(hashes), len(files))
        for name, actual in zip(files, hashes):
            with self.subTest(file=name):
                if name not in APPROVED:
                    self.assertEqual(actual, expected[name], f"Dissection boundary changed: {name}")
        tracked = set(git("ls-files", "src/lab").splitlines())
        original = {name for name in files if name.startswith("src/lab/")}
        self.assertEqual(tracked, original, "Do not add or remove dissection modules")
        actual = {item.relative_to(ROOT).as_posix() for item in (ROOT / "src/lab").rglob("*")
                  if item.is_file() and "__pycache__" not in item.parts and item.suffix != ".pyc"}
        self.assertEqual(actual, original, "Do not add untracked dissection modules either")

    def test_lab_changes_are_limited_to_approved_source_slots(self):
        # Derived once from BASE:lab.html after replacing only the approved slot
        # bodies with the sentinel below. A separate shell hash lets a shallow
        # CI checkout verify preservation without fetching old Git history.
        expected = (ROOT / "tests/fixtures/dissection-shell.sha256").read_text().strip()
        after = (ROOT / "lab.html").read_text(encoding="utf-8")
        for name in BUILDER.MODULES:
            pattern = BUILDER.slot_pattern(name)
            self.assertEqual(len(pattern.findall(after)), 1, name)
            after = pattern.sub(lambda m: m[1] + "APPROVED SOURCE SLOT\n", after)
        self.assertEqual(hashlib.sha256(after.encode()).hexdigest(), expected,
                         "Offline imports, shared assets and startup must stay intact")

    def test_approved_dissection_sources_match_deployed_slots(self):
        _, before, after = BUILDER.render()
        self.assertEqual(before, after, "Run python scripts/build-dissection.py")

    def test_app_immersive_launcher_regions_remain_identical(self):
        after = (ROOT / "app.html").read_text(encoding="utf-8").strip()
        for boundary in ORIGINAL["regions"]:
            with self.subTest(region=boundary["start"]):
                content = region(after, boundary["start"], boundary["end"])
                self.assertEqual(hashlib.sha256(content.encode("utf-8")).hexdigest(), boundary["sha256"])
        lab_entry = r'\{k:"lab",label:"Dissection Lab"[^\n]*'
        self.assertEqual(re.findall(lab_entry, after), [ORIGINAL["lab_entry"]])


if __name__ == "__main__":
    unittest.main()
