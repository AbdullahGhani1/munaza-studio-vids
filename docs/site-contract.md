# Site Contract: Video Creation Studio

Product: the local-first web UI in `docs/PRD.md` v1.1 (Claude Code Video Creation Studio).
This contract is what an agent builds from. It has three parts: page structure (with purpose), content inventory (with constraints), and behaviour spec. Part 4 is a self-check against the PRD.

**Scope note.** The PRD does not label features "Must-Have". I treat FR-01 to FR-14 plus the MVP acceptance criteria (PRD §12) as Must-Have, and FR-15 to FR-23 as M5 (Should-Have, delivered later). Every Must-Have maps to a page below in the traceability table (§4).

**Conventions.** IDs like `P2.S3` mean Page 2, Section 3. Character limits count characters including spaces. "Empty" means zero items, "loading" means a background task is running. Copy examples are normative for tone: plain, calm, second person, no exclamation marks, no hype words.

---

## 1. Page structure

Global shell (present on every page) then five pages. Sections are listed top to bottom in render order.

### G. Global shell

| # | Section | Purpose |
|---|---------|---------|
| G1 | Top bar | Orient the user (where am I, which project) and hold the one primary action for the current page. Never holds more than one primary button |
| G2 | Dependency banner | Tell the user, before they hit a failure, that Claude Code, Chromium/Playwright or ffmpeg is missing, and how to fix it (PRD §12 last bullet). Hidden when all three pass preflight |
| G3 | Toast/live region | Announce background-task results and errors to sighted and screen-reader users without stealing focus |

### P1. Projects `/`

| # | Section | Purpose |
|---|---------|---------|
| P1.S1 | Header | Name the page and expose "New video", the only way to start work |
| P1.S2 | Filter row | Let a returning user find a project by status or name quickly. Hidden when there are 0 projects |
| P1.S3 | Project grid | Show local projects so the user can resume, with just enough metadata to recognise each one |
| P1.S4 | Empty state | For a first-time user, explain the five inputs the tool needs, so the brief page holds no surprises |

### P2. New video brief `/new`

| # | Section | Purpose |
|---|---------|---------|
| P2.S1 | Intro line | State what happens next and, explicitly, that nothing renders yet |
| P2.S2 | Topic | Capture the one central idea, audience and takeaway. The most important input |
| P2.S3 | Reference | Optionally supply a visual reference so the plan borrows grammar, not content |
| P2.S4 | Visual style | Pick a look; defaults to the reference-derived style when one exists |
| P2.S5 | Length | Fix the runtime that the storyboard must fill exactly |
| P2.S6 | Output size | Fix the frame shape, with a live shape preview so the user sees what they are choosing |
| P2.S7 | Advanced (collapsed) | Hold optional settings (project name, FPS, seed, framework) so the five required inputs stay uncluttered |
| P2.S8 | Submit bar | One primary action, "Build my video plan", that starts validation and planning only |

### P3. Project workspace `/p/:id/:tab`

Left rail + main canvas + right inspector; tabs Plan, Scenes, Preview, Sound, Assets, Files (default: the tab that matches the current stage).

| # | Section | Purpose |
|---|---------|---------|
| P3.S1 | Project header | Show name, status chip and the stage-appropriate action (Approve and build, Render final, Export) |
| P3.S2 | Stage rail | Show the pipeline (Brief, Reference review, Plan, Build, Animatic, Audio prep, Critique, Final render, Delivered) and which stage is current, done or blocked |
| P3.S3 | Activity panel | Give continuous visible progress: current action, log tail, cancel/retry. The user never has to guess whether Claude Code is working (PRD principle 3) |
| P3.S4 | Preview player | Play the animatic/final at the project's aspect ratio, so the user judges the real thing |
| P3.S5 | Timeline | Show scenes, audio waveform, beat/downbeat markers and playhead; support light trim/reorder only |
| P3.S6 | Inspector | Edit the selected scene or project-level settings without leaving the canvas |
| P3.S7 | Tab panels: Sound, Assets, Files | Manage music/VO/SFX rows, every gathered asset with provenance, and the project folder tree |

### P4. Plan review `/p/:id/plan`

