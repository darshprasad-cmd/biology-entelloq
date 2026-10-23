"""Reproducible CC0 microscopy reduction; no invented anatomy."""
import base64, hashlib, json, urllib.request
from pathlib import Path
import numpy as np
import tifffile

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://gitlab.com/scikit-image/data/-/raw/2cdc5ce89b334d28f06a58c9f0ca21aa6992a5ba/cells3d.tif'
cache = ROOT / '.cache/cells3d.tif'
cache.parent.mkdir(exist_ok=True)
if not cache.exists():
    urllib.request.urlretrieve(URL, cache)
raw = cache.read_bytes()
source_hash = hashlib.sha256(raw).hexdigest()
data = tifffile.imread(cache)
assert data.shape == (60, 2, 256, 256) and data.dtype == np.uint16
channels = []
for index, name in enumerate(['Cell membrane stain', 'Nuclear stain']):
    # Preserve Z; block-average 4x4 in XY. New centre offset is 1.5 * 0.26 µm.
    reduced = data[:,index].astype(np.float32).reshape(60,64,4,64,4).mean(axis=(2,4))
    cutoff = float(np.percentile(reduced, 99.7))
    display = np.clip(reduced / cutoff * 255, 0, 255).round().astype(np.uint8)
    channels.append({'name':name, 'sourceChannel':index, 'displayUpperOriginalIntensity':cutoff,
        'sha256':hashlib.sha256(display.tobytes()).hexdigest(), 'base64':base64.b64encode(display.tobytes()).decode()})
meta = {'title':'Cells in a fluorescence stack', 'source':URL, 'sourceSha256':source_hash,
    'provider':'Allen Institute for Cell Science / scikit-image sample data', 'license':'CC0-1.0',
    'licenseSource':'https://gitlab.com/scikit-image/data/-/blob/master/README.md',
    'spacingSource':'https://scikit-image.org/docs/stable/api/skimage.data.html#skimage.data.cells3d',
    'originalShapeZCYX':[60,2,256,256], 'dimensionsXYZ':[64,64,60], 'spacingXYZ_um':[1.04,1.04,0.29],
    'originXYZ_um':[0.39,0.39,0], 'orientation':'Dataset XYZ axes; no anatomical orientation claimed',
    'processing':'XY 4×4 block mean, Z unchanged; each channel display scaled 0 to its 99.7th percentile into uint8, high intensities clipped. Display intensities are not concentrations.',
    'channels':channels}
(ROOT/'assets/cells3d.json').write_text(json.dumps(meta,separators=(',',':')), encoding='utf-8')
manifest = {**meta, 'channels':[{k:v for k,v in c.items() if k != 'base64'} for c in channels]}
(ROOT/'assets/provenance.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
print(json.dumps({'sourceSha256':source_hash,'bytes':(ROOT/'assets/cells3d.json').stat().st_size}))
