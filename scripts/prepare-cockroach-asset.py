"""Prepare the reviewed cockroach exterior as five existing lab-local roots.

Blender --background --factory-startup --disable-autoexec --python this.py --
Downloads/cockroach.glb docs/specimen-exteriors/prepared/cockroach
Original asset is read-only. The GLB is a candidate, never a runtime install.
"""
import argparse
import hashlib
import json
import math
import struct
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

SOURCE_SHA = "027d5da04d25c77f7e4ef7fb38970f071934e8ce4dda5b44230134768631190a"
PARTS = ["exoskeleton", "pronotum", "head", "wing-left", "wing-right"]
# glTF/lab XYZ -> Blender XYZ. Exporter's Y-up conversion reverses this.
TO_BLENDER = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
Z_LANDMARKS = [(-.215, 4.9), (.115, 2.7), (.242, 1.8), (.592, .8), (1.602, -5.1), (1.795, -5.7), (1.91, -6.05)]


def args():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("asset", type=Path)
    p.add_argument("output", type=Path)
    p.add_argument("--resolution", type=int, default=800)
    p.add_argument("--samples", type=int, default=16)
    return p.parse_args(sys.argv[sys.argv.index("--") + 1:])


def bounds(points):
    values = list(points)
    return {"min": [min(v[i] for v in values) for i in range(3)], "max": [max(v[i] for v in values) for i in range(3)]}


def document(asset):
    with asset.open("rb") as stream:
        header = stream.read(20)
        if len(header) != 20 or struct.unpack_from("<II", header) != (0x46546C67, 2):
            raise ValueError("Expected reviewed GLB 2")
        size = struct.unpack_from("<I", header, 12)[0]
        result = json.loads(stream.read(size).decode("utf-8"))
    todo = [result]
    while todo:
        value = todo.pop()
        if isinstance(value, dict):
            if "uri" in value:
                raise ValueError("Only embedded GLB BIN assets are allowed")
            todo.extend(value.values())
        elif isinstance(value, list):
            todo.extend(value)
    return result


def finalize_material_factor(filename):
    """Blender renders the artistic multiplier but its exporter omits MixRGB.

    Encode that same standard glTF factor explicitly, without baking/replacing
    the source base-colour image. Preserve all existing binary chunks verbatim.
    """
    blob = filename.read_bytes()
    size, kind = struct.unpack_from("<II", blob, 12)
    assert kind == 0x4E4F534A
    data = json.loads(blob[20:20+size])
    assert len(data["materials"]) == 1
    data["materials"][0]["pbrMetallicRoughness"]["baseColorFactor"] = [.42, .52, .46, 1]
    data["asset"]["copyright"] = "Cockroach by CK (xcellf), CC BY 4.0. Modified for Biology Entelloq; see COCKROACH-ATTRIBUTION.md."
    data["asset"]["extras"] = {
        "author": "CK (https://sketchfab.com/xcellf)",
        "license": "CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/)",
        "source": "https://sketchfab.com/3d-models/cockroach-cead55b8aa8643d48d67240bad028592",
        "sourceSHA256": SOURCE_SHA,
        "modifications": "Static five-part lab-local fit; bounded leg reduction; PBR response adjustment. Original base-colour and normal texture bytes preserved."
    }
    encoded = json.dumps(data, separators=(",", ":")).encode("utf-8")
    encoded += b" " * ((-len(encoded)) % 4)
    tail = blob[20+size:]
    revised = struct.pack("<III", 0x46546C67, 2, 20+len(encoded)+len(tail))
    revised += struct.pack("<II", len(encoded), 0x4E4F534A) + encoded + tail
    filename.write_bytes(revised)


def lab_contract(repo):
    code = r"""const fs=require('fs'),path=require('path');(async()=>{
      const root=process.argv[1];const THREE=await import('data:text/javascript;base64,'+fs.readFileSync(path.join(root,'src/lab/vendor/three.module.min.js')).toString('base64'));
      const source=['anatomy','cockroach'].map(n=>fs.readFileSync(path.join(root,'src/lab',n+'.js'),'utf8')).join('\n').replace(/^export\s+/gm,'');
      const built=new Function('THREE',source+'\nreturn buildCockroach(THREE);')(THREE);built.group.updateMatrixWorld(true);
      const entries=built.parts.map(p=>{p.mesh.updateMatrix();p.mesh.geometry.computeBoundingBox();return {id:p.id,layer:p.layer,system:p.system,cuttable:p.cuttable,detachable:p.detachable,matrix:p.mesh.matrix.toArray(),position:p.mesh.position.toArray(),bounds:{min:p.mesh.geometry.boundingBox.min.toArray(),max:p.mesh.geometry.boundingBox.max.toArray()}}});
      console.log(JSON.stringify({parts:entries,sourceSHA256:require('crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'src/lab/cockroach.js'))).digest('hex')}));
    })().catch(e=>{console.error(e);process.exit(1)});"""
    result = subprocess.run(["node", "-e", code, str(repo)], capture_output=True, text=True, timeout=30, check=True)
    return json.loads(result.stdout)


