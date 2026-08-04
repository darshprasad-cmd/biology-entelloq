"""
Assemble the Biology Universe into ONE self-contained HTML file.

Same pattern as the Dissection Lab: the modules are CONCATENATED (not bundled)
into a single <script type="module">. THREE is imported once at the top of that
script, so every module can reference `THREE` freely; the only transform is
stripping the `export` keyword. A top-level-name collision guard turns an
"Identifier already declared" (which would blank the page) into a build error.

Run:  python _build/assemble.py
"""

import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "biology-universe.html")

# Order matters: kit → core (defines UNI) → data (fills UNI.ORDER/UNI_DATA) →
# stages (register into UNI) → ui → main (boots on DOMContentLoaded).
MODULES = [
    "kit.js", "_textures.js", "core.js", "data.js",
    "stage_cosmic.js", "stage_body.js", "stage_cell.js", "stage_molecular.js",
    "ui.js", "main.js",
]

EXPORT_RE = re.compile(r"^export\s+(?=(const|let|var|function|async|class)\b)", re.M)
IMPORT_RE = re.compile(r"^\s*import\s+[^;\n]*?from\s*['\"][^'\"]+['\"]\s*;?\s*$", re.M)
TOPLEVEL_RE = re.compile(r"^(?:export\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)", re.M)


def load(name):
    path = os.path.join(HERE, name)
    src = open(path, encoding="utf-8").read()
    src = IMPORT_RE.sub("", src)
    src = EXPORT_RE.sub("", src)
    return src


def check_collisions(sources):
    seen, clashes = {}, []
    for name, src in sources:
        for ident in set(TOPLEVEL_RE.findall(src)):
            if ident in seen and seen[ident] != name:
                clashes.append((ident, seen[ident], name))
            seen[ident] = name
    if clashes:
        raise SystemExit("top-level name collisions would blank the page:\n"
                         + "\n".join("  %s  (in %s and %s)" % c for c in clashes))


def vendored_importmap():
    """
    Vendor three.js INTO the file so the Universe runs with NO internet.

    A file:// page may not import a module from a relative file:// URL (CORS), so
    the bare specifier "three" is mapped to a base64 data: URI of the minified
    build. The "three/addons/" PREFIX is deliberately left pointing at the CDN:
    the bloom passes are optional and already wrapped in try/catch, so online they
    load and offline they degrade to an un-bloomed (but fully working) frame.
    A more specific import-map key wins, so both can coexist.
    """
    import base64
    vdir = os.path.join(HERE, "vendor")
    core = os.path.join(vdir, "three.module.min.js")
    if not os.path.exists(core):
        print("  ! vendor/three.module.min.js missing — falling back to CDN-only")
        return ('{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js",'
                '"three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}')
    b64 = base64.b64encode(open(core, "rb").read()).decode()
    print("  vendored three.js  %.0f KB -> data URI %.0f KB" % (
        os.path.getsize(core) / 1024, len(b64) / 1024))
    return ('{"imports":{\n"three":"data:text/javascript;base64,%s",\n'
            '"three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"\n}}' % b64)


def main():
    raw = [(m, load(m)) for m in MODULES]
    check_collisions(raw)
    bodies = []
    for m, src in raw:
        bodies.append("\n/* ===== %s %s */\n%s" % (m, "=" * (56 - len(m)), src))
        print("  %-20s %6.1f KB" % (m, len(src) / 1024.0))
    html = TEMPLATE.replace("/*__MODULES__*/", "\n".join(bodies))
    html = re.sub(r'<script type="importmap">\s*\{.*?\}\s*</script>',
                  '<script type="importmap">\n' + vendored_importmap() + '\n</script>',
                  html, count=1, flags=re.S)
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(html)
    print("\nwrote %s  (%.1f KB)" % (OUT, os.path.getsize(OUT) / 1024.0))


TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="dark">
<title>The Biology Universe — Biology Entelloq</title>
<meta name="description" content="A continuous, cinematic zoom through every scale of life — from the universe to a single atom. By Biology Entelloq.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  /* base styles live here so there is no flash before ui.js injects the rest */
  html,body{margin:0;height:100%;background:#04070a;color:#eaf2f5;overflow:hidden;
    font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  #uni{position:fixed;inset:0;touch-action:none}
  #uni canvas{display:block;width:100%;height:100%}
  /* loader */
  #uniload{position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:#04070a;
    transition:opacity .6s ease;gap:0}
  #uniload.gone{opacity:0;pointer-events:none}
  #uniload .l{display:flex;flex-direction:column;align-items:center;gap:20px}
  #uniload svg{width:56px;height:56px;animation:lspin 3s linear infinite}
  @keyframes lspin{to{transform:rotate(360deg)}}
  #uniload .t{font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#66787f}
  @media (prefers-reduced-motion:reduce){#uniload svg{animation:none}}
</style>
</head>
<body>
<div id="uni"></div>
<div id="uniload"><div class="l">
  <svg viewBox="0 0 100 100" fill="none"><defs><linearGradient id="ld" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#38e0d8"/></linearGradient></defs>
    <path d="M32 16c20 9 16 28 0 34 20 6 24 24 0 34" stroke="url(#ld)" stroke-width="5" stroke-linecap="round"/>
    <path d="M68 16C48 25 52 44 68 50 48 56 44 75 68 84" stroke="url(#ld)" stroke-width="5" stroke-linecap="round"/></svg>
  <div class="t">Assembling the universe…</div></div></div>

<script type="importmap">
{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js",
            "three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}
</script>

<script type="module">
import * as THREE from 'three';
// Post-processing (bloom) — wrapped so a CDN hiccup degrades to an un-bloomed
// frame instead of a blank page.
let EffectComposer, RenderPass, UnrealBloomPass, OutputPass;
try {
  ({ EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js'));
  ({ RenderPass } = await import('three/addons/postprocessing/RenderPass.js'));
  ({ UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js'));
  ({ OutputPass } = await import('three/addons/postprocessing/OutputPass.js'));
} catch (e) { console.warn('post-processing unavailable; no bloom', e); }
const POSTFX_DEPS = { EffectComposer, RenderPass, UnrealBloomPass, OutputPass };

/*__MODULES__*/
</script>
</body>
</html>
"""


if __name__ == "__main__":
    main()
