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

## Render in GitLab CI (no local setup)

Every push that changes `munaza-physio-video/` runs two jobs, `render:en` and `render:ur`. When they finish, open **Build > Pipelines**, select the pipeline, open a job, then **Job artifacts > Download**. The MP4s are in `munaza-physio-video/renders/`. Artifacts are kept for 30 days.

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

## Series video 1: Back Pain (9:16, 65 s)

`series/01-back-pain/index.html` is a 1080x1920 composition timed to the generated track `series/01-back-pain/Let_s_Move_Not_Ache.mp3` (66.5 s with trailing silence, so the video runs 65 s instead of the script's 60 s). Scene and caption times follow where the vocals actually fall in that track. They are listed in the `PH` array at the bottom of the file.

```bash
npm run render:back   # renders renders/01-back-pain.mp4
```

Asset paths are relative to the project root (`munaza-physio-video/`), so render from here. GSAP and the Archivo font are vendored (`vendor/`, `assets/fonts/`), so no CDN is needed.

## Full song video: "A Space to Heal" (16:9, 2:57)

`series/complete/index.html` is a 1920x1080, 177 s YouTube composition timed to `series/complete/A_Space_to_Heal.mp3`.

- **Chapters follow the song:** intro, spine body-map, pre-chorus, chorus with Dr. Munaza, call break, shoulder/arm body-map, the About-page journey, a home-page walkthrough, a booking and online call break, hip/knee/foot body-map, a women-only promise, the visit/contact card, facial palsy and breathing, paediatric, then a particle logo.
- **Real site pages:** `assets/site/*.jpg` are screenshots of munazaphysio.studio (home, about, conditions, paediatric; desktop and mobile).
- **Hand-drawn layer:** sketch strokes use an SVG turbulence filter, with notes in Caveat. Type is Poppins, matching the site. Fonts are bundled in `assets/fonts/`.
- **Captions:** line-level with a karaoke sweep. They come from the `CAP` array near the bottom of the file and are also exported as `series/complete/captions-en.srt` for YouTube.
- **Lyrics the track skips:** the generated track leaves out several lines from `lyrics.md` (elbow and hip/knee/ACL lines, most of the neuro bridge, the spoken outro). Captions show only what is sung.

```bash
npm run render:complete   # renders renders/munaza-physio-177s.mp4
```
