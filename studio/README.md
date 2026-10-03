# Video Studio

Local-first web UI for the PRD in `docs/PRD.md`, built to `docs/site-contract.md` and `docs/design-standard.md`. It turns five inputs (topic, optional reference, style, length, size) into a reviewable, deterministic, code-rendered video project.

```bash
npm test                # 40 tests: planning, validation, tempo, link safety, audio mix, and the HTTP API end to end
npm run studio          # http://127.0.0.1:4173  (PORT=... to change, STUDIO_HOME=... to move projects)
```

No dependencies: a Node http server (`server.mjs`), a vanilla ES-module front end (`public/`), and project templates (`templates/`). It binds to 127.0.0.1 only and rejects foreign hosts and origins.

## What works

| Area | Status |
|------|--------|
| Brief form, validation, live aspect preview, draft autosave | Done |
| Project library (search, filter, duplicate, delete to `.trash`, reveal) | Done |
| Reference by upload, direct link or local path (`lib/refs.mjs`: http/https only, DNS and redirect checks against private addresses, no video-platform pages, 500 MB cap),  ffprobe metadata, ffmpeg frame extraction (up to 12 frames) | Done |
| Video to GIF (`#/gif`, `lib/gif.mjs`): import by video link (yt-dlp; public http/https only), upload, samples or tab recording, up to 10 min; trim with frame stepping and a draggable timeline; 10 to 60 fps (encoded at up to 50, the fastest a GIF plays true), 240p to 1080p, speed 0.25x to 3x, four dither modes, 64/128/256 colours, caption, boomerang, reverse; 2-pass palettegen/paletteuse; download | Done. Needs `yt-dlp` for links only |
| Replace the character with Munaza Ghani (`#/gif`, card 4; `public/replace.js`): finds the main person in each trimmed frame (MediaPipe DeepLab, vendored in `vendor/mediapipe/`, runs in the browser), paints them out with a clean background plate or a soft blur, draws the Munaza cutout (`public/munaza-character.webp`) on the same feet line with smoothing, then encodes the frames with the same 2-pass palette pipeline. Up to 5000 frames (60 fps requested) | Done. Best with one full-body person and a steady camera; the cutout is a still pose, not re-animated. "Copy the movement" (`public/exercise.js`) goes further: it reads the person's skeleton (MediaPipe Pose, `vendor/mediapipe/pose_landmarker_full.task`) and bends Munaza's seated or standing cutout the same way on a rebuilt background (2D puppet: lean, head tilt, arms; no turning). The 16+ pose images live in `assets/images/dr-munaza-poses/` (resized copies in `public/munaza-poses/`) |
| Storyboard generation (MAESTRO-style beats), scene editing, add/duplicate/delete/reorder, rebalance, timing validation | Done. The generator is a deterministic template, not a model call |
| Undo / redo in the plan editor (100 steps; buttons, or Ctrl/Cmd+Z and Shift+Z outside a text field) | Done |
| Approve → scaffold (CLAUDE.md, shotlist, style guide, audio plan, seek(t) renderer, render.mjs, copy-ready prompt) | Done |
| Scrubbable animatic preview (the scaffold's real `window.seek(t)`), timeline, beat ticks, keyboard shortcuts | Done |
| Sound: music upload, tempo detection (`lib/beats.mjs`, ffmpeg decode + onset autocorrelation), manual BPM, ×2 / ÷2, `audio/beats.json`, mix level | Done. Detection found 120, 100 and 140 BPM correctly on synthetic tracks and was off by an octave on 87 BPM; the first beat can be off by about 0.05 s |
| Export another format: re-render 1:1, 16:9, 4:5 or 9:16 from the same timeline via `?w=&h=`, output `out/final-WxH.mp4` | Done for scaffolded renderers. Claude Code's replacement renderer must honour `?w=&h=` |
| Review: 7 scores, three-round 8+ gate, live contact sheet / fast-action strip / phone proof, issue list, fix-pass prompt | Done. Scores are entered by the user |
| Render jobs: animatic (540p) and final from the Preview tab, live frame progress, log tail, cancel, retry. Runs `studio/lib/render-job.mjs` (puppeteer-core + ffmpeg); a previous `final.mp4` is kept as `final-v1.mp4`; same seed gives identical frames | Done |
| Product-site asset capture (`lib/capture.mjs`): real desktop and mobile screenshots, published logo/icon/share image, dominant colours, fonts and headings into `assets/` + `assets/manifest.json`; needs the permission checkbox, public pages only | Done. Tested on example.com; the site's own logo download was not exercised |
| Voiceover per scene: generate with the built-in macOS `say` voices (local, no key) or upload any audio file; placed at the scene start, never time-stretched, music ducks 8 dB under speech, over-long lines are flagged | Done. Generation is macOS-only; elsewhere upload files |
| Sound effects: click / pop / thump / whoosh synthesized in code, placed on scene changes, snapped to the beat map, deterministic | Done |
| Mixed audio in renders: music + effects + voiceover, `loudnorm` to -14 LUFS, trimmed to the runtime (`lib/audio.mjs`) | Done. Checked by measuring the rendered file: speech at 0 s and 8.8 s, silence between |
| Run Claude Code from the UI: confirm dialog, budget cap (0.5–25 USD), `claude -p` in the project folder, restricted tools (Read, Write, Edit, Glob, Grep, node, npm, ffmpeg, ffprobe, ls), live log, cancel, 30 min limit | Done and tested against a stand-in `claude` (`STUDIO_CLAUDE_BIN`). Not run against the real CLI, because that spends your Claude usage |
| Files tree, assets table, delivery list | Done |

## What does not (yet)

- **Claude Code output is unreviewed.** The UI runs it and streams what it does; it does not judge the result. Use the Review tab.
- **Cloud voices.** Generate with your own provider and upload the files; no provider keys are stored or used by the studio.
- **Rendering needs Chrome.** The studio finds a headless Chrome from HyperFrames, Playwright, Puppeteer or a system install (or `CHROME_PATH`) and uses the repo's `puppeteer-core` (`npm install`). The scaffolded project also has its own Playwright-based `render.mjs` for Claude Code to use; that one has not been run and mixes only `audio/track.*` (no voiceover or effects), so use the studio's render for the full mix.
- **Tempo detection is an estimate.** It is not librosa; check it against the track.
- **No automatic style extraction.** Frames are extracted, but the take/avoid lists are templates for you to edit; Claude Code refines the style guide from `refs/frames`.
- Review scores are typed in by the user (or written by Claude Code); the studio does not score frames itself.

## Layout

```
studio/
  server.mjs        API, uploads, static files
  lib/plan.mjs      brief validation, plan generation, timing checks
  lib/scaffold.mjs  project folder writer
  lib/audio.mjs     SFX synthesis, local speech, audio mix graph
  lib/beats.mjs     tempo and onset estimation
  lib/refs.mjs      safe link fetching
  lib/capture.mjs   product-site asset capture
  lib/chrome.mjs    Chrome / puppeteer discovery
  lib/render-job.mjs  MP4 render child process
  test/             node:test suites (npm test)
  templates/        index.html (seek renderer), render.mjs, CLAUDE.md
  public/           index.html, app.css (design tokens), app.js
  projects/         created projects (gitignored)
```
