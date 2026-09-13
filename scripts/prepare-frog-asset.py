"""Prepare the approved CC0 pond-frog scan; never edits the downloaded original.

Run using Blender --factory-startup --disable-autoexec --background --python.
This is a static exterior candidate, not a species/anatomy certification.
"""
import argparse
import hashlib
import json
import struct
import sys
import subprocess
from collections import deque
from pathlib import Path

import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector


def log(message, **data):
    print("FROG_PREP", message, json.dumps(data), flush=True)


def contiguous_regions(mesh, initial):
    """Complete authored limb seeds over the reduced mesh, not the dense scan.

    A coordinate box can leave fingertips in disconnected skin islands. Keep
    each region's largest connected seed, then grow only over shared triangle
    edges, making complete limbs without moving or duplicating any surface.
    """
    faces = list(mesh.polygons)
    adjacency = [set() for _ in faces]
    edge_faces = {}
    for face in faces:
        for edge in face.edge_keys:
            edge_faces.setdefault(tuple(sorted(edge)), []).append(face.index)
    for adjacent in edge_faces.values():
        for face_id in adjacent:
            adjacency[face_id].update(other for other in adjacent if other != face_id)
    owners, queue, seed_metrics = {}, deque(), {}
    for name, region in initial.items():
        remaining = {face.index for face in region}
        components = []
        while remaining:
            pending = [remaining.pop()]
            component = set(pending)
            while pending:
                found = adjacency[pending.pop()] & remaining
                remaining.difference_update(found)
                component.update(found)
                pending.extend(found)
            components.append(component)
        components.sort(key=len, reverse=True)
        seed_metrics[name] = [len(component) for component in components]
        for face_id in sorted(components[0]):
            owners[face_id] = name
            queue.append(face_id)
    while queue:
        face_id = queue.popleft()
        for adjacent in sorted(adjacency[face_id]):
            if adjacent not in owners:
                owners[adjacent] = owners[face_id]
                queue.append(adjacent)
    dropped = sorted(set(range(len(faces))) - owners.keys())
    assert len(dropped) <= len(faces)*.005, "Unexpected disconnected source surface requires manual review"
    result = {name: [] for name in initial}
    for face_id, name in sorted(owners.items()):
        result[name].append(faces[face_id])
    return result, {"initial_components_triangles": seed_metrics,
                    "disconnected_scan_triangles_omitted": len(dropped),
                    "final_components_per_root": {name: 1 for name in result}}


