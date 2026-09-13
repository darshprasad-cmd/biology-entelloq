/* Prepared exterior format v1. NOT a loader, auto-fit or anatomy validator.
 * Call immediately after buildSpecimen, before strata/surface/softbody/cutting.
 * The already-parsed Group has extras {schemaVersion:1,specimenId}; its direct
 * Mesh children are exactly the names below. All transforms must be baked into
 * each existing part's LOCAL coordinate frame. No raw whole-animal overlay.
 * Loader callers must also reject glTF-result animations (clips can exist
 * outside scene.animations), extensions and unsafe URLs at their own boundary.
 *
 * We clone geometry/materials, but BORROW decoded static textures. Keep the
 * source textures/images alive until restore(); this adapter never disposes
 * them, original builder resources, or any organ. Tear down consumers first,
 * then restore() to return the original mesh resources and release our clones.
 */
export const PREPARED_EXTERIOR_PART_IDS = Object.freeze(Object.fromEntries(Object.entries({
  frog: ['skin', 'forelimb-left', 'forelimb-right', 'hindlimb-left', 'hindlimb-right'],
  cockroach: ['exoskeleton', 'pronotum', 'head', 'wing-left', 'wing-right'],
}).map(([id, parts]) => [id, Object.freeze(parts)])));

const PA_EYE_OWNERS = { frog: 'skin', cockroach: 'head' };
const PA_MAPS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap',
  'alphaMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
  'sheenColorMap', 'sheenRoughnessMap', 'specularColorMap', 'specularIntensityMap',
  'transmissionMap', 'thicknessMap', 'iridescenceMap', 'iridescenceThicknessMap', 'anisotropyMap'];
function PA_check(value, message) { if (!value) throw new Error('Prepared exterior: ' + message); }
function PA_record(value, keys, label) {
  PA_check(value && Object.getPrototypeOf(value) === Object.prototype, label + ' must be plain metadata');
  PA_check(Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k)), label + ' has unsupported/missing fields');
}
function PA_writable(object, key) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  PA_check(descriptor && Object.hasOwn(descriptor, 'value') && descriptor.writable, 'target ' + key + ' must be writable data');
}
function PA_identity(node) {
  PA_check(node.position.toArray().every(v => v === 0) && node.scale.toArray().every(v => v === 1)
    && node.quaternion.toArray().every((v, i) => v === (i === 3 ? 1 : 0))
    && node.matrix.elements.every((v, i) => Math.abs(v - (i % 5 === 0 ? 1 : 0)) < 1e-8),
  node.name + ': transforms must be identity; bake into part-local geometry');
  PA_check(node.visible && node.layers.mask === 1 && node.renderOrder === 0, node.name + ': hidden/layered/ordered source nodes unsupported');
  PA_check(Array.isArray(node.animations) && node.animations.length === 0, 'animations unsupported');
}
function PA_geometry(THREE, geometry, maxVertices, label) {
  PA_check(geometry instanceof THREE.BufferGeometry && !geometry.isInstancedBufferGeometry, label + ': static BufferGeometry required');
  PA_check(Object.keys(geometry.morphAttributes).length === 0 && !geometry.morphTargetsRelative, label + ': morph geometry unsupported');
  PA_check(Object.keys(geometry.attributes).sort().join(',') === 'normal,position,uv', label + ': exactly position/normal/uv required');
  const count = geometry.attributes.position.count;
  PA_check(Number.isInteger(count) && count >= 3 && count <= maxVertices, label + ': vertex budget exceeded or empty');
  for (const [name, size] of [['position', 3], ['normal', 3], ['uv', 2]]) {
    const attr = geometry.attributes[name];
    PA_check(attr instanceof THREE.BufferAttribute && !attr.isInterleavedBufferAttribute
      && attr.array instanceof Float32Array && attr.itemSize === size && !attr.normalized
      && attr.count === count && attr.array.length === count * size,
    label + ': ' + name + ' must be packed, non-normalized Float32 data');
    PA_check(attr.array.every(Number.isFinite), label + ': non-finite ' + name);
  }
  const p = geometry.attributes.position.array, n = geometry.attributes.normal.array;
  const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < count; i++) {
    const length = Math.hypot(n[i * 3], n[i * 3 + 1], n[i * 3 + 2]);
    PA_check(length > 0.9 && length < 1.1, label + ': normals must be unit length');
    for (let axis = 0; axis < 3; axis++) {
      const value = p[i * 3 + axis];
      PA_check(Math.abs(value) <= 32, label + ': coordinates outside prepared local-frame budget');
      low[axis] = Math.min(low[axis], value); high[axis] = Math.max(high[axis], value);
    }
  }
  const span = high.map((v, i) => v - low[i]);
  PA_check(Math.max(...span) > 1e-5, label + ': degenerate bounds');
  const index = geometry.index;
  PA_check(index instanceof THREE.BufferAttribute && !index.isInterleavedBufferAttribute
    && (index.array instanceof Uint16Array || index.array instanceof Uint32Array)
    && index.itemSize === 1 && !index.normalized && index.count === index.array.length
    && index.count >= 3 && index.count <= maxVertices * 6 && index.count % 3 === 0,
  label + ': bounded packed triangle indices required');
  PA_check(index.array.every(v => v < count), label + ': index outside vertex range');
  PA_check(geometry.drawRange.start === 0 && (geometry.drawRange.count === Infinity || geometry.drawRange.count === index.count), label + ': partial draw range unsupported');
  PA_check(geometry.groups.length === 0 || (geometry.groups.length === 1 && geometry.groups[0].start === 0
    && geometry.groups[0].count === index.count && geometry.groups[0].materialIndex === 0), label + ': multiple/partial material groups unsupported');
  return { low, high, span };
}
function PA_material(THREE, material, textures, label) {
  PA_check(material instanceof THREE.MeshStandardMaterial && !Array.isArray(material), label + ': one PBR material required');
  PA_check(material.visible && !material.wireframe && !material.displacementMap && !material.bumpMap,
    label + ': hidden/wireframe/displaced material unsupported');
  for (const key of ['roughness', 'metalness', 'opacity', 'alphaTest'])
    PA_check(Number.isFinite(material[key]) && material[key] >= 0 && material[key] <= 1, label + ': invalid ' + key);
  for (const [key, value] of Object.entries(material)) {
    if (typeof value === 'number') PA_check(Number.isFinite(value) || (key === 'attenuationDistance' && value === Infinity), label + ': non-finite material ' + key);
    if (value?.isColor) PA_check([value.r, value.g, value.b].every(v => Number.isFinite(v) && v >= 0), label + ': invalid material color');
    if (value?.isVector2) PA_check([value.x, value.y].every(Number.isFinite), label + ': invalid material vector');
    if (value?.isTexture) PA_check(PA_MAPS.includes(key), label + ': unsupported material texture slot ' + key);
  }
  PA_check(material.opacity > 0 && material.emissive.r === 0 && material.emissive.g === 0 && material.emissive.b === 0,
    label + ': material must render and leave emissive available for tool feedback');
  PA_check(material.map?.isTexture, label + ': decoded base-color texture required');
  for (const key of PA_MAPS) {
    const texture = material[key]; if (!texture) continue;
    PA_check(texture instanceof THREE.Texture && !texture.isVideoTexture && !texture.isCubeTexture
      && !texture.isCompressedTexture && !texture.isData3DTexture && !texture.isDataArrayTexture
      && !texture.isRenderTargetTexture, label + ': only decoded static 2D textures supported');
    const image = texture.image;
    PA_check(image && Number.isInteger(image.width) && Number.isInteger(image.height)
      && image.width > 0 && image.height > 0 && image.width <= 4096 && image.height <= 4096,
    label + ': texture is undecoded or exceeds 4096px');
    PA_check([texture.offset.x, texture.offset.y, texture.repeat.x, texture.repeat.y,
      texture.center.x, texture.center.y, texture.rotation, ...texture.matrix.elements].every(Number.isFinite), label + ': invalid texture transform');
    PA_check(texture.channel === 0, label + ': only UV channel zero supported');
    textures.add(texture);
  }
}

