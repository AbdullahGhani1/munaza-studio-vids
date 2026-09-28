# Neck pain film: "When neck pain interrupts your everyday life"

A 2.5D paper-cut animated story for Munaza Physio Studio, built as HyperFrames compositions.

| Deliverable | Source | Output |
|-------------|--------|--------|
| Main film: 177 s, 1080×1920, 30 fps, narration + music + SFX + captions | `index.html` | `renders/munaza-neck-pain-177s.mp4` |
| Silent short: 20 s, 1080×1920, 30 fps, captions, music + SFX, no narration | `short.html` | `renders/munaza-neck-pain-20s.mp4` |

## Render (tested with HyperFrames 0.8.79)

From `munaza-physio-video/` (the project root: asset paths are relative to it):

```bash
npm install                 # installs the pinned hyperframes CLI from package-lock.json
npm run render:neck         # -> renders/munaza-neck-pain-177s.mp4
npm run render:neck-short   # -> renders/munaza-neck-pain-20s.mp4
```

Tested on 2026-09-28: `npm install` + `npm run render:neck-short` (20.000 s, 1080×1920, 30 fps, about 1 min 20 s on 4 CPU cores). The 177 s film was rendered with the same pinned CLI and identical arguments (about 10 min). Both scripts run `hyperframes render . -c series/03-neck-pain/<file>.html --quality delivery`. Rendering needs FFmpeg and a Chrome headless shell (`npx hyperframes doctor` checks both). In a sandbox without Chrome, point `HYPERFRAMES_BROWSER_PATH` at a Chromium headless shell.

## How it works

- **Engine (`lib/paper.js`):** one paused GSAP timeline drives a single value `t`, and every frame is repainted as a pure function of `t`. Frames can therefore render in any order. It has no timers, no `Date.now()` and no unseeded randomness; the particles use precomputed seeded targets (`data/logo-particles.js`).
- **Characters (`lib/cast.js`):** Ayesha (32), Dr. Munaza and Ayesha's mother share one rig: IK arms with foreshortening, head turn and tilt, blinking eyes and moods. Modesty is structural:
  - Every hijab covers hair, neck and chest.
  - Garments are opaque, loose and full length.
  - Dr. Munaza's mask always covers her nose and mouth, and no mouth is ever drawn for her.
- **Scenes (`lib/scenes.js`)** and **shot lists (`lib/film.js`)** for both cuts.
- **Theme tokens:** `#stage[data-theme="dark"]` and `#stage[data-theme="light"]` are separate selectors, so the dark and light token sets never overwrite each other.

## Rebuilding the audio (optional)

The committed mixes (`audio/mix-177.m4a`, `audio/mix-20.m4a`) are what the compositions play. To regenerate them:

```bash
pip install kokoro-onnx soundfile numpy
# model files: https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
python3 tools/tts.py kokoro-v1.0.onnx voices-v1.0.bin   # narration + data/narration-timing.{json,js}
python3 tools/mix.py main && python3 tools/mix.py short  # original score + SFX + mix
for m in 177 20; do ffmpeg -y -i audio/mix-$m.wav -af loudnorm=I=-16:TP=-1.5:LRA=11 -c:a aac -b:a 192k audio/mix-$m.m4a; done
```

Captions come from the per-phrase narration timing, so they stay in sync if you edit `data/narration.json` and rerun `tts.py`.

## Other files

- `storyboard.md`: the three storyboard variants and the chosen shot list; `storyboard/`: one still per scene.
- `narration-script.md`: the final recorded script with timings.
- `captions/`: SRT and VTT for both cuts.
- `CREDITS.md`: sources, verified website path, asset credits, and the references that could or couldn't be inspected.