| # | Section | Purpose |
|---|---------|---------|
| P4.S1 | Logline and style summary | Confirm the film's single idea and look before any code is written |
| P4.S2 | Originality guardrail | State the rule visibly (FR-04): the reference lends grammar, never story, logos, characters or claims |
| P4.S3 | Reference frames + take / do-not-take | Show what was learned from the reference and what is protected |
| P4.S4 | Beat sheet timeline | Show the whole runtime as timed blocks so pacing problems are visible at a glance |
| P4.S5 | Scene cards | Let the user edit, add, remove and reorder scenes; the contract for every scene lives here |
| P4.S6 | Identity sheet (only when characters recur) | Lock silhouette, palette and expressions before animation (FR-15) |
| P4.S7 | Approval bar | Make approval an explicit, deliberate act: nothing builds until it is pressed |

### P5. Review and delivery `/p/:id/review`

| # | Section | Purpose |
|---|---------|---------|
| P5.S1 | Score summary | Show the seven category scores and whether the 8+ gate passed |
| P5.S2 | Proof gallery | Show evidence, not claims: contact sheet, fast-action strip, phone-size proof, optional loop check |
| P5.S3 | Issue list | List timestamped problems; clicking one seeks the player there |
| P5.S4 | Fix pass | Let the user request a targeted revision of chosen issues only |
| P5.S5 | Delivery | Provide MP4, poster, contact sheet, README, source archive, open-folder action and render metadata |

---

## 2. Content inventory

Legend: **R** required, **O** optional. Every field lists format, length/limits, default, validation message. Validation messages are the literal copy.

### G. Global shell

| Field | Format | Constraints |
|-------|--------|-------------|
| Product name | Text | "Video Studio", 1 line |
| Project title (top bar) | Text | Max 60, truncate with ellipsis, full name in tooltip |
| Status chip | Enum | Draft, Planning, Building, Preview ready, Rendering, Complete, Needs attention. Colour plus text plus icon, never colour alone |
| Dependency banner | Text | Per missing tool: "ffmpeg not found. Install it, then choose Check again." + copyable install command + "Check again" button. Max 140 chars |
| Toast | Text | Max 120 chars, auto-dismiss 6 s for success, persistent for errors |

### P1. Projects

| Section | Field | Format / constraint |
|---------|-------|---------------------|
| S1 | Title | "Projects" |
| S1 | Button | "New video" (primary) |
| S2 | Search | Text, filters by name/topic as you type, 200 ms debounce |
| S2 | Status filter | Multi-select over the 7 statuses; default all |
| S2 | Sort | Last modified (default), name, created |
| S3 | Card: thumbnail | 16:9 crop box that shows the project's real aspect ratio letterboxed; fallback: neutral tile with format icon |
| S3 | Card: name | Max 60, 1 line |
| S3 | Card: topic | Max 2 lines then ellipsis |
| S3 | Card: meta | `30 s · 9:16 · 1080×1920` |
| S3 | Card: status chip | as G |
| S3 | Card: last modified | Relative ("2 hours ago"), absolute in tooltip |
| S3 | Card actions | Resume (primary), overflow menu: Reveal in folder, Duplicate, Delete |
| S4 | Heading | "Start with five inputs" |
| S4 | List | Topic, Reference video (optional), Visual style, Length, Output size. One line each, max 60 chars |
| S4 | Button | "New video" |

### P2. New video brief

