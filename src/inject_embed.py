"""
Make a Biology Entelloq page embeddable inside the unified app shell.
Appends (once) a small snippet that, ONLY when the URL carries ?embed=1:
  - hides the page's own nav/footer/launch (the shell provides the chrome),
  - live-syncs theme from the parent via postMessage,
  - routes internal cross-links (other Biology Entelloq pages) up to the parent
    so navigation stays inside one app.
Idempotent — the marker comment prevents double injection.

Usage: python inject_embed.py <file.html> [<file.html> ...]
"""
import sys

MARKER = "<!-- __BIOQ_EMBED__ -->"
SNIPPET = MARKER + """
<style>body.embed .nav,body.embed .mobile-menu,body.embed footer,body.embed .skiplink{display:none!important}
body.embed main{padding-top:20px!important}body.embed #launch{display:none!important}</style>
<script>(function(){var q=new URLSearchParams(location.search);if(!q.get('embed'))return;
try{localStorage.setItem('bioq_seen','1');}catch(e){}
function apply(){if(document.body)document.body.classList.add('embed');}
if(document.body)apply();else addEventListener('DOMContentLoaded',apply);
addEventListener('message',function(e){var d=e.data||{};if(d.bioqTheme){document.documentElement.setAttribute('data-theme',d.bioqTheme);try{localStorage.setItem('bioq_theme',d.bioqTheme);}catch(x){}}});
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href')||'';
if(/\\.html/i.test(h)&&/(Biology Entelloq|Biology Universe)/i.test(h)){e.preventDefault();try{parent.postMessage({bioqNav:h},'*');}catch(x){}}},true);
})();</script>
"""

for path in sys.argv[1:]:
    html = open(path, encoding="utf-8").read()
    if MARKER in html:
        print("  (already embedded) " + path); continue
    if "</body>" not in html:
        print("  ! no </body> in " + path); continue
    html = html.replace("</body>", SNIPPET + "\n</body>", 1)
    open(path, "w", encoding="utf-8", newline="\n").write(html)
    print("  embedded " + path)
