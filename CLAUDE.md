# CLAUDE.md

The Video Studio web app (main project, `studio/`) plus the Munaza Physio Studio films (`series/`). The films are motion-graphics videos for Munaza Physio Studio (munazaphysio.studio, a female-only physiotherapy practice run by Dr. Munaza Ghani). Each video is an HTML composition rendered to MP4 with [HyperFrames](https://github.com/heygen-com/hyperframes) (pinned `0.8.79`).

## Layout

- The repo root is the npm project root. Run every command from here; asset paths in the compositions are relative to it.
- `series/01-back-pain/`: 9:16, 65 s, timed to the MP3.
- `series/complete/`: 16:9, 177 s "A Space to Heal" song video (`lyrics.md`, `captions-en.srt`, `youtube/`).
- `series/03-neck-pain/`: 9:16 paper-cut animated film (177 s main + short). It has its own `README.md`, `lib/` engine, `tools/` audio scripts and `CREDITS.md`. Read that README before touching it.
- `assets/`, `vendor/`: fonts, images and GSAP are vendored, so no CDN is used.
- `studio/`: the Video Studio web app (see `studio/README.md`). Run with `npm run studio`; it has no dependencies. Projects it creates live in `studio/projects/` (gitignored).
- `docs/`: PRD and studio notes.

## Commands (from the repo root)

```bash
npm install
npm run render:back        # series/01-back-pain
npm run render:complete    # series/complete (177 s)
npm run render:neck        # neck-pain main (~10 min)
npm run render:neck-short  # neck-pain 20 s short (~1.5 min)
npm run studio             # Video Studio UI at http://127.0.0.1:4173
```

Rendering needs FFmpeg and a Chrome headless shell (`npx hyperframes doctor`). Output goes to `renders/`, which is gitignored along with `*.mp4`.

## Conventions

- **Determinism is the rule.** All motion comes from a single paused GSAP timeline (registered on `window.__timelines[...]`), and each frame must be a pure function of time. Do not use timers, `Date.now()` or unseeded randomness. Frames can render in any order.
- Scene, caption and mouth-sync timings follow the audio track. When you change the audio, update the timing arrays (`PH`, `CAP`, `capTimes`, `talk`).
- **Modesty is structural in character art:** hijab covers hair, neck and chest; garments are opaque, loose and full length; Dr. Munaza's mask always covers nose and mouth, and no mouth is drawn for her. Keep this.
- Captions reflect only what is actually sung or spoken in the track.
- Colors are CSS variables in `:root`. The films use Poppins (matching the site); the studio UI uses Archivo + Inter per `docs/design-standard.md`.
- There is no CI: all rendering is local.
- `docs/planning/` holds the promo script and the 150 s master prompt.
