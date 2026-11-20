# Biology compression parity audit — 20 November 2026

This historical audit applies to source commit `c95528f0d0abb125b3656a8e25aa81f685dc4c0c`, before the subsequent loading and navigation repair. It does not certify later artifacts.

The same exact Git export reproduced both recorded files:

| Build runtime | Bytes | SHA-256 |
| --- | ---: | --- |
| CPython 3.12.14 / zlib 1.3.2 | 44,920,068 | `86876591375ba9110bbe4ed4f18aba13a8a833c2eaf6d86ab299c78571f78ee5` |
| CPython 3.14.5 / zlib 1.3.1.zlib-ng | 44,988,000 | `e8bf0a8e9da95eaef7459de726f544daa26a41d1a938319d19b096a9a72e644e` |

The first matches the complete artifact hash recorded by GitHub Actions run `44702952067`; the second matches the local and native packaging input. Hosted HTML was not downloaded. CI used Python 3.15.2 and did not print its compressor version, so its backend is inferred from the exact reproduction rather than directly observed.

All 17 pages and 140 assets (including 37 deferred assets) decode to identical bytes: 72,234,768 bytes in total. Outer HTML, inline code, bridge and manifest metadata also match. The 122 differing compressed streams have identical fixed gzip headers. Checkout line endings and timestamps do not explain the difference.

For exact compressed artifact reproduction, record the source revision, Python and compression-library versions, and final artifact hash. A supplied, integrity-verified native bundle does not require regeneration on the Mac. Do not describe the packager as byte-deterministic across different compression backends.

Local executable paths used for reproduction:

- Standard zlib: `C:\Users\darsh\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`
- zlib-ng: `C:\Users\darsh\AppData\Local\Python\pythoncore-3.14-64\python.exe`

`compression-parity-evidence.json` contains per-payload decoded and compressed hashes. `compare-payloads.py` is the exact audit script; its input paths point to the preserved temporary Git exports recorded in that evidence.
