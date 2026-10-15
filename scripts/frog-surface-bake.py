"""Geometry-derived surface bake; invoked by prepare-frog-asset.py --surface-only.

Append material maps to the existing GLB. Never re-export functional geometry.
"""
import hashlib
import json
import struct
import tempfile
from pathlib import Path
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree


def enhance_existing_surface(source, output, report_dir, log):
    original = output.read_bytes()
    size = struct.unpack_from('<I', original, 12)[0]
    doc = json.loads(original[20:20 + size])
    binary = original[28 + size:]
    baseline = doc.get('asset', {}).get('extras', {}).get('surfaceBakeBaseline')
    if baseline:
        binary = binary[:baseline['binaryBytes']]
        assert hashlib.sha256(binary).hexdigest() == baseline['binarySHA256']
        doc['bufferViews'] = doc['bufferViews'][:baseline['bufferViews']]
        doc['images'] = doc['images'][:1]
        doc['textures'] = doc['textures'][:1]
    else:
        assert hashlib.sha256(original).hexdigest() == '64ccc2056475153d70b5f68a2b3b94ff075f0491c63c76a65b7157e7f7c349bc', 'Use the reviewed fitted frog as the first surface-bake input'
        baseline = {'glbSHA256': hashlib.sha256(original).hexdigest(), 'binaryBytes': len(binary),
                    'binarySHA256': hashlib.sha256(binary).hexdigest(), 'bufferViews': len(doc['bufferViews'])}
    material = doc['materials'][0]
    material.pop('normalTexture', None)
    material['pbrMetallicRoughness'].pop('metallicRoughnessTexture', None)
    prep = json.loads((report_dir / 'preparation.json').read_text(encoding='utf-8'))
    sx, sy, sz = prep['frame']['scale']
    frames = {name: Matrix(rows) for name, rows in prep['existing_root_matrices'].items()}

    def accessor(index):
        a = doc['accessors'][index]; view = doc['bufferViews'][a['bufferView']]
        dtype = {5126: '<f4', 5125: '<u4', 5123: '<u2'}[a['componentType']]
        width = {'VEC3': 3, 'VEC2': 2, 'SCALAR': 1}[a['type']]
        return np.frombuffer(binary, dtype=dtype, count=a['count'] * width,
                             offset=view.get('byteOffset', 0) + a.get('byteOffset', 0)).reshape(-1, width).copy()

    positions, normals, uvs, faces = [], [], [], []
    for mesh in doc['meshes']:
        p = mesh['primitives'][0]; frame = frames[mesh['name']]
        offset = len(positions)
        positions.extend(tuple(frame @ Vector(v)) for v in accessor(p['attributes']['POSITION']))
        normal_matrix = frame.to_3x3().inverted().transposed()
        normals.extend(tuple((normal_matrix @ Vector(v)).normalized()) for v in accessor(p['attributes']['NORMAL']))
        # glTF UV origin is opposite to Blender's image/UV convention.
        uvs.extend((float(v[0]), 1 - float(v[1])) for v in accessor(p['attributes']['TEXCOORD_0']))
        faces.extend(tuple(int(v) + offset for v in tri) for tri in accessor(p['indices']).reshape(-1, 3))

    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source))
    high_parts = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    chart = [obj for obj in high_parts if len(obj.data.vertices) == 24 and len(obj.data.polygons) == 12]
    assert len(high_parts) == 19 and len(chart) == 1
    high_parts.remove(chart[0]); bpy.data.objects.remove(chart[0], do_unlink=True)
    mapping = Matrix(((0, sx, 0, 0), (0, 0, -sy, 0), (-sz, 0, 0, 0), (0, 0, 0, 1)))
    for obj in high_parts:
        obj.data.transform(mapping @ obj.matrix_world)
        obj.parent = None; obj.matrix_world = Matrix.Identity(4)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in high_parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = high_parts[0]; bpy.ops.object.join()
    high = bpy.context.object; high.name = 'Original scan normal bake source'
    # Recover only the original translation missing from the old report. Scale
    # and axes stay fixed. This aligns the bake source, never the shipped mesh.
    vertices = [v.co.copy() for v in high.data.vertices]
    tree = BVHTree.FromPolygons(vertices, [tuple(p.vertices) for p in high.data.polygons], all_triangles=True)
    low = np.asarray(positions); high_points = np.asarray([tuple(v) for v in vertices])
    translation = (low.min(axis=0) + low.max(axis=0) - high_points.min(axis=0) - high_points.max(axis=0)) * .5
    probes = low[::max(1, len(low) // 4000)]
    for iteration in range(16):
        a, b = [], []
        for point in probes:
            hit, normal, _, distance = tree.find_nearest(Vector(point - translation))
            if hit is not None and distance < .30:
                a.append(tuple(normal)); b.append(float(np.dot(point - translation - np.asarray(hit), normal)))
        assert len(a) > len(probes) * .95, 'Fitted surface does not align with locked scan'
        delta = np.linalg.lstsq(np.asarray(a), np.asarray(b), rcond=None)[0]; translation += delta
        if np.linalg.norm(delta) < 1e-6:
            break
    distances = np.asarray([tree.find_nearest(Vector(p - translation))[3] for p in probes])
    assert np.quantile(distances, .95) < .065 and distances.max() < .22, 'Scan alignment exceeds bake cage'
    expected_z = 4.55 + (prep['frame']['hip_source_x'] - 8.05 / sz) * sz
    assert abs(translation[2] - expected_z) < .012, 'Alignment disagrees with recorded longitudinal fit'
    high.data.transform(Matrix.Translation(Vector(translation)))
    del tree, vertices, high_points
    log('fixed mesh aligned to original scan', translation=translation.tolist(), p95_distance=float(np.quantile(distances, .95)), max_distance=float(distances.max()))

    mesh = bpy.data.meshes.new('Exact prepared UV bake target')
    mesh.from_pydata(positions, [], faces); mesh.update()
    uv_layer = mesh.uv_layers.new(name='Existing prepared UV')
    for face in mesh.polygons:
        face.use_smooth = True
        for loop in face.loop_indices:
            uv_layer.data[loop].uv = uvs[mesh.loops[loop].vertex_index]
    mesh.normals_split_custom_set([normals[loop.vertex_index] for loop in mesh.loops])
    target = bpy.data.objects.new('Temporary exact prepared surface', mesh); bpy.context.scene.collection.objects.link(target)
    bake_material = bpy.data.materials.new('Normal bake target only'); bake_material.use_nodes = True
    target.data.materials.append(bake_material)
    image = bpy.data.images.new('Frog original-scan tangent normals', 2048, 2048, alpha=True)
    image.colorspace_settings.name = 'Non-Color'
    node = bake_material.node_tree.nodes.new('ShaderNodeTexImage'); node.image = image
    bake_material.node_tree.nodes.active = node
    scene = bpy.context.scene; scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'; scene.cycles.samples = 1
    scene.render.threads_mode = 'FIXED'; scene.render.threads = 2
    scene.render.bake.normal_space = 'TANGENT'
    scene.render.bake.normal_r = 'POS_X'; scene.render.bake.normal_g = 'POS_Y'; scene.render.bake.normal_b = 'POS_Z'
    bpy.ops.object.select_all(action='DESELECT'); high.select_set(True); target.select_set(True)
    bpy.context.view_layer.objects.active = target
    log('baking geometry-derived tangent normals on unchanged UVs')
    bpy.ops.object.bake(type='NORMAL', use_selected_to_active=True, cage_extrusion=.12, max_ray_distance=.30, margin=8)
    pixels = np.empty(2048 * 2048 * 4, dtype=np.float32); image.pixels.foreach_get(pixels)
    pixels = pixels.reshape(-1, 4); covered = pixels[:, 3] > .5
    assert covered.mean() > .35, 'Normal bake produced an empty image'
    normal_xyz = pixels[covered, :3] * 2 - 1
    assert np.quantile(np.abs(np.linalg.norm(normal_xyz, axis=1) - 1), .95) < .04, 'Invalid baked normal vectors'
    assert np.std(normal_xyz[:, :2]) > .005, 'Normal bake lacks original scan relief'
    # Authored appearance modulation based on geometric relief, not measured
    # tissue roughness and never a fake normal map derived from skin colour.
    deviation = np.linalg.norm(pixels[:, :2] * 2 - 1, axis=1)
    roughness = .48 + .12 * np.clip(deviation / .45, 0, 1)
    packed = np.ones_like(pixels); packed[:, 1] = roughness; packed[:, 2] = 0
    rough = bpy.data.images.new('Frog restrained roughness from scan relief', 2048, 2048, alpha=False)
    rough.colorspace_settings.name = 'Non-Color'; rough.pixels.foreach_set(packed.ravel())
    pixels[~covered, :3] = [.5, .5, 1]; pixels[:, 3] = 1; image.pixels.foreach_set(pixels.ravel())
    blob = bytearray(binary)
    with tempfile.TemporaryDirectory(prefix='biology-frog-surface-') as temporary:
        for texture_image, name in [(image, 'Frog scan normal'), (rough, 'Frog scan relief roughness')]:
            filename = Path(temporary) / (name + '.png')
            texture_image.filepath_raw = str(filename); texture_image.file_format = 'PNG'; texture_image.save()
            png = filename.read_bytes(); blob.extend(b'\0' * ((-len(blob)) % 4))
            view_index = len(doc['bufferViews']); doc['bufferViews'].append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(png)})
            blob.extend(png); image_index = len(doc['images'])
            doc['images'].append({'name': name, 'mimeType': 'image/png', 'bufferView': view_index})
            texture = {'source': image_index}
            if 'sampler' in doc['textures'][0]:
                texture['sampler'] = doc['textures'][0]['sampler']
            doc['textures'].append(texture)
    material['normalTexture'] = {'index': 1, 'scale': .28}
    material['pbrMetallicRoughness']['metallicRoughnessTexture'] = {'index': 2}
    material['pbrMetallicRoughness']['roughnessFactor'] = 1
    doc['asset'].setdefault('extras', {})['surfaceBakeBaseline'] = baseline
    doc['buffers'][0]['byteLength'] = len(blob); blob.extend(b'\0' * ((-len(blob)) % 4))
    encoded = json.dumps(doc, separators=(',', ':')).encode('utf-8'); encoded += b' ' * ((-len(encoded)) % 4)
    result = struct.pack('<III', 0x46546c67, 2, 28 + len(encoded) + len(blob))
    result += struct.pack('<II', len(encoded), 0x4e4f534a) + encoded + struct.pack('<II', len(blob), 0x004e4942) + blob
    assert len(result) <= 32 * 1024 * 1024
    assert bytes(blob[:baseline['binaryBytes']]) == binary, 'Original geometry/colour payload changed'
    report = {'sourceSHA256': hashlib.sha256(source.read_bytes()).hexdigest(), 'baseline': baseline,
              'outputSHA256': hashlib.sha256(result).hexdigest(), 'outputBytes': len(result),
              'alignment': {'translation': translation.tolist(), 'p95Distance': float(np.quantile(distances, .95)), 'maxDistance': float(distances.max())},
              'normalMap': {'size': 2048, 'scale': .28, 'origin': 'Tangent normal bake from locked CC0 high-poly scan geometry'},
              'roughness': {'range': [.48, .60], 'origin': 'Authored restrained response to baked geometric relief; not measured roughness'},
              'preservation': 'All original BIN bytes retained, including fitted positions, indices, normals, UVs and original colour PNG. No mesh re-export, fitting, repartitioning or original-asset writes.'}
    output.write_bytes(result)
    (report_dir / 'surface-bake.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    log('surface maps appended; functional geometry unchanged', report=str(report_dir / 'surface-bake.json'), bytes=len(result))