| Section | Field | Type | R/O | Default | Constraints and copy |
|---------|-------|------|:---:|---------|----------------------|
| S1 | Intro | Text | – | – | "Answer five questions. We build a plan for you to approve. Nothing renders yet." Max 120 |
| S2 | Topic | Multiline | R | empty | 10–600 chars. Placeholder: "One central idea, who it is for, and what they should take away." Counter appears at 500. Error: "Add a sentence about what the video is for." |
| S3 | Reference file | Drop zone | O | none | Video (mp4, mov, webm, m4v) or image (png, jpg, webp). Max 500 MB (configurable, PRD §16). Shows filename, duration, thumbnail, size, Replace, Remove |
| S3 | Reference URL/path | Text | O | none | Public URL or local path. Best-effort. On failure: "We couldn't open that link. Upload the file instead." No cookie or auth bypass |
| S3 | Reference note | Text | – | – | "We borrow pacing, palette and type. We never copy the story, logos or characters." Max 100 |
| S4 | Style | Searchable select + custom | R | none (or "From reference" when a reference exists) | Presets: Cinematic, Editorial, Minimalist, Kinetic typography, 2D illustration, 3D, Paper/collage, Retro/analog, Product UI motion, From reference, Custom. Custom text 3–120 chars. Error: "Choose a style or describe your own." |
| S5 | Length | Select + custom | R | 30 s | Presets 10, 15, 20, 30, 45, 60 s. Custom: integer seconds 5–180 (max configurable). Under the field: "Estimated render time: about X min" once size is also chosen. Error: "Enter a length between 5 and 180 seconds." |
| S6 | Size | Select with shape tiles | R | 9:16 | 9:16 1080×1920, 1:1 1080×1080, 16:9 1920×1080, 4:5 1080×1350, Custom. Custom W and H: integers 240–4096, even numbers only. Live preview rectangle plus text "1080 × 1920 px". Error: "Width and height must be even numbers from 240 to 4096." |
| S7 | Project name | Text | O | derived from topic | 1–60 chars, letters, digits, space, hyphen, underscore; folder-safe slug shown beneath. Error on duplicate: "A project with this name exists. Choose another." |
| S7 | FPS | Select | O | 30 | 24, 30, 60 |
| S7 | Seed | Integer | O | random once, then fixed | 0–2³¹. Shown so users can reproduce |
| S7 | Render framework | Radio | O | Recommended: single HTML + seek(t) | Also Remotion, HyperFrames, each with one-line trade-off (max 100 chars) |
| S8 | Primary | Button | – | – | "Build my video plan". Disabled until R fields valid; the disabled reason is available on focus/hover |
| S8 | Secondary | Link | – | – | "Cancel" returns to `/` and asks to discard only if any field is dirty |

### P3. Workspace

| Section | Field | Constraints |
|---------|-------|-------------|
| S1 | Project name | Inline editable, rules as P2.S7 |
| S1 | Status chip | as G |
| S1 | Primary action | One of: "Approve and build", "Render final", "Open delivery". Save is automatic; "Saved 12:04" indicator beside it |
| S2 | Stage list | 9 stages; each has state (todo, active, done, failed), completion artifact filename, click to jump to its tab |
| S3 | Current action | 1 sentence, max 100: "Rendering frame 412 of 900" |
| S3 | Progress | Determinate bar when count known, else indeterminate with elapsed time; ETA only when computed from ≥10% progress |
| S3 | Log tail | Last 200 lines, monospaced, secrets redacted (`***`), Copy and Download log |
| S3 | Controls | Cancel (confirm), Retry (after failure), never both at once |
| S4 | Player | Play/Pause, scrub bar, current/total time `00:12 / 00:30`, scene markers, fit-to-frame, mute, resolution label (Animatic 540p / Final) |
| S5 | Scene block | Colour by scene, label = number + short purpose (max 20 chars), width proportional to duration |
| S5 | Audio lane | Waveform, beat ticks (thin), downbeat ticks (thick, accent) |
| S5 | Playhead | Shows time, snaps to beat when Shift is held |
| S6 | Scene form | Fields listed under P4.S5 |
| S6 | Project form | Style, length, size, FPS, seed; changing length or size after plan approval requires confirmation: "This will need a new plan and render." |
| S7 | Sound row | Type icon, name, source (uploaded/synthesized/generated), duration, mix level (−40 to 0 dB), Mute, Solo, Preview, Replace |
| S7 | Asset row | Thumbnail, filename, source (captured / supplied / generated), source URL or path, local path, used in scene(s) |
| S7 | Files tree | Read-only tree of the project folder with size; Reveal in folder |

### P4. Plan review