export function installPreparedExterior(THREE, { specimenId, parts, prepared } = {}) {
  PA_check(Object.hasOwn(PREPARED_EXTERIOR_PART_IDS, specimenId), 'unknown specimen');
  const ids = PREPARED_EXTERIOR_PART_IDS[specimenId];
  PA_check(Array.isArray(parts), 'parts must be the existing descriptor array');
  PA_check(prepared instanceof THREE.Group && !prepared.isScene && prepared.parent === null, 'detached parsed Group required, not Scene');
  PA_record(prepared.userData, ['schemaVersion', 'specimenId'], 'root extras');
  PA_check(prepared.userData.schemaVersion === 1 && prepared.userData.specimenId === specimenId, 'schema/specimen mismatch');
  PA_identity(prepared);
  PA_check(prepared.children.length === ids.length, 'complete exterior root set required');
  const partMap = new Map(), rootMap = new Map(), textures = new Set(), descriptors = new Set();
  for (const part of parts) {
    PA_check(part && typeof part.id === 'string' && !partMap.has(part.id) && part.mesh?.isMesh && !descriptors.has(part.mesh), 'duplicate/invalid functional part');
    partMap.set(part.id, part); descriptors.add(part.mesh);
  }
  for (const mesh of prepared.children) {
    PA_check(ids.includes(mesh.name) && !rootMap.has(mesh.name), 'unknown/duplicate exterior root ' + mesh.name);
    rootMap.set(mesh.name, mesh);
  }
  const plans = [];
  for (const id of ids) {
    const part = partMap.get(id), source = rootMap.get(id);
    PA_check(part && source, 'missing required exterior ' + id);
    const target = part.mesh;
    PA_check(target instanceof THREE.Mesh && target.userData.partId === id && !target.userData.preparedExterior
      && !target.userData.peelable && !target.isSkinnedMesh && !target.isInstancedMesh, id + ': target must be an untouched functional root');
    for (const key of ['geometry', 'material', 'userData']) PA_writable(target, key);
    PA_check(Object.isExtensible(target.userData) && !Object.isFrozen(target.children), id + ': immutable target');
    const descendants = [...target.children];
    while (descendants.length) { const child = descendants.pop(); PA_check(!descriptors.has(child), id + ': cannot replace nested functional parts'); descendants.push(...child.children); }
    PA_check(source.constructor === THREE.Mesh && !source.isSkinnedMesh && !source.isInstancedMesh
      && !source.morphTargetInfluences && Object.keys(source.userData).length === 0, id + ': static root Mesh without extra metadata required');
    PA_identity(source);
    const bounds = PA_geometry(THREE, source.geometry, 9000, id);
    PA_material(THREE, source.material, textures, id);
    PA_check(source.children.length <= 2, id + ': too many decorative children');
    const eyeNames = new Set();
    for (const eye of source.children) {
      PA_check(PA_EYE_OWNERS[specimenId] === id && eye.constructor === THREE.Mesh && eye.children.length === 0
        && ['eye-left', 'eye-right'].includes(eye.name) && !eyeNames.has(eye.name) && !eye.morphTargetInfluences,
      id + ': only named leaf eye details are supported');
      PA_record(eye.userData, ['preparedExterior'], 'eye extras');
      PA_record(eye.userData.preparedExterior, ['role', 'kind', 'ownerPartId'], 'eye detail metadata');
      PA_check(eye.userData.preparedExterior.role === 'detail' && eye.userData.preparedExterior.kind === 'eye'
        && eye.userData.preparedExterior.ownerPartId === id, 'eye owner/role mismatch');
      PA_identity(eye);
      const detailBounds = PA_geometry(THREE, eye.geometry, 1024, eye.name);
      const extent = Math.max(...bounds.span);
      PA_check(Math.max(...detailBounds.span) <= extent * 0.15
        && detailBounds.low.every((v, i) => v >= bounds.low[i] - extent * 0.06)
        && detailBounds.high.every((v, i) => v <= bounds.high[i] + extent * 0.06), 'eye geometry cannot form a body-covering overlay');
      // Frog long axis is local Z: restrict eyes to the preserved head end.
      if (specimenId !== 'cockroach') PA_check(detailBounds.low[2] >= bounds.low[2] + bounds.span[2] * 0.74, 'eye detail must stay at preserved head end');
      PA_material(THREE, eye.material, textures, eye.name); eyeNames.add(eye.name);
    }
    plans.push({ id, target, source, original: { geometry: target.geometry, material: target.material,
      children: [...target.children], tag: Object.getOwnPropertyDescriptor(target.userData, 'preparedExterior') } });
  }
  PA_check(textures.size <= 32 && [...textures].reduce((sum, t) => sum + t.image.width * t.image.height, 0) <= 64 * 1024 * 1024, 'total texture budget exceeded');
  // No live object has been mutated above. Allocate every clone before commit.
  const ownedGeometry = [], ownedMaterials = [];
  const release = () => { ownedGeometry.splice(0).forEach(g => g.dispose()); ownedMaterials.splice(0).forEach(m => m.dispose()); };
  const cloneMesh = (source, owner, detail) => {
    const geometry = source.geometry.clone(); ownedGeometry.push(geometry);
    const material = source.material.clone(); ownedMaterials.push(material);
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material); mesh.name = source.name;
    mesh.userData.preparedExterior = { schemaVersion: 1, specimenId, partId: owner, role: detail ? 'detail' : 'part' };
    if (detail) {
      mesh.userData.exteriorDetail = 'eye';
      // Intentionally no partId/noPick: nonrecursive tool picking excludes this
      // detail, while cutting's residual-shell ownership must retain the eye.
      mesh.raycast = () => {};
    }
    return mesh;
  };
  const assignChildren = (target, children) => {
    // Pre-consumer transaction: preserve the root's child-array identity without
    // dispatching arbitrary add/remove listeners midway through the swap.
    target.children.forEach(child => { child.parent = null; });
    target.children.splice(0, target.children.length, ...children);
    children.forEach(child => { child.parent = target; });
  };
  const reset = plan => {
    const { target, original } = plan;
    target.geometry = original.geometry; target.material = original.material;
    assignChildren(target, original.children);
    if (original.tag) Object.defineProperty(target.userData, 'preparedExterior', original.tag);
    else delete target.userData.preparedExterior;
  };
  const committed = [];
  try {
    for (const plan of plans) {
      plan.copy = cloneMesh(plan.source, plan.id, false);
      plan.details = plan.source.children.map(eye => cloneMesh(eye, plan.id, true));
    }
    for (const plan of plans) {
      committed.push(plan);
      plan.target.geometry = plan.copy.geometry; plan.target.material = plan.copy.material;
      assignChildren(plan.target, plan.details);
      plan.target.userData.preparedExterior = plan.copy.userData.preparedExterior;
    }
  } catch (error) { committed.reverse().forEach(reset); release(); throw error; }
  let active = true;
  return Object.freeze({ specimenId, partIds: ids, restore() {
    if (!active) return;
    plans.forEach(reset); active = false; release();
  } });
}
