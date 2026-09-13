"""Build Learn/Lab additions into explicit slots while preserving existing page chrome.

The published root HTML remains standalone. This build reads only repository
sources, never Downloads; --check reports drift without writing.
"""
import argparse
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / 'src/library'


def source(name):
    return (LIB / name).read_text(encoding='utf-8').rstrip() + '\n'


def slot(text, name, body, before):
    start, end = '<!-- BIO-LIBRARY:' + name + ':START -->', '<!-- BIO-LIBRARY:' + name + ':END -->'
    block = start + '\n' + body + end
    if start in text:
        if text.count(start) != 1 or text.count(end) != 1:
            raise ValueError('Ambiguous library slot: ' + name)
        return re.sub(re.escape(start) + r'[\s\S]*?' + re.escape(end), lambda _: block, text)
    if text.count(before) != 1:
        raise ValueError('Missing or ambiguous insertion boundary: ' + before)
    return text.replace(before, block + '\n' + before)


def render(page):
    path = ROOT / (page + '.html')
    before = path.read_bytes()
    text = before.decode('utf-8').replace('\r\n', '\n')
    if page == 'app':
        text = slot(text, 'app-script', '<script>\n' + source('app-library.js') + '</script>\n', '</body>')
        return path, before, text.encode('utf-8')
    styles = source('shared.css')
    scripts = source('context.js')
    if page == 'learn':
        styles += source('learn.css')
        scripts += source('topics.js') + source('visuals.js') + source('learn.js')
        if '<!-- BIO-LIBRARY:learn-main:START -->' in text:
            text = slot(text, 'learn-main', source('learn-main.html'), '<main id="page">')
        # Mount immediately inside main, before the existing Learn experiences.
        if '<!-- BIO-LIBRARY:learn-main:START -->' not in text:
            mount = '<!-- BIO-LIBRARY:learn-main:START -->\n' + source('learn-main.html') + '<!-- BIO-LIBRARY:learn-main:END -->'
            if text.count('<main id="page">') != 1:
                raise ValueError('Learn main boundary is missing')
            text = text.replace('<main id="page">', '<main id="page">\n' + mount)
        # Preserve the original catalog/cell/microscope and their JS unchanged.
    elif page == 'labs':
        styles += source('notebook.css') + source('experiments.css')
        scripts += source('notebook.js') + source('lab-metadata.js') + source('experiments.js') + source('investigations.js')
        # Replace only the existing canonical bench and shell module bodies.
        for name in ('_labs.js', '_lab_bench.js', '_lab_ecology.js', '_lab_molecular.js', '_lab_physiology.js'):
            pattern = re.compile(r'(^/\* ===== ' + re.escape(name) + r' ===== \*/\n)[\s\S]*?(?=^/\* ===== [\w.-]+ ===== \*/|^</script>)', re.M)
            if len(pattern.findall(text)) != 1:
                raise ValueError('Missing canonical lab source slot: ' + name)
            content = (LIB / 'labs.js' if name == '_labs.js' else ROOT / 'src' / name).read_text(encoding='utf-8').rstrip()
            text = pattern.sub(lambda m: m[1] + content + '\n\n', text)
    else:
        raise ValueError('Unsupported library build target')
    text = slot(text, page + '-style', '<style>\n' + styles + '</style>\n', '</head>')
    text = slot(text, page + '-script', '<script>\n' + scripts + '</script>\n', '</body>')
    return path, before, text.encode('utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    results = [render(page) for page in ('learn', 'labs', 'app')]
    stale = [p.name for p, before, after in results if before != after]
    if args.check and stale:
        parser.exit(1, 'Library build drift: ' + ', '.join(stale) + '\n')
    if not args.check:
        for p, before, after in results:
            if before != after:
                p.write_bytes(after)
    print('Learn/Lab library source slots are in sync.')


if __name__ == '__main__':
    main()