def measured_components(mesh, world):
    parent = list(range(len(world)))
    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    def join(a, b):
        parent[find(a)] = find(b)
    # Diagnostic connectivity across coincident UV/normal splits only. UVs and
    # render vertices are NOT welded, remapped, projected or regenerated.
    seen = {}
    for i, point in enumerate(world):
        key = tuple(round(float(v) / 3e-6) for v in point)
        if key in seen:
            join(i, seen[key])
        else:
            seen[key] = i
    for edge in mesh.edges:
        join(*edge.vertices)
    vertices, faces = defaultdict(list), defaultdict(list)
    for v in mesh.vertices:
        vertices[find(v.index)].append(v.index)
    for face in mesh.polygons:
        ids = {find(i) for i in face.vertices}
        if len(ids) != 1:
            raise ValueError("A face crosses semantic component boundaries")
        faces[next(iter(ids))].append(face.index)
    result = []
    for key, indices in vertices.items():
        if not faces[key]:
            continue
        box = bounds(world[i] for i in indices)
        result.append({"vertices": indices, "faces": faces[key], "bounds": box,
                       "centroid": list(sum((world[i] for i in indices), Vector()) / len(indices))})
    return sorted(result, key=lambda c: (-len(c["vertices"]), c["centroid"][0]))


def classify(component):
    box, n = component["bounds"], len(component["vertices"])
    low, high = box["min"], box["max"]
    if n == 498 and high[1] - low[1] > 1.4 and low[2] > .60:
        return "wing-left" if component["centroid"][0] < .00195 else "wing-right", "paired elongated tegmen island"
    if n == 594 and low[1] < -.12 and high[1] < .37 and low[2] > .73:
        return "pronotum", "broad anterior dorsal hood, measured source shield"
    if high[1] < -.01:
        return "head", "anterior capsule/eye/antenna/mouthpart island"
    is_leg = n in [1047, 1049] and low[2] < .01 and high[2] < .70
    return "exoskeleton", "walking leg" if is_leg else "thorax/abdominal shell or posterior appendage"


def longitudinal(y):
    pair = (Z_LANDMARKS[0], Z_LANDMARKS[1])
    if y >= Z_LANDMARKS[-1][0]:
        pair = (Z_LANDMARKS[-2], Z_LANDMARKS[-1])
    else:
        for a, b in zip(Z_LANDMARKS, Z_LANDMARKS[1:]):
            if a[0] <= y <= b[0]:
                pair = (a, b)
                break
    a, b = pair
    derivative = (b[1] - a[1]) / (b[0] - a[0])
    return a[1] + (y - a[0]) * derivative, derivative


def fitted(point):
    z, dz = longitudinal(point.y)
    result = Vector(((point.x - .0019485) * 4.5, (point.z - .388) * 1.7 - .14, z))
    derivative = Matrix(((4.5, 0, 0), (0, 0, 1.7), (0, dz, 0)))
    return result, derivative


def extract_component(source, world, component, name):
    remap = {old: i for i, old in enumerate(component["vertices"])}
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(world[i]) for i in component["vertices"]], [],
                     [tuple(remap[i] for i in source.polygons[f].vertices) for f in component["faces"]])
    mesh.update()
    uv = mesh.uv_layers.new(name="UVMap")
    normals = []
    # source is evaluated in its object's local frame; caller supplies its world
    # normal transform separately, just as positions already use matrix_world.
    for face, original_face in zip(mesh.polygons, component["faces"]):
        original = source.polygons[original_face]
        face.use_smooth = True
        for loop, source_loop in zip(face.loop_indices, original.loop_indices):
            uv.data[loop].uv = source.uv_layers.active.data[source_loop].uv
            normals.append(source.corner_normals[source_loop].vector.copy())
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj, normals


