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
import os

ROOT = Path(__file__).resolve().parents[1]
BASE = "4dcb67d2b1654d74d065b588acbde7831e6f5737"
ORIGINAL = json.loads((ROOT / "tests/fixtures/dissection-original.json").read_text(encoding="utf-8"))
spec = importlib.util.spec_from_file_location("dissection_builder", ROOT / "scripts/build-dissection.py")
BUILDER = importlib.util.module_from_spec(spec)
spec.loader.exec_module(BUILDER)
# The user's September 6 instruction reopens the dissection slots; September 20
# explicitly adds zoomverse.js for the scale-journey detail upgrade. The shell
# fingerprint is derived again from BASE, not the modified working artifact. The
# original fingerprint fixture remains unchanged and protects every other byte.
APPROVED = {"src/lab/" + name for name in BUILDER.MODULES} | {"lab.html"}
# These are external ES modules/dependencies, not additional assembled slots.
# Keep this closed list separate from the immutable original-blob inventory;
# neither a vendor directory wildcard nor an arbitrary new module is approved.
EXTERNAL_ASSET_FILES = {
    "src/lab/specimen-assets.js",
    "src/lab/prepared-loader.js",
    "src/lab/vendor/loaders/GLTFLoader.js",
    "src/lab/vendor/utils/BufferGeometryUtils.js",
    "src/lab/vendor/THREE-LICENSE.txt",
    "src/lab/vendor/PREPARED-LOADER-SOURCES.md",
}
# September 20: the user explicitly reopens the Lab exit bug. Normalize only
# these exact approved routing changes back to their original bytes; every
# unrelated launcher byte still uses the immutable original fingerprint.
APPROVED_LAUNCHER_ROUTING = (
    ('openLaunch(k,{push}); return; }  // immersive → overlay',
     'openLaunch(k); return; }  // immersive → overlay'),
    ('function openLaunch(k,{push=true}={}){', 'function openLaunch(k){'),
    ('  if(push){try{history.pushState({launch:k},"","#"+k);}catch(e){}}',
     '  try{history.pushState({launch:k},"","#"+k);}catch(e){}'),
    ('$("#launchX").addEventListener("click",()=>{ if(lframe.dataset.src==="./"+BYKEY.lab.file+"?instant=1"){closeLaunch();return;} history.length>1?history.back():closeLaunch(); if(launcherOpen)closeLaunch(); });',
     '$("#launchX").addEventListener("click",()=>{ history.length>1?history.back():closeLaunch(); if(launcherOpen)closeLaunch(); });'),
)


def normalize_approved_launcher_routing(text):
    for approved, original in APPROVED_LAUNCHER_ROUTING:
        if text.count(approved) != 1:
            raise AssertionError(f"Approved Lab exit fix is missing or ambiguous: {approved}")
        text = text.replace(approved, original, 1)
    return text


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
        permitted = original | EXTERNAL_ASSET_FILES
        self.assertTrue(original <= tracked, "Do not remove original dissection modules")
        self.assertFalse(tracked - permitted, "Unapproved tracked dissection modules")
        # Local work may contain the specifically approved new files before
        # staging. CI must prove every runtime dependency was actually committed.
        if os.environ.get("CI", "").strip().lower() not in ("", "0", "false"):
            self.assertEqual(tracked, permitted, "Commit every approved asset dependency before CI")
        actual = {item.relative_to(ROOT).as_posix() for item in (ROOT / "src/lab").rglob("*")
                  if item.is_file() and "__pycache__" not in item.parts and item.suffix != ".pyc"}
        self.assertEqual(actual, permitted, "Only the exact approved asset files may extend dissection sources")

    def test_lab_changes_are_limited_to_approved_source_slots(self):
        # Derived once from BASE:lab.html after replacing only the approved slot
        # bodies with the sentinel below. A separate shell hash lets a shallow
        # CI checkout verify preservation without fetching old Git history.
        # September 30 explicitly reopens blood behavior. Keep the original
        # fingerprint untouched; the expanded reference is derived from BASE,
        # never from the edited page. It removes exactly the blood source slot.
        scope = json.loads((ROOT / "tests/fixtures/dissection-blood-scope.json").read_text())
        self.assertEqual(scope["base"], BASE)
        self.assertEqual(scope["additionalSlots"], ["blood.js"])
        self.assertEqual(scope["previousShellSha256"],
                         (ROOT / "tests/fixtures/dissection-shell.sha256").read_text().strip())
        specimen_scope = json.loads((ROOT / "tests/fixtures/dissection-specimen-scope.json").read_text())
        self.assertEqual(specimen_scope["base"], BASE)
        self.assertEqual(specimen_scope["additionalSlots"], ["strata.js"])
        self.assertEqual(specimen_scope["previousShellSha256"], scope["expandedShellSha256"])
        expected = specimen_scope["expandedShellSha256"]
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
        normalized = normalize_approved_launcher_routing(after)
        for boundary in ORIGINAL["regions"]:
            with self.subTest(region=boundary["start"]):
                content = region(normalized, boundary["start"], boundary["end"])
                if boundary["start"] == '<script id="atmo-js">':
                    # September 14: the user expressly asked for the launch
                    # photograph to continue throughout the app. Only this
                    # atmosphere slot changes; the immersive launcher stays exact.
                    expected = (ROOT / "src/library/backdrop.js").read_text(encoding="utf-8").strip()
                    script = re.search(r'<script id="atmo-js">([\s\S]*?)</script>', after)
                    self.assertIsNotNone(script)
                    self.assertEqual(script.group(1).strip(), expected)
                else:
                    self.assertEqual(hashlib.sha256(content.encode("utf-8")).hexdigest(), boundary["sha256"])
        lab_entry = r'\{k:"lab",label:"Dissection Lab"[^\n]*'
        self.assertEqual(re.findall(lab_entry, after), [ORIGINAL["lab_entry"]])

    def test_app_exit_approval_requires_every_exact_fix_once(self):
        after = (ROOT / "app.html").read_text(encoding="utf-8").strip()
        for approved, original in APPROVED_LAUNCHER_ROUTING:
            with self.subTest(snippet=approved):
                with self.assertRaises(AssertionError):
                    normalize_approved_launcher_routing(after.replace(approved, original, 1))
                with self.assertRaises(AssertionError):
                    normalize_approved_launcher_routing(after + "\n" + approved)


if __name__ == "__main__":
    unittest.main()
