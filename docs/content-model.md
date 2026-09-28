# Content model: Munaza Physio Studio video series

Source method: `docs/Claude-Motion-design-blueprint.pdf` (Brief → Frames → Sound → Review → Ship) and `docs/studio.md`. This file defines what every film in the repo is made of, and then reviews the existing films against the blueprint's critique gate.

## 1. Brand and audience

| Field | Value |
|-------|-------|
| Brand | Munaza Physio Studio, munazaphysio.studio |
| Practitioner | Dr. Munaza Ghani, women-only physiotherapy, Lahore (women and children) |
| Audience | Women (and parents of children) with everyday pain who are unsure where to start |
| One idea per film | "Start with an individual assessment." Never a cure claim, never a before/after promise |
| Tone | Warm, gentle, curious, precise. Light desi humour in hooks only, reassurance after |
| Call to action | Book an assessment at munazaphysio.studio (phone number appears only where the script lists it) |

Editorial rules (from the repo, non-negotiable):
- Modesty is structural: hijab covers hair, neck and chest; garments opaque, loose, full length; Dr. Munaza always masked, no mouth drawn.
- Real site pages only. Never redraw the website UI from imagination (blueprint p.7).
- Captions show only what is sung or spoken. No invented clinical claims.

## 2. Entities

```
Series ──< Film ──< Scene ──< Beat (caption / VO line / SFX cue)
                │
                ├── Format (9:16 / 16:9 / duration / fps)
                ├── Track (music bed, narration mix)
                ├── Cast (Character bible entries used)
                └── Review (scores, problems, fixes)
Asset (image, font, screenshot) ──used by── Scene
```

### Film
| Field | Type | Notes |
|-------|------|-------|
| `id` | slug | `00-promo`, `01-back-pain`, `03-neck-pain`, `complete` |
| `condition` | enum | back, neck, shoulder, facial-palsy, paediatric, general |
| `format` | 1080×1920 or 1920×1080 | 9:16 for series/social, 16:9 for YouTube |
| `duration_s`, `fps` | number | 30 s / 65 s / 177 s / 20 s at 30 fps |
| `composition` | path | HyperFrames HTML entry |
| `audio` | path | committed track or mix |
| `render_script` | npm script | `render`, `render:back`, `render:complete`, `render:neck`, `render:neck-short` |
| `status` | enum | draft, rendered, reviewed, shipped |

### Scene (the blueprint's scene contract, p.8)
| Field | Rule |
|-------|------|
| `range` | start–end seconds, taken from narration timing, not guessed |
| `learning_purpose` | the one product truth or idea this scene communicates |
| `visual` | composition, characters, objects, labels, camera |
| `motion` | entrance, primary action, secondary motion, exit |
| `voiceover` | one sentence per line, 125–145 wpm when teaching |
| `sound` | music cue, ambience, tactile SFX |
| `transition` | the visible object that physically becomes the next scene (no hard cuts; a hard cut is allowed only on a rehook question) |
| `on_screen_text` | brief, readable at 360 px wide, never a duplicate of the VO |

### Beat structure (MAESTRO, used by every 60 s+ film)
Moment (hook, 0–4 s) → Agitate → Escalate stakes → Silence (big question) → Twist (headfake) → Resolve (Dr. Munaza) → Open loop (next video).

### Character bible
| Character | Role | Identity locks |
|-----------|------|----------------|
| Ayesha (32) | Protagonist with neck pain | Shared rig, hijab covers hair, neck, chest |
| Ayesha's mother | Emotional anchor | Same rig, loose full-length garment |
| Dr. Munaza Ghani | Guide, from the reveal onward | Mask over nose and mouth always, no mouth drawn; still-photo variant in `assets/Doctor_munaza_ghani.png` |

Expressions required per character: neutral, curious, tired/strained, relieved, delighted. Motion grammar: idle, turn, point, inspect, react, exit.

