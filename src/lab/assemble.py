"""
Assemble the dissection app into ONE self-contained HTML file.

The four generated modules plus main.js are concatenated into a single
<script type="module">. Because they are concatenated rather than bundled, each
module is written with no imports at all (three.js arrives as a parameter named
THREE), so the only transform needed here is stripping the `export ` keyword.

Run:  python _build/assemble.py
"""

import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "dissection-lab.html")

# Order matters: definitions before use at module-evaluation time.
# env.js and handviz.js define functions main.js calls, so they precede it.
# The human torso prosection was cut from the product: a dissection bench built
# for teaching is a better one when the specimens are the ones a student actually
# gets on a bench. The human-*.js sources stay on disk (unreferenced) so the work
# is recoverable, but they are deliberately not assembled — nothing outside those
# files touches SPECIMENS.human, so their absence removes the card and nothing else.
MODULES = ["hands.js", "anatomy.js", "frog.js", "heart.js",
           "earthworm.js", "fish.js", "cockroach.js",
           "surface.js", "strata.js",
           "dissect.js", "softbody.js", "cutting.js", "blood.js", "constraints.js",
           "instruments.js", "narrator.js", "sfx.js", "tutor.js", "histology.js",
           "imaging.js", "pathology.js", "physio.js", "xr.js", "zoomverse.js",
           "env.js", "dust.js", "postfx.js", "intro.js", "handviz.js", "shell.js", "main.js"]

EXPORT_RE = re.compile(r"^export\s+(?=(const|let|var|function|async|class)\b)", re.M)
EXPORT_BLOCK_RE = re.compile(r"^export\s*\{[^}]*\}\s*;?\s*$", re.M)
IMPORT_RE = re.compile(r"^\s*import\s+[^;\n]*?from\s*['\"][^'\"]+['\"]\s*;?\s*$", re.M)


# Modules that are optional: if the refinement workflow has not produced them
# yet, the app still assembles and runs (main.js guards for their absence).
OPTIONAL = {"env.js", "handviz.js", "softbody.js", "instruments.js", "narrator.js",
            # Phase 2-4 subsystems. All optional by construction: main.js feature-
            # detects every one of them, so a module that fails to build degrades
            # that one capability instead of taking the whole app down with it.
            "strata.js", "cutting.js", "blood.js", "constraints.js", "tutor.js",
            "histology.js", "imaging.js", "pathology.js", "physio.js", "xr.js",
            # Craft pass — cinematic rendering, procedural audio, organ surface detail.
            "surface.js", "sfx.js", "postfx.js", "intro.js", "dust.js",
            # New specimens self-register into SPECIMEN_BUILDERS; absent ones just
            # do not appear as cards, so they are optional like everything else.
            "earthworm.js", "fish.js", "cockroach.js",
            "zoomverse.js"}


def load(name):
    path = os.path.join(HERE, name)
    if not os.path.exists(path):
        if name in OPTIONAL:
            print("  (skipping optional %s — not written yet)" % name)
            return ""
        raise SystemExit("missing module: %s — the build workflow has not finished" % name)
    src = open(path, encoding="utf-8").read()

    # Static imports would break concatenation. Dynamic import() is fine and is
    # how the hands module lazily fetches MediaPipe, so only strip the static form.
    stripped = IMPORT_RE.sub("", src)
    if stripped != src:
        print("  ! %s had static imports; stripped" % name)
    src = stripped

    src = EXPORT_BLOCK_RE.sub("", src)
    src = EXPORT_RE.sub("", src)
    return src


TOPLEVEL_RE = re.compile(
    r"^(?:export\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)", re.M)


def check_collisions(sources):
    """
    Every module concatenates into ONE module scope, so two modules declaring the
    same top-level name is a fatal `Identifier already declared`. This turns that
    into a build-time error naming the culprits, instead of a blank page at runtime.
    """
    seen = {}
    clashes = []
    for name, src in sources:
        for ident in set(TOPLEVEL_RE.findall(src)):
            if ident in seen and seen[ident] != name:
                clashes.append((ident, seen[ident], name))
            seen[ident] = name
    if clashes:
        lines = "\n".join("  %s  (in %s and %s)" % c for c in clashes)
        raise SystemExit("top-level name collisions would break the bundle:\n" + lines)


def check_shell_css(src):
    """
    SHELL_CSS is a backtick template literal. A stray backtick inside it (easy to
    type in a comment like `left`) terminates the string early and blanks the whole
    page — it has done so twice. Catch it here instead of at runtime: the CSS body
    must contain no backtick and no ${ template-substitution.
    """
    m = re.search(r"SHELL_CSS\s*=\s*`(.*?)`", src, re.S)
    if not m:
        return
    body = m.group(1)
    if "${" in body:
        raise SystemExit("SHELL_CSS contains a ${ template substitution — it will break the CSS string.")
    # A well-formed literal ends at the FIRST backtick after SHELL_CSS=`, so if the
    # captured body is suspiciously short the real string was cut off by a stray one.
    if len(body) < 4000:
        raise SystemExit(
            "SHELL_CSS parsed to only %d chars — a stray backtick in a CSS comment "
            "almost certainly closed the template literal early. Search shell.js for a "
            "backtick inside the CSS." % len(body))