| Section | Field | Constraints |
|---------|-------|-------------|
| S1 | Logline | Text, 1 sentence, max 160 chars, editable, Regenerate |
| S1 | Style summary | 3–5 short lines (palette hex chips, type families, texture, camera) each max 80 chars |
| S2 | Guardrail text | Fixed: "This video borrows pacing, palette and type from your reference. It does not reuse its story, logos, characters or claims." Not editable, not dismissible |
| S3 | Reference frames | Up to 12 thumbnails at 0.5–2 s intervals with timestamps |
| S3 | Take list | 3–8 bullets, max 80 each, editable |
| S3 | Do-not-take list | 3–8 bullets, max 80 each, editable |
| S4 | Timeline | Scene blocks whose total equals the chosen length within 1 frame; a red total indicator appears otherwise: "Scenes add up to 28.6 s. Target is 30 s." + "Rebalance" |
| S5 | Scene number | Auto, reorder renumbers |
| S5 | Start / end | Seconds, 0.1 s steps, ordered, non-overlapping. Error: "This scene overlaps the next one." |
| S5 | Purpose | Text, 1 sentence, max 120, R |
| S5 | Visual | Text, max 240, R (composition, objects, labels) |
| S5 | Camera | Text, max 100, O |
| S5 | Motion | Text, max 200 (primary and secondary), R |
| S5 | On-screen text | List, each ≤ 40 chars and ≤ 8 words, ≤ 3 items. Must not duplicate narration verbatim (soft warning) |
| S5 | Voiceover | Text, O, 125–145 words per minute of scene length (soft warning outside range) |
| S5 | Audio cue | Text, max 100, O |
| S5 | Beat alignment | Read-only chips of nearest beat/downbeat when a beat map exists |
| S5 | Transition | Text, max 100, R: the visible object that becomes the next scene (last scene: "loop to first" or "hold") |
| S5 | Actions | Add scene, Duplicate, Delete (confirm if it is the only scene), drag handle, Regenerate this scene |
| S6 | Character | Name, silhouette, proportions, palette (hex, sampled), 5 expression states, motion grammar (idle, point, inspect, react, exit), contact sheet image, "Flag drift" |
| S7 | Buttons | "Approve and build" (primary), "Save draft", "Regenerate plan" (confirm, warns that edits are lost) |
| S7 | Helper | "Claude Code starts writing code only after you approve." |

### P5. Review and delivery

| Section | Field | Constraints |
|---------|-------|-------------|
| S1 | Categories | Hook in first 2 s, Phone readability, Motion, Visual variety, Composition, Style match, Sound sync. Integer 1–10 each |
| S1 | Gate | "Passed" only when all ≥ 8; otherwise "Needs work: 3 issues" |
| S1 | Round | "Review round 2 of at least 3" plus a score-history sparkline |
| S2 | Proofs | Contact sheet (2 fps, 6 across), Strip (12 frames around the fastest action), Phone proof (360 px wide), Loop check (optional video). Each clickable to zoom, with Download |
| S3 | Issue | Timestamp `0:04.1`, category, description max 160, severity (blocking, minor), checkbox for fix pass |
| S4 | Button | "Fix selected issues" (disabled when none selected) |
| S5 | Files | final.mp4 (dimensions, fps, codec, size), poster.png, contact.png, README.md, source.zip, render metadata (renderer version, fps, dimensions, duration, seed, tool versions) |
| S5 | Actions | Play, Download, Open project folder, "Export another format" |
| S5 | Overwrite warning | "A final render already exists. Keep the old one as v1 or choose a new filename." |

---

## 3. Behaviour spec

### 3.1 Navigation

- Routes: `/`, `/new`, `/p/:id/:tab`, `/p/:id/plan`, `/p/:id/review`. Every route is deep-linkable and restores state after an app restart (PRD §12).
- Top bar shows breadcrumb `Projects / <name>`; "Projects" always returns to `/`.
- The stage rail is the primary in-project navigation. Clicking a done stage opens its artifact; clicking a future stage is disabled with tooltip "Complete Plan first".
- Browser Back from `/new` with a dirty form asks before discarding.
- After "Build my video plan", route to `/p/:id/plan` and show Planning state; if the user leaves, the job continues and the status chip on the card updates.
- Scene navigation: selecting a scene card, timeline block or issue seeks the player to that scene's start (PRD §7.3).

### 3.2 Forms and validation

