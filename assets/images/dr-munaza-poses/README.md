# Dr. Munaza Ghani pose assets

Generated with the built-in image-generation tool from the user-supplied doctor reference. The requested navy hijab, surgical mask, white lab coat, navy kurta/shalwar and white sneakers are retained.

The model sheet contains eight views on a green background. Individual poses are separate transparent portrait PNGs. Walking directions each have an A/B pair: A requests left foot forward; B requests right foot forward. These are two-frame animation inputs, not a complete rigged walk cycle.

`manifest.json` records each pose and full generation prompt. The generator does not expose a seed parameter. Identity and framing are guided with the same reference and shared prompt.

Application integration is separate; these assets do not change card 4 or the ACL page.

Verification: all 16 individual PNGs are 1024×1536 with alpha channels and transparent pixels. The eight-view sheet is 2172×724. Full-body framing and outfit were visually reviewed. Generated framing and fabric details vary slightly between poses; the assets are not pixel-registered or a validated seamless animation loop.

## Seated poses added from reference photos (13–15)

`13-seated-hold-upper-arm`, `14-seated-hands-clasped-chair-left` and `15-seated-hands-clasped-chair-right` are front-facing seated poses. Their backgrounds were removed in the studio (MediaPipe person/chair mask plus background-colour keying), so they are transparent PNGs at the source size (about 1000×1500). Edges are slightly rougher than poses 01–12: a little white fringe on the coat and thin floor shadow near the shoes. The chair is part of the cutout.