def prepare_material(source):
    material = source.copy()
    material.name = "Cockroach preserved PBR"
    principled = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    rough_socket = principled.inputs["Roughness"]
    if not rough_socket.is_linked:
        raise ValueError("Reviewed source unexpectedly has no roughness texture")
    # Preserve authored texture detail, while changing only PBR response. The
    # original source's vivid orange and strong specular/normal response look
    # varnished under neutral lab lighting. This is an artistic material grade,
    # not a species-colour measurement. Chitin is a dielectric, not a metal.
    base = principled.inputs["Base Color"]
    original_color = base.links[0].from_socket
    grade = material.node_tree.nodes.new("ShaderNodeMixRGB")
    grade.blend_type = "MULTIPLY"
    grade.inputs[0].default_value = 1
    grade.inputs[2].default_value = (.42, .52, .46, 1)
    material.node_tree.links.new(original_color, grade.inputs[1])
    material.node_tree.links.new(grade.outputs[0], base)
    metallic = principled.inputs["Metallic"]
    for link in list(metallic.links):
        material.node_tree.links.remove(link)
    metallic.default_value = 0
    for node in material.node_tree.nodes:
        if node.type == "NORMAL_MAP":
            node.inputs["Strength"].default_value = .45
    # Keep the original roughness modulation and lift its minimum smoothly.
    # A uniform floor erased the entire range and looked chalky; affine mapping
    # retains the authored differences rather than flattening most texels.
    image_node = next(node for node in material.node_tree.nodes if node.type == "TEX_IMAGE" and node.image and node.image.name == "Image_1")
    original = image_node.image
    import array
    pixels = array.array("f", [0.0]) * (original.size[0] * original.size[1] * 4)
    original.pixels.foreach_get(pixels)
    original_range = [min(pixels[1::4]), max(pixels[1::4])]
    preserved_channels = {str(channel): hashlib.sha256(pixels[channel::4].tobytes()).hexdigest() for channel in (0, 2, 3)}
    changed = 0
    for i in range(1, len(pixels), 4):
        pixels[i] = .18 + pixels[i] * .65
        changed += 1
    if any(hashlib.sha256(pixels[channel::4].tobytes()).hexdigest() != preserved_channels[str(channel)] for channel in (0, 2, 3)):
        raise ValueError("A non-roughness texture channel changed")
    revised = bpy.data.images.new("Cockroach_roughness_preserved_detail", width=original.size[0], height=original.size[1], alpha=True)
    revised.colorspace_settings.name = original.colorspace_settings.name
    revised.pixels.foreach_set(pixels)
    revised.file_format = "PNG"
    revised.pack()
    image_node.image = revised
    return material, {"base_colour_linear_multiplier": [.42, .52, .46], "metallic_factor": 0, "normal_scale": .45,
                      "roughness_mapping": "0.18 + source * 0.65", "source_range": original_range, "prepared_range": [min(pixels[1::4]), max(pixels[1::4])],
                      "unchanged_channel_sha256": preserved_channels, "changed_texels": changed, "total_texels": original.size[0] * original.size[1],
                      "change": "Authored base-colour/normal images and UVs retained; material factors grade chitin. Roughness G lifted with variation retained; source R/B/A texture channels unchanged."}