### Asset
| Class | Location | Rule |
|-------|----------|------|
| Brand | `assets/site_logo.png`, `assets/clinic.png` | Aspect ratio preserved |
| Site captures | `assets/site/*.jpg` | Real screenshots only |
| Social posts | `assets/posts/*.png` | Used as phone-screenshot cards |
| Fonts | `assets/fonts/` | Poppins (display and UI), Caveat (notes), Noto Nastaliq (Urdu) |
| Vendor | `vendor/` | GSAP, no CDN |

### Design tokens
One display face, one UI face, one accent per scene. Dark lit paper for problem scenes, light paper for care scenes, dark brand finish. Texture belongs to the world, never over legibility.

### Track
| Field | Notes |
|-------|-------|
| `bpm`, `beats`, `downbeats`, `hits` | Measured before animation (blueprint p.12); state changes on beats, hero reveals on downbeats |
| `loudness` | -14 LUFS target (the neck-pain mix normalises to -16 LUFS; see review) |
| `voice` | One file per scene, never time-stretched |

### Caption
Line-level with karaoke sweep. Exported as SRT/VTT per film. Urdu track is RTL and shares timings.

### Format variants
The blueprint requires recomposing, never cropping: 9:16 first, then 1:1 and 16:9 from one layout-aware timeline. Current repo has 9:16 and 16:9 as separate compositions.

## 3. Film inventory

| Film | Format | Length | Structure | Voice | Status |
|------|--------|--------|-----------|-------|--------|
| Promo | 16:9 | 30 s | Masked type, elastic type, spring stack, particle logo | Presenter character, captions EN + UR | Rendered by CI |
| 01 Back Pain | 9:16 | 65 s | MAESTRO, UGC style, sung track | Song | Rendered |
| Complete: "A Space to Heal" | 16:9 | 177 s | Song-timed chapters, body maps, site walkthrough | Song | Rendered |
| 03 Neck Pain | 9:16 | 177 s | 10 scenes, "pause tab" motif, paper-cut 2.5D | TTS narration | Rendered |
| 03 Neck Pain short | 9:16 | 20 s | Silent cut with captions | None | Rendered |
| 03 Neck Pain short30 | 9:16 | 30 s | Side-view rig, narration | TTS | **Source only, not rendered** |
| 02, 04, 05, 06 | — | — | Series of six planned | — | Not started |

## 4. Publishing metadata (per film)
Title, description, hashtags, thumbnail/poster frame, SRT, chapter list, upload kit (`series/complete/youtube/`, `series/01-back-pain/tiktok-kit.md`), education settings.

---

# Director's Review

Method: the blueprint's critique gate (p.17). Score seven criteria 1–10, list the three worst problems with timestamps, fix, repeat until 8+ for three consecutive passes. Ship proofs: contact sheet, strip, phone test, loop check.

**Limits of this review.** It is a spec-and-source review. I read the storyboard, scripts, narration data, README and package configuration. I did **not** watch rendered frames: no MP4s are committed (`renders/` and `*.mp4` are gitignored) and the shell was unavailable when this was written. Scores below are therefore *provisional design-intent scores*, not a frame-based verdict. The blueprint says evidence replaces confidence, so nothing here counts as passing the gate until the proofs in section 3 are generated and scored.

## 1. Provisional scorecard (spec evidence only)

| Criterion | Back Pain 65 s | Neck Pain 177 s | Basis |
|-----------|:---:|:---:|-------|
| Hook in first 2 s | 8 | 6 | Back: comedic line plus comment sticker in 0–4 s. Neck: quiet turn, hesitation, text starts at 0.8 s; the first line is a statement, not a jolt |
| Phone readability | 7 | 7 | Both are 9:16 with short labels; not verified at 360 px |
| Motion quality | 6 | 8 | Neck has a documented deterministic paper rig with IK arms; Back is a UGC composition with fast cuts. No spring or 12-frame strip evidence for either |
| Visual variety (new thing every 2–4 s) | 8 | 6 | Back changes every 4 s. Neck scene 2 is 15 s and scene 5 is 20 s; scenes 6, 7 and 9 are 20–25 s each |
| Composition | 7 | 8 | Neck has a deliberate dark→light→dark arc and a single motif |
| Brand accuracy | 8 | 9 | Neck: real mobile captures, verified site path, `CREDITS.md`. Back: uses the supplied posts and logo only |
| Sound sync | 7 | 8 | Neck captions come from per-phrase TTS timings. Back is timed to a 66.5 s track with 1.5 s of trailing silence, so it runs 65 s instead of the scripted 60 s |

