# Prepared frog loader dependency

Added unchanged official Three.js **r160** files, matching the existing local
`three.module.min.js` revision 160. No CDN request is needed at runtime. The
existing `three` import map resolves both files to that same local module.

| Local file | Official source | SHA-256 |
| --- | --- | --- |
| `loaders/GLTFLoader.js` | https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/jsm/loaders/GLTFLoader.js | d073b438e6a07e1359741dd5d6c76c953420cc0d4fd84eb1bdde94315540e6a3 |
| `utils/BufferGeometryUtils.js` | https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/jsm/utils/BufferGeometryUtils.js | 9be041e96308775d00e2695cc607645b9a9b64fd7c0e759dd8f7c00a8d92becb |
| `THREE-LICENSE.txt` | https://raw.githubusercontent.com/mrdoob/three.js/r160/LICENSE | 852e0e8699169bf9f6fdc6bda3e682d078dcbc738b5d33e74df594721bff271d |

Retrieved 2026-09-06. MIT license is retained in `THREE-LICENSE.txt`.
No vendor file was modified. The app wrapper only accepts embedded core GLB,
not the loader's optional extensions, rigs, animations or remote asset features.
The ownership hook depends on this pinned loader's `register`/`getDependency`
behavior and must be re-reviewed before a version upgrade.
