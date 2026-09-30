# Single-file bundle vendor sources

This directory contains the exact, unmodified Three.js r160 (npm `three@0.160.0`) addon sources required by the Biology app's optional postprocessing. Only the recursive static import graph of EffectComposer, RenderPass, UnrealBloomPass, OutputPass, ShaderPass, GTAOPass, BokehPass, and SSAOPass is included.

Source package: https://registry.npmjs.org/three/-/three-0.160.0.tgz
Upstream: https://github.com/mrdoob/three.js/tree/r160/examples/jsm
Package integrity (verified before extraction): `sha512-DLU8lc0zNIPkM7rH5/e1Ks1Z8tWCGRq6g8mPowdDJpw1CFBJMU7UoJjC6PefXW7z//SSl0b2+GCw14LB+uDhng==`

License: MIT; copyright 2010–2023 three.js authors. The complete upstream license is preserved in `src/lab/vendor/THREE-LICENSE.txt` and was checked against the pinned package.

All relative imports resolve within this directory. Bare `three` imports use the existing vendored r160 core through the single-file application's import map. The bundle builder may rewrite import specifiers when embedding these sources; these source files remain byte-identical to the npm package.

Included files (18):

- `three-addons/math/SimplexNoise.js`
- `three-addons/postprocessing/BokehPass.js`
- `three-addons/postprocessing/EffectComposer.js`
- `three-addons/postprocessing/GTAOPass.js`
- `three-addons/postprocessing/MaskPass.js`
- `three-addons/postprocessing/OutputPass.js`
- `three-addons/postprocessing/Pass.js`
- `three-addons/postprocessing/RenderPass.js`
- `three-addons/postprocessing/SSAOPass.js`
- `three-addons/postprocessing/ShaderPass.js`
- `three-addons/postprocessing/UnrealBloomPass.js`
- `three-addons/shaders/BokehShader.js`
- `three-addons/shaders/CopyShader.js`
- `three-addons/shaders/GTAOShader.js`
- `three-addons/shaders/LuminosityHighPassShader.js`
- `three-addons/shaders/OutputShader.js`
- `three-addons/shaders/PoissonDenoiseShader.js`
- `three-addons/shaders/SSAOShader.js`
