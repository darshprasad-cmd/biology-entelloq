"""Sync visual browsing surfaces without rebuilding scientific or immersive code."""
from pathlib import Path
import argparse
import re

ROOT = Path(__file__).resolve().parents[1]
PAGES = ('app', 'learn', 'lessons', 'reason', 'labs', 'solve', 'explore', 'me', 'about')

def render(page):
    path = ROOT / (page + '.html')
    before = path.read_bytes()
    text = before.decode('utf-8').replace('\r\n', '\n')
    for kind, tag, boundary in [('css', 'style', '</head>'), ('js', 'script', '</body>')]:
        start, end = '<!-- BIO-PREVIEWS:' + kind + ':START -->', '<!-- BIO-PREVIEWS:' + kind + ':END -->'
        source = (ROOT / 'src/previews' / ('previews.' + kind)).read_text(encoding='utf-8').rstrip()
        if page == 'explore':
            source += '\n' + (ROOT / 'src/previews' / ('reference.' + kind)).read_text(encoding='utf-8').rstrip()
        block = start + '\n<' + tag + '>\n' + source + '\n</' + tag + '>\n' + end
        if start in text:
            if text.count(start) != 1 or text.count(end) != 1:
                raise ValueError('Ambiguous preview slot: ' + page)
            text = re.sub(re.escape(start) + r'[\s\S]*?' + re.escape(end), lambda _: block, text)
        else:
            if text.count(boundary) != 1:
                raise ValueError('Missing preview boundary: ' + page)
            text = text.replace(boundary, block + '\n' + boundary)
    return path, before, text.encode('utf-8')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    results = [render(page) for page in PAGES]
    stale = [p.name for p, before, after in results if before != after]
    if args.check and stale:
        parser.exit(1, 'Visual preview source drift: ' + ', '.join(stale) + '\n')
    if not args.check:
        for path, before, after in results:
            if before != after:
                path.write_bytes(after)
    print('Visual previews synchronized across the app and eight sections.')

if __name__ == '__main__':
    main()