def builder_frames(repo, ids):
    """Use the actual checked-out builder, never assume root transforms."""
    source = """(async()=>{const fs=require('fs');
const THREE=await import('data:text/javascript;base64,'+fs.readFileSync('src/lab/vendor/three.module.min.js').toString('base64'));
const built=new Function('THREE',['anatomy','frog'].map(n=>fs.readFileSync('src/lab/'+n+'.js','utf8')).join('\\n').replace(/^export\\s+/gm,'')+';return buildFrog(THREE)')(THREE);
built.group.updateMatrixWorld(true);console.log(JSON.stringify(Object.fromEntries(built.parts.map(p=>[p.id,p.mesh.matrix.elements]))));})()"""
    frames = json.loads(subprocess.check_output(["node", "-e", source], cwd=repo, text=True))
    return {name: Matrix([frames[name][i:i+4] for i in range(0,16,4)]).transposed() for name in ids}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("asset", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--faces", type=int, default=18000)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    source, output = args.asset.resolve(strict=True), args.output.resolve()
    expected = "d03d6b33b1d64da045632e62fdb5202860ccb503f03ecc77532717cc4e924c26"
    assert hashlib.sha256(source.read_bytes()).hexdigest() == expected
    assert output != source and output.suffix == ".glb"
    report_dir = output.parents[2] / "docs/specimen-exteriors/prepared/frog"
    output.parent.mkdir(parents=True, exist_ok=True)
    report_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    chart = [o for o in meshes if len(o.data.vertices) == 24 and len(o.data.polygons) == 12]
    assert len(chart) == 1 and len(meshes) == 19
    bpy.data.objects.remove(chart[0], do_unlink=True)
    meshes.remove(chart[0])
    log("approved scan imported; separate calibration chart excluded")

    # Keep the untouched source UVs/materials for colour baking. Position welding
    # can interpolate discontinuous corner UVs, so the bake source MUST be copied
    # before welding; it never receives the low-poly topology operations.
    originals = sorted({m for o in meshes for m in o.data.materials}, key=lambda m: m.name)
    assert len(originals) == 3
    for original in originals:
        source_textures = [n for n in original.node_tree.nodes if n.type == "TEX_IMAGE" and n.image]
        images = [n.image for n in source_textures]
        assert len(images) == 1 and tuple(images[0].size) == (4096, 4096)
        # The original glTF is KHR_materials_unlit. Its imported emission
        # shader has no DIFFUSE bake contribution; route the same untouched
        # colour/UV texture through a temporary diffuse-capable source shader.
        shader = original.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
        original.node_tree.links.new(source_textures[0].outputs["Color"], shader.inputs["Base Color"])
        original.node_tree.links.new(shader.outputs["BSDF"], original.node_tree.nodes.get("Material Output").inputs["Surface"])
    for obj in meshes:
        obj.data.transform(obj.matrix_world)
        obj.parent = None
        obj.matrix_world = Matrix.Identity(4)
        assert len(obj.data.materials) == 1 and len(obj.data.uv_layers) == 1
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    whole = bpy.context.object
    whole.name = "Pond frog working surface"
    high = whole.copy()
    high.data = whole.data.copy()
    high.name = "Untouched original texture bake source"
    bpy.context.scene.collection.objects.link(high)
    # Weld export-chunk position seams while retaining face-corner UVs. This is
    # one native bounded geometry operation, not a million-vertex graph audit.
    bm = bmesh.new()
    bm.from_mesh(whole.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00001)
    bm.to_mesh(whole.data)
    bm.free()
    log("welded export chunks", vertices=len(whole.data.vertices), faces=len(whole.data.polygons))
    modifier = whole.modifiers.new("Interactive exterior reduction", "DECIMATE")
    modifier.ratio = min(1, args.faces / len(whole.data.polygons))
    modifier.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    whole.data.validate(verbose=False, clean_customdata=False)
    for face in whole.data.polygons:
        face.use_smooth = True
    whole.data.update()
    # A simple remap is insufficient after collapse across tiny scan UV charts.
    # Bake ORIGINAL colour only to a fresh low-poly UV layout; lighting is not
    # baked. The source and low-poly surfaces remain exactly aligned here.
    bpy.ops.object.select_all(action="DESELECT")
    whole.select_set(True)
    bpy.context.view_layer.objects.active = whole
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=.003, area_weight=.15)
    bpy.ops.object.mode_set(mode="OBJECT")
    baked = bpy.data.images.new("Pond frog colour-only bake", 2048, 2048, alpha=False)
    baked.colorspace_settings.name = "sRGB"
    baked_material = bpy.data.materials.new("Pond frog original colour baked to interactive mesh")
    baked_material.use_nodes = True
    shader = baked_material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Roughness"].default_value = .53
    shader.inputs["Metallic"].default_value = 0
    bake_tex = baked_material.node_tree.nodes.new("ShaderNodeTexImage")
    bake_tex.image = baked
    baked_material.node_tree.nodes.active = bake_tex
    whole.data.materials.clear()
    whole.data.materials.append(baked_material)
    for face in whole.data.polygons:
        face.material_index = 0
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 1
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 6
    high.select_set(True)
    log("baking original source colour; no lights or gloss baked")
    bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"}, use_selected_to_active=True,
                        cage_extrusion=.07, max_ray_distance=.22, margin=8)
    baked_material.node_tree.links.new(bake_tex.outputs["Color"], shader.inputs["Base Color"])
    samples = np.array(baked.pixels[:], dtype=np.float32).reshape(-1, 4)[:, :3]
    assert samples.mean() > .03 and samples.std() > .03, "Empty or flat colour bake rejected"
    bake_statistics = {"mean_rgb": samples.mean(axis=0).tolist(), "channel_std": samples.std(axis=0).tolist()}
    baked.file_format = "PNG"
    baked.pack()
    bpy.data.objects.remove(high, do_unlink=True)
    material = baked_material
    log("source colour bake complete")
    mesh = whole.data
    coords = np.array([v.co[:] for v in mesh.vertices])
    lo, hi = coords.min(axis=0), coords.max(axis=0)
    log("reduced scan", vertices=len(mesh.vertices), faces=len(mesh.polygons), minimum=lo.tolist(), maximum=hi.tolist())

    # Visually authored shoulder/hip cuts on the source scan: +X posterior,
    # +Z dorsal, -X snout. Region boundaries share the SAME original vertices;
    # no independent movement or decimation after splitting can open a crack.
    # The natural folded limb pose is retained, not falsely called a posed rig.
    snout, posterior = float(lo[0]), float(hi[0])
    length = posterior - snout
    hip = snout + length * .68
    shoulder_a = snout + length * .22
    shoulder_b = snout + length * .37
    mid_y = float((lo[1] + hi[1]) * .5)
    # Belly/trunk source half width from the central mid-body cross-section.
    central = coords[(coords[:, 0] > snout + length*.44) & (coords[:, 0] < snout + length*.55)]
    half_width = float(np.quantile(np.abs(central[:, 1] - mid_y), .97))
    fore_seam = half_width * .86
    ids = ["skin", "forelimb-left", "forelimb-right", "hindlimb-left", "hindlimb-right"]
    groups = {name: [] for name in ids}
    for face in mesh.polygons:
        point = coords[list(face.vertices)].mean(axis=0)
        side = "left" if point[1] < mid_y else "right"
        lateral = abs(point[1] - mid_y)
        if point[0] >= hip or (point[0] > hip - length*.08 and lateral > half_width*.78):
            owner = "hindlimb-" + side
        elif shoulder_a < point[0] < shoulder_b and lateral > fore_seam:
            owner = "forelimb-" + side
        else:
            owner = "skin"
        groups[owner].append(face)
    assert all(len(faces) > 50 for faces in groups.values()), "A functional region was not found"
    groups, connectivity = contiguous_regions(mesh, groups)
    frames = builder_frames(output.parents[2], ids)
    log("connected five-region partition", **connectivity)
    # Preserve the existing organ frame: snout +4.55, hip -3.5, trunk max
    # half-width about 2.34. The original folded feet may extend wider/longer.
    skin_ids = {index for face in groups["skin"] for index in face.vertices}
    body = coords[list(skin_ids)]
    body_top, body_bottom = float(body[:, 2].max()), float(body[:, 2].min())
    scale_z = 8.05 / (hip - snout)
    scale_x = 2.34 / half_width
    scale_y = 2.84 / (body_top - body_bottom)
    center_height = (body_top + body_bottom) * .5
    def mapped(point):
        return ((point[1]-mid_y)*scale_x, -(point[2]-center_height)*scale_y, 4.55-(point[0]-snout)*scale_z)
    # Original imported split normals can keep needless per-face duplication
    # after reduction. Use one smoothly averaged geometric normal per vertex.
    normal_mesh = bmesh.new()
    normal_mesh.from_mesh(mesh)
    normal_mesh.normal_update()
    normal_mesh.verts.ensure_lookup_table()
    all_normals = [tuple(vertex.normal) for vertex in normal_mesh.verts]
    normal_mesh.free()
    uv_data = mesh.uv_layers.active.data
    root = bpy.data.objects.new("Prepared frog exterior", None)
    root["schemaVersion"] = 1
    root["specimenId"] = "frog"
    bpy.context.scene.collection.objects.link(root)
    pieces = []
    metrics = {}
    for name in ids:
        faces = groups[name]
        indices = sorted({index for face in faces for index in face.vertices})
        lookup = {index: i for i, index in enumerate(indices)}
        inverse = frames[name].inverted()
        data = bpy.data.meshes.new(name)
        data.from_pydata([inverse @ Vector(mapped(coords[i])) for i in indices], [], [[lookup[i] for i in face.vertices] for face in faces])
        data.validate(verbose=False, clean_customdata=False)
        data.update()
        uv = data.uv_layers.new(name="UVMap")
        normals = []
        for new_face, original in zip(data.polygons, faces):
            new_face.use_smooth = True
            for new_loop, old_loop in zip(new_face.loop_indices, original.loop_indices):
                uv.data[new_loop].uv = uv_data[old_loop].uv
                nx, ny, nz = all_normals[mesh.loops[old_loop].vertex_index]
                normal = Vector((ny/scale_x, -nz/scale_y, -nx/scale_z)).normalized()
                normal = (frames[name].to_3x3().transposed() @ normal).normalized()
                normals.append(normal)
        data.normals_split_custom_set(normals)
        data.materials.append(material)
        obj = bpy.data.objects.new(name, data)
        bpy.context.scene.collection.objects.link(obj)
        obj.parent = root
        pieces.append(obj)
        metrics[name] = {"mesh_vertices": len(data.vertices), "triangles": len(data.polygons),
                         "source_vertex_ids": indices, "bounds": {"min": np.min([mapped(coords[i]) for i in indices], axis=0).tolist(),
                                                                    "max": np.max([mapped(coords[i]) for i in indices], axis=0).tolist()}}
    bpy.data.objects.remove(whole, do_unlink=True)
    # Drop importer-only empties so exported metadata is the direct Group.
    for obj in list(bpy.context.scene.objects):
        if obj not in pieces and obj != root:
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in pieces:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", use_selection=True,
                              export_yup=False, export_texcoords=True, export_normals=True,
                              export_tangents=False, export_attributes=False, export_materials="EXPORT",
                              export_extras=True, export_animations=False, export_cameras=False,
                              export_lights=False, export_apply=False)
    blob = output.read_bytes()
    json_length, kind = struct.unpack_from("<II", blob, 12)
    document = json.loads(blob[20:20+json_length])
    for item in document["meshes"]:
        assert len(item["primitives"]) == 1
        primitive = item["primitives"][0]
        assert set(primitive["attributes"]) == {"POSITION", "NORMAL", "TEXCOORD_0"}
        count = document["accessors"][primitive["attributes"]["POSITION"]]["count"]
        index_count = document["accessors"][primitive["indices"]]["count"]
        metrics[item["name"]]["exported_vertices"] = count
        metrics[item["name"]]["exported_indices"] = index_count
        assert count <= 9000 and index_count <= 54000, (item["name"], count, index_count)
    seams = {name: len(set(metrics[name]["source_vertex_ids"]) & set(metrics["skin"]["source_vertex_ids"])) for name in ids[1:]}
    assert all(count >= 3 for count in seams.values()), "Detached limb at authored seam"
    for entry in metrics.values():
        del entry["source_vertex_ids"]
    report = {"source_sha256": expected, "output_sha256": hashlib.sha256(blob).hexdigest(), "output": str(output),
              "source_url": "https://sketchfab.com/3d-models/cc0-black-spotted-pond-frog-8cfb74fe45684601863b8a43c8ed9373",
              "author": "ffish.asia / floraZia.com", "license": "CC0-1.0 (embedded source metadata; intake review retained separately)",
              "operations": ["Excluded calibration chart", "Joined and position-welded export chunks", "Globally decimated before five-region split",
                             "Colour-only baked from untouched original three-material source onto one 2048px low-poly UV map; no baked lighting", "Static supine axis mapping; original folded pose retained"],
              "frame": {"source": "+X posterior; +Z dorsal", "lab": "+Z anterior; +Y ventral", "hip_source_x": hip,
                        "scale": [scale_x, scale_y, scale_z], "shoulder_range": [shoulder_a, shoulder_b], "fore_seam": fore_seam},
              "roots": metrics, "skin_shared_boundary_vertices": seams, "connectivity": connectivity, "bake_statistics": bake_statistics,
              "existing_root_matrices": {name: [list(row) for row in frames[name]] for name in ids}, "bytes": len(blob),
              "limits": "Candidate only. Region assignment is authored geometric approximation, not a segmented scientific scan. Native folded pose retained. Require actual tool/cavity/organ clearance and visual acceptance before activation."}
    (report_dir / "preparation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    log("candidate exported", output=str(output), bytes=len(blob), roots=metrics, seams=seams)
    # Single fast ventral still of the exact candidate geometry, no decorative
    # planes or postprocessing that could hide cracks or residual chart meshes.
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 16
    scene.cycles.use_denoising = True
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 6
    scene.render.resolution_x = scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "AgX"
    world = bpy.data.worlds.new("Candidate neutral world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (.13, .13, .13, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = .6
    scene.world = world
    cam_data = bpy.data.cameras.new("Candidate review")
    cam_data.type = "ORTHO"
    overall = [v.co for obj in pieces for v in obj.data.vertices]
    low = Vector([min(p[i] for p in overall) for i in range(3)])
    high = Vector([max(p[i] for p in overall) for i in range(3)])
    center = (low+high)*.5
    span = max(high-low)
    cam_data.ortho_scale = span*1.13
    cam = bpy.data.objects.new("Candidate review", cam_data)
    scene.collection.objects.link(cam)
    cam.location = center + Vector((0, span*3, 0))
    cam.rotation_mode = "QUATERNION"
    # Lab +Z is the top of the ventral image.
    cam.rotation_quaternion = Matrix(((-1,0,0),(0,0,1),(0,1,0))).to_quaternion()
    scene.camera = cam
    for name, offset, energy in [("Key", (-8, 15, 8), 1800), ("Fill", (10, 10, -3), 1000)]:
        light = bpy.data.lights.new(name, "AREA")
        light.energy, light.size = energy, 9
        lamp = bpy.data.objects.new(name, light)
        scene.collection.objects.link(lamp)
        lamp.location = center + Vector(offset)
        lamp.rotation_euler = (center-lamp.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(report_dir / "frog-prepared-ventral.png")
    # Reconstruct the actual builder frames for review AFTER exporting identity
    # source nodes. This catches a part-local/group-local mismatch visually.
    for obj in pieces:
        obj.matrix_world = frames[obj.name]
    bpy.ops.render.render(write_still=True)
    cam.location = center + Vector((0, -span*3, 0))
    cam.rotation_quaternion = Matrix(((1,0,0),(0,0,-1),(0,1,0))).to_quaternion()
    for lamp in [obj for obj in scene.objects if obj.type == "LIGHT"]:
        lamp.location.y = 2*center.y-lamp.location.y
        lamp.rotation_euler = (center-lamp.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(report_dir / "frog-prepared-dorsal.png")
    bpy.ops.render.render(write_still=True)
    cam.location = center + Vector((0, span*3, 0))
    cam.rotation_quaternion = Matrix(((-1,0,0),(0,0,1),(0,1,0))).to_quaternion()
    for lamp in [obj for obj in scene.objects if obj.type == "LIGHT"]:
        lamp.location.y = 2*center.y-lamp.location.y
        lamp.rotation_euler = (center-lamp.location).to_track_quat("-Z", "Y").to_euler()
    for obj, color in zip(pieces, [(.75,.75,.64,1),(.8,.19,.12,1),(.13,.55,.86,1),(.6,.25,.8,1),(.17,.7,.36,1)]):
        diagnostic = bpy.data.materials.new(obj.name + " region review")
        diagnostic.use_nodes = True
        diagnostic.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = color
        diagnostic.node_tree.nodes.get("Principled BSDF").inputs["Roughness"].default_value = .8
        obj.data.materials[0] = diagnostic
    scene.render.filepath = str(report_dir / "frog-functional-regions.png")
    bpy.ops.render.render(write_still=True)
    assert hashlib.sha256(source.read_bytes()).hexdigest() == expected
    log("complete; source unchanged", report=str(report_dir / "preparation.json"), render=scene.render.filepath)


if __name__ == "__main__":
    main()
