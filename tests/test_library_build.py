import importlib.util
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
def load(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/f'{name}.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module

class LibraryBuild(unittest.TestCase):
    def test_library_slots_are_complete_and_idempotent(self):
        builder=load('build-library')
        for page in ('learn','labs','app'):
            target,before,after=builder.render(page)
            self.assertEqual(before,after,'Run python scripts/build-library.py')
            self.assertEqual(target,ROOT/(page+'.html'))
            self.assertEqual(after.count(('<!-- BIO-LIBRARY:'+page+'-script:START -->').encode()),1)

    def test_launch_background_is_shared_with_no_changes_to_immersive_worlds(self):
        builder=load('build-background')
        self.assertNotIn('lab',builder.PAGES);self.assertNotIn('universe',builder.PAGES);self.assertNotIn('index',builder.PAGES)
        for page in builder.PAGES:
            _,before,after=builder.render(page);self.assertEqual(before,after,'Run python scripts/build-background.py')
        source=(ROOT/'src/library/backdrop.js').read_text(encoding='utf-8')
        self.assertIn('assets/biology-dna-hero.webp',source)
        self.assertIn('bioq_landing_motion',source)

    def test_original_learn_interactives_still_exist(self):
        page=(ROOT/'learn.html').read_text(encoding='utf-8')
        for name in ('catalog','cell','microscope','cellLegend','specSVG'):
            self.assertIn('id="'+name+'"',page)

if __name__=='__main__':unittest.main()
