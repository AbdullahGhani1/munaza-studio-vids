"""Build an appearance-review scene, not a character mesh or production rig."""
from pathlib import Path
import math
import bpy

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / "00-character-sheet.png"
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.name = "Dr_Munaza_Appearance_Approval"
scene["stage"] = "Reference approval; no character model or rig yet"
scene["likeness_boundary"] = "Generated side/back concepts require approval"
scene.unit_settings.system = "METRIC"
scene["scale_note"] = "Reference panels use arbitrary display units, not measured human height"

image = bpy.data.images.load(str(SOURCE))
image.pack()
material = bpy.data.materials.new("REFERENCE_Original_Sheet")
material.use_nodes = True
nodes = material.node_tree.nodes
nodes.clear()
texture = nodes.new("ShaderNodeTexImage")
texture.image = image
emission = nodes.new("ShaderNodeEmission")
output = nodes.new("ShaderNodeOutputMaterial")
material.node_tree.links.new(texture.outputs["Color"], emission.inputs["Color"])
material.node_tree.links.new(emission.outputs[0], output.inputs["Surface"])

references = bpy.data.collections.new("01_REFERENCE_PANELS_NOT_CHARACTER_GEOMETRY")
scene.collection.children.link(references)
for label, column, x in [("Front", 0, -1.05), ("Left_Side_Proposed", 2, 0), ("Back_Proposed", 4, 1.05)]:
    width, height = .90, 2.4
    mesh = bpy.data.meshes.new("Reference_" + label)
    mesh.from_pydata([(x-width/2,0,0),(x+width/2,0,0),(x+width/2,0,height),(x-width/2,0,height)], [], [(0,1,2,3)])
    mesh.update()
    uv = mesh.uv_layers.new(name="Sheet_View")
    coordinates = [(column/8,0),((column+1)/8,0),((column+1)/8,1),(column/8,1)]
    for index, coordinate in enumerate(coordinates):
        uv.data[index].uv = coordinate
    obj = bpy.data.objects.new("REFERENCE_" + label, mesh)
    references.objects.link(obj)
    obj.data.materials.append(material)
    obj["purpose"] = "2D reference panel, not a 3D character"

badge = bpy.data.curves.new("Editable_Badge_Text", type="FONT")
badge.body = "Dr. Munaza — Physiotherapist"
badge.size = .09
badge.align_x = "CENTER"
badge_obj = bpy.data.objects.new("BADGE_TEXT_Proposed", badge)
scene.collection.objects.link(badge_obj)
badge_obj.location = (0, -.02, -.20)
badge_obj.rotation_euler = (math.pi/2, 0, 0)

camera_data = bpy.data.cameras.new("Approval_Front_Side_Back")
camera = bpy.data.objects.new("Approval_Front_Side_Back", camera_data)
scene.collection.objects.link(camera)
camera.location = (0, -7, 1.10)
camera.rotation_euler = (math.pi/2, 0, 0)
camera_data.type = "ORTHO"
camera_data.ortho_scale = 3.5
scene.camera = camera
scene.render.resolution_x = 1500
scene.render.resolution_y = 1300
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new("Review_World")
scene.world.color = (.6, .6, .6)

readme = bpy.data.texts.new("START_HERE")
readme.write("Appearance review only. Three textured reference panels from the generated eight-view sheet. Side and back details are proposals, not verified likeness. Badge text is editable. No character mesh, rig, skin weights, exercise animation or export is claimed. Approve appearance and provide a clinician-reviewed movement brief before production.\n")
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == "VIEW_3D":
            area.spaces.active.region_3d.view_perspective = "CAMERA"
            area.spaces.active.shading.type = "MATERIAL"
bpy.ops.wm.save_as_mainfile(filepath=str(HERE / "dr-munaza-reference-review.blend"))
assert image.packed_file is not None
assert len([o for o in scene.objects if o.type == "MESH"]) == 3
assert len([o for o in scene.objects if o.type == "ARMATURE"]) == 0
print("REVIEW_SCENE_OK: 3 reference panels, 1 packed image, editable badge, no production rig claimed")