def main():
    raw = [(m, load(m)) for m in MODULES]
    check_collisions([(m, s) for m, s in raw if s])
    for m, s in raw:
        if m == "shell.js" and s:
            check_shell_css(s)
    bodies = []
    for m, src in raw:
        bodies.append("\n/* ===== %s %s */\n%s" % (m, "=" * (58 - len(m)), src))
        print("  %-12s %6.1f KB" % (m, len(src) / 1024.0))

    # The shell owns all CSS and exports it as a string constant. Detect it by
    # content, not by index — the module order has changed and a fixed index
    # (bodies[3]) now points at env.js, which an agent correctly flagged.
    has_css = any("SHELL_CSS" in b for b in bodies)

    html = TEMPLATE.replace("/*__MODULES__*/", "\n".join(bodies))
    html = html.replace("/*__CSSINJECT__*/",
                        "document.getElementById('shellcss').textContent = SHELL_CSS;"
                        if has_css else "")

    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(html)

    print("\nwrote %s  (%.1f KB)" % (OUT, os.path.getsize(OUT) / 1024.0))


TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Biology Entelloq — Dissection Lab</title>
<style>
  :root{
    --bg:#04070a; --ink:#d6e2e8; --dim:#8fa3ad; --faint:#5c6d76;
    --em:#34d399; --cy:#38e0d8; --warn:#f0b866; --bad:#e8735e;
    --line:rgba(255,255,255,.09); --glass:rgba(8,13,18,.74);
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
    --sans:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,sans-serif;
  }
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;overflow:hidden;background:var(--bg);
            color:var(--ink);font-family:var(--sans)}
  canvas{display:block}
  #stage{position:fixed;inset:0;
    background:radial-gradient(60% 64% at 50% 44%,#101820 0%,#0a1015 44%,#05080b 74%,#04070a 100%);}
  /* The hand cursor is the only rendering of the hand that ever exists: the
     tracker never exposes landmarks, so a skeleton is not drawable by design. */
  #handcursor{position:fixed;left:0;top:0;z-index:30;pointer-events:none;display:none;
    border-radius:50%;border:1.5px solid rgba(52,211,153,.8);
    background:radial-gradient(circle,rgba(52,211,153,.22),transparent 68%);
    transition:width .09s ease,height .09s ease,border-color .15s}
  #handcursor[data-grip="1"]{border-color:var(--cy);
    background:radial-gradient(circle,rgba(56,224,216,.34),transparent 66%)}
  #handcursor[data-health="2"]{border-color:var(--warn);opacity:.6}
  #handcursor[data-health="3"]{border-color:var(--bad);opacity:.35}
</style>
<style id="shellcss"></style>
</head>
<body>
<div id="stage"></div>

<script type="importmap">
{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js",
            "three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}
</script>

<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// Post-processing addons for env.js. Wrapped so a CDN hiccup on any one of them
// degrades to no-bloom rather than a blank page — main.js checks for undefined.
let EffectComposer, RenderPass, UnrealBloomPass, OutputPass;
try {
  ({ EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js'));
  ({ RenderPass } = await import('three/addons/postprocessing/RenderPass.js'));
  ({ UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js'));
  ({ OutputPass } = await import('three/addons/postprocessing/OutputPass.js'));
} catch (e) {
  console.warn('post-processing addons unavailable; running without bloom', e);
}
const POSTFX_DEPS = { EffectComposer, RenderPass, UnrealBloomPass, OutputPass };

/*__MODULES__*/

// Module-scoped bindings are invisible to an injected eval, so a bare failure
// here looks identical to "nothing loaded". Surface it explicitly instead.
try {
  /*__CSSINJECT__*/
  startApp();
  // MERGE — startApp() has already installed live getters here; a plain
  // assignment would silently delete them and make the app untestable.
  window.__LAB = Object.assign(window.__LAB || {}, {
    ok: true,
    hasHands: typeof createHands === 'function',
    specimens: typeof SPECIMENS === 'object' ? Object.keys(SPECIMENS) : null,
    build: typeof buildSpecimen === 'function',
    dissect: typeof createDissection === 'function',
  });
} catch (err) {
  window.__LAB = { ok: false, error: (err && err.message) || String(err), stack: (err && err.stack) || '' };
  const d = document.createElement('pre');
  d.style.cssText = 'position:fixed;inset:20px;z-index:999;color:#e8735e;font:12px ui-monospace;'
    + 'white-space:pre-wrap;background:#0b0f14;border:1px solid #e8735e;padding:16px;overflow:auto';
  d.textContent = 'Startup failed:\n\n' + ((err && err.stack) || err);
  document.body.appendChild(d);
  throw err;
}
</script>
</body>
</html>
"""


if __name__ == "__main__":
    main()