- Validate on blur and on submit, never on first keystroke. Errors sit under the field, in text, linked with `aria-describedby`; the first invalid field takes focus on failed submit.
- Auto-save drafts of `/new` locally every 2 s so a closed tab loses nothing.
- Choosing a size updates the aspect-ratio tile and the pixel readout within one frame (no delay, no animation longer than 150 ms).
- Selecting a reference generates a thumbnail and duration; a long extraction runs as a background task with a progress chip, and the form stays usable.
- Submitting is idempotent: double-clicks create one project.

### 3.3 Scroll and layout

- Only the main canvas scrolls; top bar and stage rail are fixed. Scene cards list scrolls independently of the timeline, which stays pinned at the top of P4.
- Preserve scroll position when switching tabs and when returning from a modal.
- Timeline scrolls horizontally when the project is longer than the viewport; zoom 25–400 % with Ctrl/Cmd + wheel or +/− buttons.
- Long logs auto-scroll to the end unless the user has scrolled up; a "Jump to latest" chip appears.

### 3.4 Hover, focus, active, disabled

| State | Rule |
|-------|------|
| Hover | Cards lift 2 px and brighten border; buttons brighten fill 8 %. Hover reveals secondary actions, but every hover action is also reachable by keyboard and via the overflow menu |
| Focus | 2 px visible outline, 3:1 contrast against both neighbours, never removed |
| Active | Buttons darken 6 % and translate 1 px |
| Disabled | 40 % opacity, `aria-disabled`, and a reason exposed on focus |
| Drag | Scene cards and timeline blocks show a drop indicator line and lift; Esc cancels |

### 3.5 Transitions and motion (interface, not video)

- UI transitions: 150 ms ease-out for hover/focus, 200 ms for panels and drawers, 250 ms for route changes (cross-fade only). No bounces, no parallax.
- Status chip changes cross-fade in 150 ms; progress bars animate width in 200 ms linear.
- `prefers-reduced-motion`: replace all transitions with instant changes and stop the progress-bar shimmer. The user setting "Reduce interface motion" overrides the OS.
- No autoplay of video with sound. The animatic never autoplays; the poster shows first.

### 3.6 Player and timeline

- Keys: Space play/pause, ←/→ 1 frame, Shift+←/→ 1 s, J/K/L shuttle, `[` `]` previous/next scene, M mute.
- Scrubbing is frame-accurate and uses the seek contract; preview shows a low-res frame immediately, then upgrades within 300 ms.
- Trim and reorder are allowed on scene blocks only; audio can be replaced but not cut. Any timing edit re-validates that scenes still sum to the runtime.

### 3.7 Breakpoints

| Width | Layout |
|-------|--------|
| ≥ 1440 | Reference canvas: rail 240 px, inspector 320 px, canvas fluid |
| 1280–1439 | Rail 200 px, inspector 300 px; no horizontal overflow |
| 768–1279 | Rail and inspector collapse to drawers (buttons in the top bar); player and primary action always visible |
| < 768 | Read-only fallback: Projects list and delivery downloads only; editing shows "Use a wider window to edit the plan" |

### 3.8 Long tasks, errors and recovery

- Every background task shows stage, current action and elapsed time within 500 ms of starting.
- Cancel asks for confirmation and preserves completed outputs. Retry resumes from the last completed artifact.
- Failed render never overwrites the previous successful output. Errors state cause and next action, e.g. "Render stopped at frame 412: Chromium closed. Retry from frame 400."
- Missing dependency: G2 banner plus the disabled action explains why; no silent failure.
- Secrets (API keys) live in environment variables and are redacted in all UI logs.

### 3.9 Accessibility

- All controls reachable by keyboard in visual order; skip link to main canvas; landmarks (header, nav, main, complementary).
- Status changes go to an `aria-live="polite"` region; errors use `assertive`.
- Contrast ≥ 4.5:1 for text, 3:1 for UI components; status never conveyed by colour alone.
- Drag-and-drop has keyboard equivalents (move up/down buttons on scene cards).
- Captions for any narration preview.

### 3.10 Visual system (from PRD §7.1)

