"""
Vendor three.js INTO a single-file 3D app so it runs with no internet.

Strategy: map the bare specifier "three" to a base64 data: URI of the minified
module (data: URIs are the only module source a file:// page may import — relative
file:// imports are blocked by CORS). The "three/addons/" prefix is LEFT pointing at
the CDN, so optional extras (bloom) still load when online and simply degrade when
not; OrbitControls is a hard dependency, so it is vendored explicitly. A more
specific import-map key wins over the prefix, so the two coexist.
"""
import base64, re, sys, os

VEND = os.path.dirname(os.path.abspath(__file__))
def durl(p):
    return "data:text/javascript;base64," + base64.b64encode(open(p,"rb").read()).decode()

THREE = durl(os.path.join(VEND,"three.module.min.js"))
ORBIT = durl(os.path.join(VEND,"OrbitControls.js"))

for path in sys.argv[1:]:
    html = open(path, encoding="utf-8").read()
    if '"three":"data:text/javascript' in html:
        print("  (already offline) " + os.path.basename(path)); continue
    m = re.search(r'<script type="importmap">\s*(\{.*?\})\s*</script>', html, re.S)
    if not m:
        print("  ! no import map in " + os.path.basename(path)); continue
    needs_orbit = "OrbitControls" in html
    imports = {"three": THREE}
    if needs_orbit:
        imports["three/addons/controls/OrbitControls.js"] = ORBIT
    imports["three/addons/"] = "https://unpkg.com/three@0.160.0/examples/jsm/"
    body = ",\n".join('"%s":"%s"' % (k, v) for k, v in imports.items())
    newmap = '<script type="importmap">\n{"imports":{\n' + body + '\n}}\n</script>'
    html = html[:m.start()] + newmap + html[m.end():]
    open(path, "w", encoding="utf-8", newline="\n").write(html)
    print("  offline-ready: %-42s %.1f MB  (orbit:%s)" % (
        os.path.basename(path), os.path.getsize(path)/1048576, needs_orbit))
