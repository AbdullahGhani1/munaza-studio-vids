# Munaza Studio Vids

**Video Studio** is the main project: a local web app that turns a topic, an optional reference, a style, a length and an output size into a reviewable, deterministic, code-rendered video. See [studio/README.md](studio/README.md).

```bash
npm install
npm run studio      # http://127.0.0.1:4173
```

The rest of the repo holds the source material the studio and the films use:

- `assets/`: fonts, photos, site captures and post images for Munaza Physio Studio (munazaphysio.studio, a female-only physiotherapy practice in Lahore run by Dr. Munaza Ghani).
- `series/`: the finished HyperFrames films (below).
- `docs/`: PRD, motion-design blueprint, site contract, design standard, content model and planning notes.
- `vendor/`: GSAP, so no film needs a CDN.

## Films (`series/`)

Render from the repo root with HyperFrames (needs FFmpeg and a Chrome headless shell; `npx hyperframes doctor` checks both). Output goes to `renders/`, which is gitignored.

### Video 1: Back Pain (9:16, 65 s)

`series/01-back-pain/index.html` is a 1080x1920 composition timed to the generated track `series/01-back-pain/Let_s_Move_Not_Ache.mp3` (66.5 s with trailing silence, so the video runs 65 s instead of the script's 60 s). Scene and caption times follow where the vocals actually fall in that track. They are listed in the `PH` array at the bottom of the file.

```bash
npm run render:back   # renders renders/01-back-pain.mp4
```

Asset paths are relative to the project root (the repo root), so render from here. GSAP and the Archivo font are vendored (`vendor/`, `assets/fonts/`), so no CDN is needed.

### Full song video: "A Space to Heal" (16:9, 2:57)

`series/complete/index.html` is a 1920x1080, 177 s YouTube composition timed to `series/complete/A_Space_to_Heal.mp3`.

- **Chapters follow the song:** intro, spine body-map, pre-chorus, chorus with Dr. Munaza, call break, shoulder/arm body-map, the About-page journey, a home-page walkthrough, a booking and online call break, hip/knee/foot body-map, a women-only promise, the visit/contact card, facial palsy and breathing, paediatric, then a particle logo.
- **Real site pages:** `assets/site/*.jpg` are screenshots of munazaphysio.studio (home, about, conditions, paediatric; desktop and mobile).
- **Hand-drawn layer:** sketch strokes use an SVG turbulence filter, with notes in Caveat. Type is Poppins, matching the site. Fonts are bundled in `assets/fonts/`.
- **Captions:** line-level with a karaoke sweep. They come from the `CAP` array near the bottom of the file and are also exported as `series/complete/captions-en.srt` for YouTube.
- **Lyrics the track skips:** the generated track leaves out several lines from `lyrics.md` (elbow and hip/knee/ACL lines, most of the neuro bridge, the spoken outro). Captions show only what is sung.

```bash
npm run render:complete   # renders renders/munaza-physio-177s.mp4
```
