"""
Build a Biology Entelloq pillar page from the shared shell template + pieces.
Guarantees the shell (head tokens, nav, footer, shared script) stays byte-identical
across pillars — the pieces only fill the <main>, <style id="page-css"> and
<script id="page-js"> slots, and set <body data-page>.

Usage: python build_page.py <slug> <data-page> <title> <main.html> <page.css> <page.js> <out.html>
"""
import sys

_, slug, dpage, title, main_f, css_f, js_f, out_f = sys.argv
tpl = open("_template.html", encoding="utf-8").read()
main = open(main_f, encoding="utf-8").read() if main_f != "-" else '<div id="' + slug + 'App"></div>'
css = open(css_f, encoding="utf-8").read()
js = open(js_f, encoding="utf-8").read()

assert "<body>" in tpl and "<title>Biology Entelloq</title>" in tpl, "template markers missing"
tpl = tpl.replace("<body>", '<body data-page="%s">' % dpage, 1)
tpl = tpl.replace("<title>Biology Entelloq</title>", "<title>%s</title>" % title, 1)
tpl = tpl.replace('<main id="page"><!-- __PAGE__ pillar content goes here --></main>',
                  '<main id="page">%s</main>' % main)
tpl = tpl.replace('<style id="page-css">/* pillar-specific rules go here */</style>',
                  '<style id="page-css">\n%s\n</style>' % css)
tpl = tpl.replace('<script id="page-js">/* pillar-specific behaviour goes here */</script>',
                  '<script id="page-js">\n%s\n</script>' % js)

open(out_f, "w", encoding="utf-8", newline="\n").write(tpl)
print("wrote %s (%.1f KB)" % (out_f, len(tpl) / 1024))
