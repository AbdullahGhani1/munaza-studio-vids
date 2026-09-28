# Video Studio

Local-first web UI for the PRD in `docs/PRD.md`, built to `docs/site-contract.md` and `docs/design-standard.md`. It turns five inputs (topic, optional reference, style, length, size) into a reviewable, deterministic, code-rendered video project.

```bash
npm run studio          # http://127.0.0.1:4173  (PORT=... to change, STUDIO_HOME=... to move projects)
```

No dependencies: a Node http server (`server.mjs`), a vanilla ES-module front end (`public/`), and project templates (`templates/`). It binds to 127.0.0.1 only and rejects foreign hosts and origins.

## What works

| Area | Status |
|------|--------|
| Brief form, validation, live aspect preview, draft autosave | Done |
| Project library (search, filter, duplicate, delete to `.trash`, reveal) | Done |
| Reference upload, ffprobe metadata, ffmpeg frame extraction (up to 12 frames) | Done |
| Storyboard generation (MAESTRO-style beats), scene editing, add/duplicate/delete/reorder, rebalance, timing validation | Done. The generator is a deterministic template, not a model call |
| Approve → scaffold (CLAUDE.md, shotlist, style guide, audio plan, seek(t) renderer, render.mjs, copy-ready prompt) | Done |
| Scrubbable animatic preview (the scaffold's real `window.seek(t)`), timeline, beat ticks, keyboard shortcuts | Done |
| Sound: music upload, manual BPM → `audio/beats.json`, mix level | Done. No automatic beat detection |
| Review: 7 scores, three-round 8+ gate, live contact sheet / fast-action strip / phone proof, issue list, fix-pass prompt | Done. Scores are entered by the user |
| Files tree, assets table, delivery list | Done |

## What does not (yet)

- **Claude Code is not launched from the UI.** The studio writes the project folder and a copy-ready prompt (`CLAUDE-PROMPT.md`) instead (PRD §16 leaves this configurable).
- **No MP4 is rendered by the studio.** Run `npm install && npx playwright install chromium && npm run animatic` inside the project folder. Final files then appear under Review → Delivery.
- **No automatic style extraction.** Frames are extracted, but the take/avoid lists are templates for you to edit; Claude Code refines the style guide from `refs/frames`.
- Voiceover generation, synthesized SFX, URL references and product-site asset capture (FR-16/17/23) are not built.
- Multi-format recomposition (FR-20), background job queue with cancel/retry, and undo in the plan editor are not built.

## Layout

```
studio/
  server.mjs        API, uploads, static files
  lib/plan.mjs      brief validation, plan generation, timing checks
  lib/scaffold.mjs  project folder writer
  templates/        index.html (seek renderer), render.mjs, CLAUDE.md
  public/           index.html, app.css (design tokens), app.js
  projects/         created projects (gitignored)
```