Nothing is confirmed at 8+ on all seven, so neither film has passed the gate.

## 2. Three biggest problems per film

### 03 Neck Pain (177 s)
1. **Long static stretches (98–143 s and 143–162 s).** Scenes 7 and 9 run 25 s and 19 s with one idea each. The blueprint's rule is a new visual event every 2–4 s. Fix: split the plan and website scenes into 3–4 beats with a distinct visual event each.
2. **Hook is soft (0–3 s).** The opening is a gentle turn and a caption; the pause tab pops in only after a beat. For a vertical feed, lead with the pause tab or the "ONE QUICK FIX?" contrast in the first 2 s, then settle into the quiet turn.
3. **Length versus platform.** 177 s vertical is long for TikTok/Reels, and the 20 s short carries no narration. Confirm which cut goes where and consider a 45–60 s narrated cut (`short30` already exists as source).

### 01 Back Pain (65 s)
1. **Timing drift from the script.** The track ends at 66.5 s so the film is 65 s versus the 60 s spec; the MAESTRO beat times (silence at 26–29 s, twist at 29–32 s) are therefore approximate. Fix: keep the `PH` array as the source of truth and re-check the silence beat against the audio.
2. **Fake lip-sync risk.** The script says still image with push-in for Dr. Munaza and no lip-sync; confirm the render honours that, and that the mask rule holds in this film too.
3. **Contact numbers on screen.** The phone number is in the outro; verify it matches the site before publishing.

### Cross-series
- **No proofs on disk.** There is no `contact.png`, `strip.png`, `phone.png` or `loop_check.mp4` for any film, and no `docs/review_log.md`.
- **Loudness inconsistency.** The blueprint targets -14 LUFS; the neck-pain mix normalises to -16 LUFS. Pick one target for the series (-14 for social).
- **Single-format sources.** Each film is authored in one aspect ratio. The blueprint expects one layout-aware timeline exported to 9:16, 1:1 and 16:9.
- **Missing next-video handoff.** Back Pain ends with "Next: Neck Pain"; confirm the neck film opens as its continuation and that the CTA in each is consistent.

## 3. Proof commands (run from the repo root after rendering)

```bash
mkdir -p out
ffmpeg -i renders/munaza-neck-pain-177s.mp4 -vf "fps=2,scale=270:-1,tile=6x5" -frames:v 1 out/neck-contact.png
ffmpeg -i renders/munaza-neck-pain-177s.mp4 -vf "fps=1,scale=360:-1,tile=5x3" -frames:v 1 out/neck-phone.png
ffmpeg -ss 4.1 -i renders/munaza-neck-pain-177s.mp4 -vf "scale=320:-1,tile=12x1" -frames:v 1 out/neck-strip.png
ffmpeg -stream_loop 1 -i renders/munaza-neck-pain-20s.mp4 -c copy out/neck-20s-loop-check.mp4
```

Then open the three PNGs, re-score with the table above, log the result in `docs/review_log.md`, fix the three worst problems, and repeat.

## 4. Ship checklist

- [ ] All final formats rendered
- [ ] Poster frame and contact sheet saved
- [ ] Loop check watched (short cuts)
- [ ] Three consecutive review rounds at 8+ on every criterion
- [ ] Loudness matches series target
- [ ] Captions (SRT/VTT) exported and checked against audio
- [ ] Modesty rules and mask rule verified frame by frame
- [ ] Clean source and README committed

## 5. Recommended next actions

1. Render the neck-pain short and main film, generate the four proofs, and replace the provisional scores above with frame-based ones.
2. Rework the two longest neck-pain scenes (7 and 9) into shorter beats.
3. Decide the series loudness target and apply it to every mix.
4. Add `docs/review_log.md` and `docs/style_guide.md` so later films in the series (02, 04–06) inherit the same rules.
