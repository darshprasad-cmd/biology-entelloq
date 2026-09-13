"""Share the approved launch background across the app and eight reading sections."""
from pathlib import Path
import re
import argparse
ROOT=Path(__file__).resolve().parents[1]
PAGES=('app','learn','lessons','reason','labs','solve','explore','me','about')
def render(page):
    path=ROOT/(page+'.html')
    before=path.read_bytes()
    text=before.decode('utf-8').replace('\r\n','\n')
    js=(ROOT/'src/library/backdrop.js').read_text(encoding='utf-8').rstrip()
    pattern=re.compile(r'(<script id="atmo-js">)[\s\S]*?(</script>)')
    if len(pattern.findall(text))!=1: raise ValueError('Missing atmosphere slot: '+page)
    text=pattern.sub(lambda m:m[1]+'\n'+js+'\n'+m[2],text)
    return path,before,text.encode('utf-8')
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true');args=parser.parse_args()
    results=[render(p) for p in PAGES];stale=[p.name for p,b,a in results if b!=a]
    if args.check and stale:parser.exit(1,'Background drift: '+', '.join(stale)+'\n')
    if not args.check:
        for p,b,a in results:
            if b!=a:p.write_bytes(a)
    print('Launch background shared across app and eight sections.')
if __name__=='__main__':main()