Dark editorial shell, one restrained accent, generous negative space, high-contrast type, image-led cards. One display face and one UI face. Tokens defined once as CSS variables; light theme is out of MVP scope.

---

## 4. Self-check against the four review questions

### 4.1 Is every Must-Have feature from the PRD represented?

| Requirement | Where |
|-------------|-------|
| FR-01 Project setup and manifest | P2, P1 (resume), 3.1 |
| FR-02 Reference intake | P2.S3, P3.S7 |
| FR-03 Reference style guide | P4.S1, P4.S3 |
| FR-04 Originality guardrail | P2.S3 note, P4.S2 |
| FR-05 Timed storyboard | P4.S4, P4.S5 |
| FR-06 Plan review and edit | P4.S5, P4.S7 |
| FR-07 Claude Code handoff | P4.S7 ("Approve and build"), P3.S3. **Gap:** the copy-ready prompt fallback needs its own dialog (see §4.4) |
| FR-08 Deterministic renderer | Behaviour 3.6 (seek), P2.S7 seed |
| FR-09 Preview and animatic | P3.S4, P3.S5, 3.6 |
| FR-10 Quality review | P5.S1–S4 |
| FR-11 Final export | P5.S5 |
| FR-12 Progress and recovery | P3.S3, 3.8 |
| FR-13 Project library | P1 |
| FR-14 Accessibility and responsive | 3.7, 3.9 |
| M5 (FR-15 to FR-23) | FR-15 P4.S6; FR-16/17 P3.S7 Sound tab; FR-18 P2.S7; FR-20 P5.S5 "Export another format"; FR-21 and FR-22 P5.S5; FR-19 P5.S3/S4; FR-23 P3.S7 Assets. Stated at field level only where it changes the UI; FR-23 (URL asset capture) has no entry point yet |

MVP acceptance criteria: all are covered except "warn before replacing an existing export", which is covered (P5.S5) but has no interaction spec beyond copy.

### 4.2 Is the content inventory specific enough to build from without questions?

Mostly. Every field has type, limit, default and validation copy. Remaining questions an implementer would still ask:
- Exact accent colour, type families and spacing scale (PRD §7.1 gives direction only).
- Which fields are editable after the plan is approved (only length/size are addressed).
- Scoring source for P5: who assigns the seven scores (Claude Code self-review vs. user override)? The PRD says Claude scores; the contract assumes read-only scores with a user "disagree" option, which is not specified.
- Empty and loading states for P3 tab panels other than P1.S4.

### 4.3 Does the behaviour spec cover every interaction you care about?

Covered: navigation, forms, scroll, hover/focus, transitions, breakpoints, player keys, long tasks, errors, accessibility. Not covered:
- Concurrent jobs (two projects rendering at once).
- Multi-window or two-tab editing of one project (conflict handling).
- Undo/redo in the plan editor.
- Delete-project flow and whether deleted files go to trash.
- Touch gestures on the timeline at tablet widths.

### 4.4 What decisions are left implicit, and should they be?

| Implicit decision | Verdict |
|-------------------|---------|
| Direct Claude Code launch vs. copy-ready prompt (PRD §16 leaves it configurable) | **Make explicit.** It changes P4.S7 and P3.S3 completely. Recommended default: copy-ready prompt plus scaffolded folder for v1, with direct launch as a setting |
| Max lengths (180 s, 500 MB, 4096 px) | Set here as defaults; keep configurable, but state them |
| Single user, no auth, no cloud | Leave implicit; PRD non-goals already say so |
| FPS default 30, 60 offered | Leave configurable as PRD §16 says |
| Light theme, i18n, RTL | Leave out of MVP, but the film work in this repo includes Urdu captions, so decide early whether the *studio UI* ever needs RTL |
| Score ownership (AI vs. user) | **Make explicit** before building P5 |
| Tech stack | Leave to the implementing agent (PRD §9) but require the three layers stay separable |

## 5. Next steps

1. Decide launch mode (prompt vs. process) and score ownership; update §2 P4.S7 and P5.S1.
2. Add design tokens (accent, fonts, spacing) as `docs/design-tokens.md`.
3. Build M1 (P1, P2, shell, preflight) first, since it exercises the most fields and validation rules.
