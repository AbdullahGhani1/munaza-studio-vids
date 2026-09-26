# Munaza Physio: 30s Motion Graphics Promo

A 30-second, 1920x1080 promo video for [munazaphysio.studio](https://munazaphysio.studio/), the female-only physiotherapy practice of Dr. Munaza Ghani (Back Pain, Frozen Shoulder, Neck Pain).

Built as an HTML composition for [HyperFrames](https://github.com/heygen-com/hyperframes). All motion is driven by a single paused GSAP timeline registered on `window.__timelines["munaza-physio"]`, so frames render deterministically.

## Segments

1. **Masked Type** (0-8s): wipe-mask reveal of "Dr. Munaza Ghani" plus a clip-path tagline
2. **Elastic Type** (8-15s): letter-by-letter elastic kinetic type for each condition
3. **Spring Stack** (15-23s): spring-physics stacked cards showing how to use the website
4. **Particle Logo** (23-30s): canvas-sampled particles that assemble into "Munaza Physio"

An animated presenter character (talking mouth, blinks, waves) narrates throughout, with synced captions. See `script.md` for narration and timings.

## Preview and render

```bash
cd munaza-physio-video
npm run preview   # npx hyperframes preview
npm run render    # npx hyperframes render --output renders/munaza-physio-30s.mp4
```

If your HyperFrames version uses different CLI flags, check the HyperFrames README and adjust `package.json`. You can also open `index.html` in a browser and scrub with `window.__timelines['munaza-physio'].seek(12)` in the console.

## Urdu caption version

Captions have an Urdu track (Noto Nastaliq Urdu, right-to-left). Everything else stays the same.

```bash
npm run preview:ur   # builds ur/index.html, then previews it
npm run render:ur    # renders renders/munaza-physio-30s-ur.mp4
```

In a browser you can also open `index.html?lang=ur`. Edit the Urdu text in the `data-ur` attributes on the `.cap` elements.

## Adding a voiceover

No audio is included. Record or generate a voiceover from `script.md`, then add it as an audio clip in `index.html` following the HyperFrames audio docs.

## Editing

- Colors: CSS variables in `:root` in `index.html`
- Caption text: `.cap` elements; timings in `capTimes`
- Mouth sync windows: `talk` array
