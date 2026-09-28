# {{name}}: studio rules

Project brief: see `project.json`, `docs/shotlist.md`, `docs/style_guide.md`. Do not start from a blank page: refine what the plan already says.

## Render contract
- The film is a pure function of time: `window.seek(t)` paints frame t. Frame 812 must render correctly without simulating frames 0 to 811.
- No CSS transitions, no `setTimeout`, no `requestAnimationFrame` in render mode, no state carried between frames.
- Seeded noise only (mulberry32 with `project.json` seed), never `Math.random`.
- Use closed-form springs for motion; one spring per target change for values that move more than once.
- Output {{width}}x{{height}}, {{fps}} fps, {{duration}} s. Render with `node render.mjs`, H.264 yuv420p, CRF 16.
- Loop: the last frame equals the first (position and velocity).

## Look
- Style: {{styleLabel}}. Palette {{palette}}. Type: {{type}}. Texture: {{texture}}.
- Banned: centered title on gradient, everything fading in, corner labels and frame borders, glow on UI chrome, generic particle bursts.
- One display face, one UI face, one accent colour.
- A new visual event every 2 to 4 seconds. Hook inside the first 2 seconds.
- Transitions are physical: a visible object becomes the next scene. No slide-deck cuts.

## Originality
- A reference, if present, lends grammar only (pacing, palette, type, camera, transitions). Never reuse its story, logos, characters, claims or exact shot sequence.
- Do not invent product UI, testimonials, metrics or medical/financial claims. Use real supplied assets only.

## Sound
- Score and SFX are synthesized in code unless `audio/track.*` is supplied. Measure beats into `audio/beats.json`; state changes on beats, reveals on downbeats.
- Voiceover: one file per scene in `audio/vo/`, never time-stretched. Mix near -14 LUFS, prevent clipping.
- Never print API keys; read them from `.env`.

## Loop before you show anything
1. Render one frame per beat as a contact sheet and LOOK at it (`out/contact.png`, `out/strip.png`, `out/phone.png`).
2. Score 1-10: hook in first 2 s, phone readability, motion, variety, composition, style match, sound sync.
3. Log scores and the 3 worst problems in `docs/review_log.md`. Fix them. Repeat until every score is 8+ for three rounds.
4. Only then render `out/final.mp4`.

## Deliverables
`out/final.mp4`, `out/poster.png`, `out/contact.png`, `README.md`, clean `src/`, `project.json` with renderer version, fps, dimensions, duration, seed and tool versions.
