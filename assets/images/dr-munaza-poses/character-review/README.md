# Dr. Munaza — appearance approval stage

Open `index.html` for front, side and back views. Open `dr-munaza-reference-review.blend` in Blender for the packed reference panels and editable badge text. The source sheet is preserved unchanged. These panels are 2D image references, not modeled anatomy or a rigged character.

The user's production brief explicitly requires view approval before detailed modeling. Front likeness derives from the supplied masked portrait; the generated side/back silhouette, folds, body depth and occluded anatomy are proposals. Approve them or specify corrections. Actual height and measurements are not established.

## Production specification after approval

- Editable high-resolution sculpt and separate quad retopology; complete underlying body, articulated fingers, deformation loops at major joints.
- Separate hijab, mask, coat, tunic, trousers and shoes. Coat can be removed for the modest exercise outfit. Skinning plus corrective shape keys; secondary garment bones or baked pinned cloth with simplified collision meshes.
- UVs and PBR base-color, roughness and normal maps; render and real-time texture sets. Editable navy/white garment colors and badge: “Dr. Munaza — Physiotherapist.”
- Separate animator control rig and export deformation skeleton. Root, pelvis, COM, spine, clavicles, neck/head; arm/leg IK/FK with matching and poles; twist bones, foot roll/toe/heel controls, fingers, eyes/blinks/brows and hand space switching.
- Instructor actions: neutral idle, greeting, pointing, explaining, walking, sitting and transitions. Each planned exercise gets `Category_Exercise_Side_Variant`, preparation/movement/hold/return/completion phases, and clinical review status. No combat systems or actions belong to this asset.
- Clinic setup with treatment table, chair and mat; front/side/rear/three-quarter cameras. Props and additional equipment depend on the approved exercise brief.
- Final deliverables: packed .blend, baked export skeleton/clips, GLB (FBX if target requires), view previews, turntable, rig demonstration video, action catalogue and control/export guide.

## Pending inputs

1. Appearance approval for front/side/back, including proposed rear hijab and coat construction.
2. A qualified physiotherapist's reviewed movement brief for one initial demonstration. Fill `movement-brief.json`; no candidate exercise is marked approved.
3. Target renderer/device for final triangle/texture/performance budgets. Blender uses Z-up; glTF export uses Y-up. Exact budgets remain unagreed.

## Acceptance still outstanding

No finished character mesh, high-resolution sculpt, topology, UVs, production material set, rig, skin weights, corrective shapes, cloth bake, action clips, exports or rendered animation has been delivered at this stage. Check joint deformation, coverage, intersections, support contacts, texture paths and export playback after production. The pose PNGs are references, not motion-capture or mesh data.

The rigged-asset skill informed provenance, separation of editable source/runtime assets and truthful validation status. Its combat-specific action and equipment requirements do not apply to this explicitly non-combat physiotherapy brief.

Rebuild this review scene with Blender's background Python runner and `build_reference_scene.py`. The script resets only its new Blender process to an empty scene; it does not open or overwrite another modeling project.