def main():
    options = args()
    asset, output = options.asset.resolve(strict=True), options.output.resolve()
    if output == asset.parent or not 256 <= options.resolution <= 1200 or not 1 <= options.samples <= 32:
        raise ValueError("Use a separate output directory and bounded preview settings")
    digest = hashlib.sha256(asset.read_bytes()).hexdigest()
    if digest != SOURCE_SHA:
        raise ValueError("This semantic preparation is locked to the reviewed cockroach source SHA")
    document(asset)
    repo = Path(__file__).resolve().parent.parent
    contract = lab_contract(repo)
    roots = {p["id"]: p for p in contract["parts"] if p["id"] in PARTS}
    if set(roots) != set(PARTS):
        raise ValueError("Existing lab exterior contract changed")
    matrices = {name: Matrix([[roots[name]["matrix"][c * 4 + r] for c in range(4)] for r in range(4)]) for name in PARTS}
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(asset))
    for rig in [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]:
        rig.data.pose_position = "REST"
    bpy.context.view_layer.update()
    source_obj = max((obj for obj in bpy.context.scene.objects if obj.type == "MESH"), key=lambda o: len(o.data.vertices))
    evaluated = source_obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    source = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=bpy.context.evaluated_depsgraph_get())
    world = [source_obj.matrix_world @ v.co for v in source.vertices]
    world_normal = source_obj.matrix_world.to_3x3().inverted().transposed()
    components = measured_components(source, world)
    if len(components) != 40:
        raise ValueError("Reviewed geometric island count changed")
    material, material_change = prepare_material(source_obj.data.materials[0])
    by_part, partition = defaultdict(list), []
    for i, component in enumerate(components):
        part, reason = classify(component)
        obj, normals = extract_component(source, world, component, "component-" + str(i))
        obj.data.normals_split_custom_set([(world_normal @ n).normalized() for n in normals])
        obj.data.materials.append(material)
        before_vertices = len(obj.data.vertices)
        if reason == "walking leg":
            bpy.context.view_layer.objects.active = obj
            modifier = obj.modifiers.new("Bounded leg reduction", "DECIMATE")
            modifier.ratio = .65
            modifier.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        inverse = matrices[part].inverted()
        # Record original smooth corner normals before changing vertex positions.
        smooth = [n.vector.copy() for n in obj.data.corner_normals]
        derivatives = []
        for vertex in obj.data.vertices:
            position, derivative = fitted(vertex.co)
            derivatives.append(derivative)
            vertex.co = TO_BLENDER @ (inverse @ position)
        transformed_normals = []
        for loop, normal in zip(obj.data.loops, smooth):
            global_normal = derivatives[loop.vertex_index].inverted().transposed() @ normal
            local_normal = matrices[part].to_3x3().transposed() @ global_normal
            transformed_normals.append((TO_BLENDER.to_3x3() @ local_normal).normalized())
        obj.data.update()
        obj.data.normals_split_custom_set(transformed_normals)
        by_part[part].append(obj)
        partition.append({"component": i, "part": part, "reason": reason, "source_vertices": before_vertices,
                          "prepared_vertices_before_join": len(obj.data.vertices), "source_world_bounds": component["bounds"]})
    if any(len(by_part[key]) != 1 for key in ["pronotum", "wing-left", "wing-right"]):
        raise ValueError("Semantic shield/wing partition is ambiguous")
    if sum(p["reason"] == "walking leg" for p in partition) != 6:
        raise ValueError("Expected exactly six measured walking-leg components")
    prepared = {}
    for part in PARTS:
        bpy.ops.object.select_all(action="DESELECT")
        for obj in by_part[part]:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = by_part[part][0]
        bpy.ops.object.join()
        obj = bpy.context.object
        obj.name = obj.data.name = part
        obj.data.materials.clear()
        obj.data.materials.append(material)
        for face in obj.data.polygons:
            face.material_index = 0
        prepared[part] = obj
    evaluated.to_mesh_clear()
    root = bpy.data.objects.new("cockroach", None)
    root["schemaVersion"], root["specimenId"] = 1, "cockroach"
    bpy.context.scene.collection.objects.link(root)
    for obj in prepared.values():
        obj.parent = root
        obj.matrix_basis = Matrix.Identity(4)
    output.mkdir(parents=True, exist_ok=True)
    filename = output / "cockroach-prepared.glb"
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in prepared.values():
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(filename), export_format="GLB", use_selection=True,
                             export_texcoords=True, export_normals=True, export_tangents=False,
                             export_materials="EXPORT", export_image_format="AUTO", export_animations=False,
                             export_skins=False, export_morph=False, export_extras=True, export_yup=True)
    finalize_material_factor(filename)
    checker = subprocess.run(["node", str(repo / "scripts/inspect-specimen-asset.cjs"), str(filename)], capture_output=True, text=True, timeout=30)
    intake = json.loads(checker.stdout)
    if not intake.get("valid"):
        raise ValueError("Prepared GLB failed intake: " + str(intake))
    exported = document(filename)
    mesh_nodes = [node for node in exported["nodes"] if "mesh" in node]
    if {node["name"] for node in mesh_nodes} != set(PARTS):
        raise ValueError("Exported names do not match the five-root contract")
    for node in mesh_nodes:
        if any(key in node for key in ["matrix", "translation", "rotation", "scale", "skin", "children"]):
            raise ValueError("Root mesh has unexpected transform/hierarchy")
    for mesh in intake["meshes"]:
        if len(mesh["primitives"]) != 1 or mesh["primitives"][0]["vertices"] > 9000 or mesh["primitives"][0]["indices"] > 54000:
            raise ValueError("Prepared part exceeds material/geometry budget: " + mesh["name"])
    report = {"status": "Prepared candidate for runtime/visual review; not installed", "source": str(asset), "source_sha256": digest,
              "prepared": str(filename), "prepared_sha256": hashlib.sha256(filename.read_bytes()).hexdigest(),
              "schemaVersion": 1, "specimenId": "cockroach", "builder_contract": contract,
              "partition": partition, "material_change": material_change, "intake": intake,
              "source_to_lab_fit": {"x_scale": 4.5, "source_x_center": .0019485, "y_from_source_z": {"center": .388, "scale": 1.7, "offset": -.14}, "z_landmarks": Z_LANDMARKS},
              "limitations": ["Original exterior rig removed after rest-pose baking; no new internal anatomy.", "Piecewise longitudinal fitting preserves existing lab organ/root anchors, but changes source proportions.", "Source wing undersides are retained, not invented internal hindwings.", "Runtime cutting, shadow, material ownership and performance still require integration tests."],
              "renders": []}
    # Preview only: apply the existing part matrices AFTER exporting identity
    # asset roots. The runtime adapter will apply these same matrices itself.
    for part, obj in prepared.items():
        obj.matrix_basis = TO_BLENDER @ matrices[part] @ TO_BLENDER.inverted()
    for obj in list(bpy.context.scene.objects):
        if obj != root and obj not in prepared.values():
            bpy.data.objects.remove(obj, do_unlink=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = options.samples
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 5
    scene.render.threads_mode, scene.render.threads = "FIXED", 2
    scene.render.resolution_x = scene.render.resolution_y = options.resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.view_transform = "AgX"
    world_data = bpy.data.worlds.new("Prepared review world")
    world_data.use_nodes = True
    world_data.node_tree.nodes["Background"].inputs[0].default_value = (.07, .075, .073, 1)
    world_data.node_tree.nodes["Background"].inputs[1].default_value = .6
    scene.world = world_data
    camera_data = bpy.data.cameras.new("Review camera")
    camera = bpy.data.objects.new("Review camera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera_data.type = "ORTHO"
    bpy.context.view_layer.update()
    total_box = bounds(obj.matrix_world @ v.co for obj in prepared.values() for v in obj.data.vertices)
    center = (Vector(total_box["min"]) + Vector(total_box["max"])) * .5
    span = max(total_box["max"][i] - total_box["min"][i] for i in range(3))
    camera_data.ortho_scale = span * 1.14
    camera_data.clip_start, camera_data.clip_end = .01, span * 20
    for label, location, strength in [("key", (-span, -span, span * 2), 1000), ("fill", (span, span * .5, span * 1.5), 650), ("rim", (0, span * 1.5, span), 500)]:
        data = bpy.data.lights.new(label, "AREA")
        data.energy, data.size, data.shape = strength * span * span / 16, span, "DISK"
        lamp = bpy.data.objects.new(label, data)
        scene.collection.objects.link(lamp)
        lamp.location = center + Vector(location)
        lamp.rotation_euler = (center - lamp.location).to_track_quat("-Z", "Y").to_euler()
    for view, direction, wings in [("closed-top", Vector((0, 0, 1)), True), ("closed-oblique", Vector((.6, -.45, 1)).normalized(), True), ("wings-removed", Vector((0, 0, 1)), False)]:
        camera_data.ortho_scale = span * (1.30 if view == "closed-oblique" else 1.14)
        for part in ["wing-left", "wing-right"]:
            prepared[part].hide_render = not wings
        camera.location = center + direction * span * 3
        camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
        target = output / ("cockroach-" + view + ".png")
        scene.render.filepath = str(target)
        bpy.ops.render.render(write_still=True)
        report["renders"].append({"view": view, "file": str(target), "cpu_threads": 2, "samples": options.samples})
        print("PREPARED_RENDER", str(target), flush=True)
    report["source_hash_unchanged"] = hashlib.sha256(asset.read_bytes()).hexdigest() == digest
    if not report["source_hash_unchanged"]:
        raise RuntimeError("Source asset changed")
    (output / "cockroach-preparation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print("PREPARED_COMPLETE", json.dumps({"file": str(filename), "counts": intake["counts"], "parts": intake["meshes"]}), flush=True)


if __name__ == "__main__":
    main()
