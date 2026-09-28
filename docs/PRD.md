_PRODUCT REQUIREMENTS DOCUMENT_

# Claude Code Video Creation Studio

A desktop-first creative workspace that turns a topic, a visual reference, a style direction, a runtime and an output size into a reviewable, code-rendered video project.

Version 1.1  |  September 29, 2026  |  Status: Draft for implementation  |  Updated to incorporate supplied Markdown and motion-design blueprint PDF

# 1. Executive summary

Build a polished video-creation interface inspired by VidEngineer’s editorial analysis workspace and guided reference-to-production flow. The product is a local-first front end for Claude Code: the user supplies five required inputs, the system creates a production brief and timed storyboard, and Claude Code builds and renders a deterministic animation project. The user can inspect previews and review artifacts before exporting the final MP4 and source project.

This is a video creation studio, not a reference-video analysis product. It may inspect a supplied reference to extract visual grammar (pacing, framing, palette, transitions and typography), but it must create an original video about the user’s topic and must not reproduce the reference’s story, branded assets, characters or exact shot sequence. The supplied Markdown and PDF also inform the production stages: a deterministic seek(t) renderer, explicit art direction, beat-aware sound, optional animation frameworks, identity continuity, iterative visual QA and reusable project instructions.

# 2. Product vision and goals

## Vision

Make high-quality, repeatable motion-design videos approachable through a small creative brief and a transparent production pipeline powered by Claude Code.

## Goals

- Collect exactly the core inputs the user expects: topic, reference video, style, duration and output dimensions.
- Translate those inputs into a style guide, shot list and renderer instructions before animation code is generated.
- Render videos reproducibly from code so an individual frame can be generated at any timestamp.
- Show tangible evidence at each stage: extracted reference frames, storyboard, preview, contact sheet, quality notes and export.
- Keep the workflow useful on a developer workstation and project folder; avoid requiring a proprietary cloud video-generation backend.
## Non-goals

- Cloning VidEngineer’s brand, text, code, assets or exact screen design. Use its information hierarchy and workspace patterns as inspiration only.
- Automated virality prediction, social analytics, public teardown library, subscriptions or team collaboration in MVP.
- A general-purpose nonlinear editor with arbitrary clip trimming and multitrack editing.
- Guaranteed photorealistic generative footage. MVP is code-generated motion design; optional external media is user-supplied.
- Automatic online scraping/downloading of arbitrary video platforms.
# 3. Target users and primary use case

| User | Need | Success outcome |
| --- | --- | --- |
| Creator / marketer | Turn an idea and a visual reference into a short social or brand video. | A polished, correctly sized MP4 plus editable project files. |
| Developer using Claude Code | Use an AI coding agent to build and render animation locally. | A reproducible project, clear progress, inspectable source and reliable export. |
| Motion-design learner | Learn from reference pacing and style while making original work. | A style guide and shot-by-shot plan that explain the creative decisions. |

## Primary user journey

1. Create project and enter the video topic.
1. Attach a reference video file or provide a permitted local path/URL; choose a style direction.
1. Set runtime and choose an output-size preset in a dropdown.
1. Review the generated style guide and timed storyboard.
1. Approve the plan and start Claude Code generation.
1. Review a low-resolution animatic and contact sheet; request revisions or continue.
1. Run final render, inspect quality summary and download/open MP4 and source project.
# 4. Product principles

- Brief before build: show and preserve the plan before generating animation code.
- Reference grammar, original content: borrow motion and visual traits, not protected content.
- Visible progress: never leave a user guessing whether Claude Code is thinking, rendering or blocked.
- Deterministic frames: render output must be a pure function of time, with stable seeded variation.
- Reviewable quality: expose frames, scores and known issues before calling a render complete.
- Sensible defaults: only the five inputs are required; advanced settings stay collapsed.
# 5. Required inputs and form behavior

| Field | Control | Required / default | Requirements |
| --- | --- | --- | --- |
| Topic | Multiline text area | Required | What the video is about; prompt user for one central idea, audience, and desired takeaway if helpful. No hard-coded topic. |
| Reference video | Upload drop zone + optional local path/URL | Optional | Accept common video formats and a frame/image reference. Show filename, duration, thumbnail, replace/remove actions. URL support is best-effort and only for accessible sources. |
| Visual style | Searchable dropdown + custom text option | Required | Preset examples: cinematic, editorial, minimalist, kinetic typography, 2D illustration, 3D, paper/collage, retro/analog, product UI motion, custom. Reference-derived style can be selected. |
| Video length | Dropdown with custom option | Required | Preset values: 10s, 15s, 20s, 30s, 45s, 60s; custom value in seconds. Validation and estimated render time shown. |
| Output size | Dropdown with preview dimensions | Required; default 9:16 | Presets: 9:16 vertical (1080×1920), 1:1 square (1080×1080), 16:9 landscape (1920×1080), 4:5 portrait (1080×1350), custom width × height. |
| Project name | Text input | Optional; derived from topic | Safe folder name; user can edit. |

The creation form’s primary action is “Build my video plan.” The app must not silently begin a full render on form submission.

# 6. Scope and requirements

## 6.1 MVP functional requirements

FR-01 Project setup — Create a named project from the required brief fields. Persist inputs in a project manifest so users can close and resume.

FR-02 Reference intake — Accept local video/image files; validate type and size; create a thumbnail and basic metadata. Extract representative frames at configurable intervals when ffmpeg is installed.

FR-03 Reference style guide — When reference exists, generate a concise guide covering palette, typography, composition, camera language, shot duration, transitions, texture and motion. Include a “take / do not take” section.

FR-04 Originality guardrail — Prompt Claude Code to preserve topic originality and avoid reproducing reference content, logos, characters, claims or exact composition. Show this rule in the plan UI.

FR-05 Timed storyboard — Generate timestamped beats/scenes covering the complete runtime. Each scene includes purpose, visuals, motion, on-screen text, narration (optional), audio cue and transition.

FR-06 Plan review — Let the user edit the logline, scene descriptions, captions, narration, style notes and timing before code generation. Add/remove/reorder scenes and rebalance timestamps.

FR-07 Claude Code handoff — Create project instructions (CLAUDE.md or equivalent), structured brief/storyboard/style guide, asset directories and renderer scaffold. Launch Claude Code in the project through a documented local integration or produce a copy-ready prompt when direct launch is unavailable.

FR-08 Deterministic renderer — Support a frame-seeking contract such as window.seek(t) or draw(t); render frames in headless Chromium/Playwright and encode with ffmpeg. Seed procedural variation; no render-time timers or nondeterministic random calls.

FR-09 Preview and animatic — Render a low-resolution preview before full-resolution output. Provide play/pause, scrub, scene markers, current time and fit-to-frame preview.

FR-10 Quality review — Create a contact sheet and representative frame strips. Score hook, phone-size readability, motion, variety, composition, style match and audio sync; list issues with timestamps. User may request a fix pass.

FR-11 Final export — Render MP4 in selected aspect ratio and dimensions using H.264/yuv420p. Include poster frame, contact sheet, README, source code and manifest in the project output.

FR-12 Progress and recovery — Show pipeline stage, current action, logs/errors and cancel/retry controls. Preserve completed outputs and resume safely after a recoverable failure.

FR-13 Project library — Show local projects with thumbnail, topic, duration, size, status and last modified time; reopen or reveal the project folder.

FR-14 Accessibility and responsive UI — Keyboard-accessible controls, visible focus, labels, captions for generated narration where applicable, and usable layout at desktop and tablet widths.

FR-15 Character and visual identity lock — For recurring characters, create an identity sheet covering silhouette, proportions, signature colors, expression states and motion grammar. Generate reference/contact-sheet previews and flag identity drift before animation.

FR-16 Audio planning and beat map — Support either user-supplied music or a synthesized/original score option. Analyze supplied audio for BPM, beats, downbeats and transient peaks; save beats.json. Map scene changes, voiceover and sound effects to the beat grid. Generate per-scene narration and/or sound cues only when enabled.

FR-17 Audio mix and safety — Keep voiceover as separate scene assets when generated, avoid time-stretching speech, mix narration clearly above music, prevent clipping and target approximately -14 LUFS for the final mix. Protect API credentials in environment variables and never expose them in UI logs.

FR-18 Render framework selection — Provide a recommended code-rendering route by default (single HTML/canvas or SVG plus seek(t)); expose optional framework selection for reusable/data-driven projects (e.g., Remotion) or web-layout/GSAP workflows (e.g., HyperFrames). Explain trade-offs and validate chosen dependencies.

FR-19 Motion polish pass — After first render, inspect motion for linear slides, dead frames, poor spring settling, text swaps, pops and excessive easing. Support closed-form springs/keyframe tracks and render consecutive-frame strips around fast actions.

FR-20 Multi-format output — Allow optional additional aspect ratios from the same timeline. Recompose scene layouts and typography for each target; do not simply crop a master render.

FR-21 Reusable studio instructions — Generate project-level CLAUDE.md and a reusable command/template (e.g., /motion-reel) that captures the renderer contract, style guardrails, audio workflow, review gates and delivery checklist for future videos.

FR-22 Production deliverables — Deliver final MP4, poster frame, contact sheet, source project, README and render metadata; optionally include loop-check MP4, scene strips, phone-size proof, audio stems and beat map.

FR-23 Optional asset gathering — If the user supplies a product/site URL and authorizes local asset capture, use Playwright to gather real logos, screenshots, fonts and colors into assets/ and list them before animation. Never invent product UI, logos or claims.

## 6.2 Production stages and states

| Stage | User sees | Completion artifact |
| --- | --- | --- |
| Brief | Input summary and validation | project.json |
| Reference review | Upload metadata, sampled frames, style extraction status | refs/frames/* and style_guide.md |
| Plan | Logline, beat sheet, scene cards with timestamps | docs/shotlist.md |
| Build | Claude Code activity, files changed, runtime checks | src/*, render.mjs, CLAUDE.md |
| Animatic | Low-resolution video and scene-level review controls | out/animatic.mp4 |
| Audio prep | Beat map, optional voice files, sound cues and mix settings | audio/beats.json, audio/vo/*, docs/audio_plan.md |
| Critique | Contact sheet, category scores, timestamped issues, frame strips and phone-size proof | out/contact.png, out/strip.png, out/phone.png and docs/review_log.md |
| Final render | Resolution, FPS, codec, progress and output location | out/final.mp4 |
| Delivered | Video player, download/open folder, project summary | poster.png, README.md, source bundle |

## 6.3 Storyboard scene contract

Each scene card must contain: scene number and start/end time; communication purpose; visual composition; camera framing/movement; primary and secondary motion; on-screen text; optional voiceover; music/SFX cue; beat/downbeat alignment; transition into the next scene. The opening should establish a clear hook within two seconds. Ensure a new visual event or payoff every two to four seconds where the format supports it. Avoid duplicating narration verbatim as large on-screen copy. Every scene should advance the single central idea. When appropriate, transitions should visibly transform an object or action between scenes rather than simply switching slides.

# 7. UI / UX requirements

## 7.1 Design direction

Use a dark editorial studio shell with restrained accent color, generous negative space, high-contrast typography and image-led cards. The reference’s premium teardown workspace informs hierarchy: a clear hero action, compact project metadata, a large preview, and secondary tabs for plan, scenes, sound and assets. Keep controls legible and calm; the workspace must feel like a creation tool rather than an analytics dashboard.

## 7.2 Main screens

| Screen | Layout and key interactions |
| --- | --- |
| Projects | Header with “New video”; project grid/list with preview image, topic, status, duration, output size and resume action. Empty state explains the five required inputs. |
| New video brief | Focused form for Topic, Reference video, Style, Length and Size. Size selector displays aspect-ratio preview tiles. “Build my video plan” starts brief validation. |
| Project workspace | Left rail: stages and files. Main canvas: video preview/player and scene timeline. Right panel: selected scene or project settings. Top bar: project name, status, save, render/export actions. Tabs: Plan, Scenes, Preview, Sound, Assets, Files. Timeline shows scene blocks, audio waveform, beat/downbeat markers and playhead; lightweight trim/reorder is in scope, full nonlinear editing is not. |
| Plan review | Logline and style summary at top; timeline beat sheet and editable scene cards below; reference frames and take/do-not-take notes in side panel. Actions: Edit, Regenerate selected section, Approve and build. Include identity sheet when characters recur. |
| Review and delivery | Preview player with time ruler, contact sheet, phone-size proof, frame strips, loop-check option, quality score summary and timestamped issue list. Show final export details and links/actions for MP4, poster, project folder and source archive. |

## 7.3 Layout behavior

- Desktop first: 1440px reference canvas; support 1280px wide workspace without horizontal overflow.
- At narrow widths, collapse the rail and inspector into drawers; keep preview and primary action visible.
- On size selection, update a live aspect-ratio preview and human-readable pixel dimensions.
- Use status chips for Draft, Planning, Building, Preview ready, Rendering, Complete and Needs attention.
- Use scene thumbnails/timestamps for navigation; selecting a scene seeks the preview to its start.
## 7.4 Audio and assets panel

- Show imported or generated music, per-scene voiceover and SFX as separate tracks or asset rows with mute/solo and preview controls.
- Show waveform and beat markers when analysis is available; allow user to replace the track and regenerate the beat map.
- List every gathered/used asset with source, local path and usage context. Product-site assets must be real captures or supplied files.
# 8. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Performance | Form and project-list interactions should feel immediate. Reference extraction and render work run as background tasks with progress updates. Preview render should be lower resolution and complete before full render. |
| Reliability | Project manifest is written atomically. Failed render must not destroy previous successful output. Errors include a clear cause and next action. |
| Reproducibility | Same source, seed and settings produce visually identical frames. Record renderer version, FPS, dimensions, duration, seed and tool versions in manifest. |
| Privacy | Local-first handling by default. Clearly disclose if a file or prompt must be sent to an external model/API. Never upload reference media without explicit configuration and user awareness. |
| Compatibility | Target macOS and Windows developer workstations; document Node.js, Chromium/Playwright and ffmpeg requirements. |
| Output | H.264 MP4 with yuv420p compatibility; configurable FPS (default 30; 60 optional); high-quality final encode and poster/contact sheet. |
| Accessibility | Semantic labels, keyboard use, adequate contrast, reduced-motion option for interface animations and accessible status announcements. |

# 9. Suggested technical architecture

Implementation is intentionally flexible; Claude Code may choose the app stack. Keep UI, orchestration and render project boundaries explicit.

| Layer | Responsibilities |
| --- | --- |
| Web UI | Brief input, project browser, stage progress, storyboard editor, preview player, review and export controls. |
| Local orchestrator | Manage project folders, validate dependencies, execute safe scripts, track jobs, collect logs and expose stage status. |
| Claude Code agent | Interpret approved brief, write style/scene/code files, build animation, review rendered frames and make targeted revisions. |
| Renderer | Pure time-seek scene renderer; Playwright/Chromium frame capture; ffmpeg mux/encode; contact sheet generation. |
| Project storage | Local project directory with manifest, inputs, references, docs, assets, audio, source, logs and outputs. |
| Audio analysis and mix | Optional Python/librosa or equivalent for beat/transient detection; generated/imported VO and SFX; ffmpeg audio mixing and loudness validation. |
| Framework adapters | Default minimal renderer plus optional Remotion and HyperFrames workflows, selected explicitly and scaffolded with current compatible dependencies. |

Suggested project structure: project.json; CLAUDE.md; refs/original and refs/frames; docs/style_guide.md, character_bible.md, shotlist.md, audio_plan.md, review_log.md; assets/; audio/track.wav, beats.json, vo/, sfx/; src/; render.mjs; out/animatic.mp4, final.mp4, loop_check.mp4, poster.png, contact.png, strip.png, phone.png; README.md; reusable motion-reel command/template.

# 10. Data model (MVP)

| Entity | Core fields |
| --- | --- |
| Project | id, name, topic, style, durationSeconds, outputWidth, outputHeight, fps, status, createdAt, updatedAt, seed |
| ReferenceAsset | id, projectId, localPath, mediaType, fileSize, duration, dimensions, thumbnailPath, extractedFrames[], sourceKind |
| Scene | id, projectId, order, startSeconds, endSeconds, purpose, visual, camera, motion, onScreenText[], narrationAsset, audioCue, beatRefs[], transition, reviewNotes |
| AudioAsset | id, projectId, type (music/voiceover/sfx), localPath, sceneId, duration, source, beatAnalysisRef, mixLevel |
| CharacterBible | id, projectId, characterName, silhouette, proportions, palette, expressions[], motionGrammar, referenceSheetPath |
| RenderJob | id, projectId, stage, status, progress, startedAt, completedAt, commandSummary, logsPath, errorCode, errorMessage |
| Review | id, projectId, scoresByCategory, timestampedIssues[], contactSheetPath, createdAt |

# 11. Safety, rights and content rules

- Treat uploaded media and project text as user-provided data; keep local unless the user chooses a remote provider.
- Only process a reference URL when the source is publicly accessible and usage is permitted; otherwise ask for a local upload. Do not bypass access controls or download restrictions.
- Use visual references to derive general style traits. Do not recreate a creator’s exact sequence, script, character, logo, watermark, or distinctive branded artwork.
- Make generated factual claims traceable to user-provided details or cited assets; do not invent customer testimonials, metrics, endorsements or medical/financial claims.
- Warn before replacing an existing export; version the previous final file or require the user to choose a new filename.
# 12. MVP acceptance criteria

- User can create a project using a topic, style, duration and output-size dropdown, with an optional reference video. The four required values are validated before planning starts.
- Size dropdown includes 9:16, 1:1, 16:9, 4:5 and custom dimensions; selecting an option updates the visible preview shape and dimensions.
- When a reference is provided, the project contains representative frames and a style guide that identifies transferable traits and protected content to avoid.
- The generated storyboard covers the full requested length; scene times are ordered, non-overlapping and sum to the selected duration within one frame.
- User can edit the plan and approve it before Claude Code writes animation code or starts a full render.
- Generated renderer supports seeking directly to an arbitrary timestamp and deterministic re-rendering of the same frame.
- User can preview a low-resolution animatic, inspect contact sheet, fast-action frame strip, phone-size proof and timestamped critique, and trigger a targeted revision pass.
- When audio is supplied or enabled, the project can produce a beat map and align scene changes/SFX to beats or downbeats; audio is optional and clearly controlled.
- When recurring characters are present, an identity sheet is generated and available for review before animation.
- Optional multi-format exports recompose the layout for each selected aspect ratio rather than crop the master.
- Final export matches the selected dimensions/aspect ratio, plays as H.264 MP4, and includes poster, contact sheet, README and source project.
- Project can be reopened after app restart with input values, plan, progress and completed outputs preserved.
- If Claude Code, Chromium or ffmpeg is unavailable, the UI explains the missing dependency and provides setup guidance instead of failing silently.
# 13. Success metrics

| Metric | MVP target |
| --- | --- |
| Brief completion | At least 80% of users who start the brief reach plan review. |
| Plan approval | At least 70% of generated storyboards are approved after no more than two edits. |
| Render completion | At least 90% of valid local renders complete without unrecoverable failure. |
| Time to first preview | Track median time from plan approval to animatic preview; establish baseline, then reduce through iteration. |
| Export success | At least 95% of completed projects include playable video and required review artifacts. |
| Reproducibility | Same project and seed produce identical sampled frame hashes in validation runs. |

# 14. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Claude Code output varies in quality or structure. | Use strict scene and renderer contracts, project-level CLAUDE.md, output validation and frame review. |
| Long or high-resolution renders appear stalled. | Provide stage progress, estimated remaining work where possible, cancellation and low-res preview. |
| Reference URL inaccessible or protected. | Offer local upload, show actionable failure and avoid bypassing restrictions. |
| Different aspect ratios cause poor composition. | Recompose with layout-aware scene constraints; do not simply crop a render made for another format. |
| Missing system tools block local rendering. | Run preflight checks and show install guidance before launching a render. |
| Reference copying risk. | Make originality constraints explicit in prompt, style guide and plan-review UI. |

# 15. Delivery plan

| Milestone | Scope | Exit condition |
| --- | --- | --- |
| M1 — Brief and project shell | Projects view, five inputs, local manifest, dependency preflight. | Project can be created and reopened. |
| M2 — Reference and planning | Media intake, frame extraction, style guide, storyboard generation/edit. | User can approve an editable plan. |
| M3 — Claude Code build loop | Project scaffold, deterministic renderer, job progress, animatic preview. | Approved brief produces a playable preview. |
| M4 — Review and export | Contact sheet, critique, targeted revision, final encode and delivery screen. | All acceptance criteria for export pass. |
| M5 — Audio and studio reuse | Beat analysis, voice/SFX workflow, multi-format re-composition, reusable CLAUDE.md/command, optional framework adapters. | A repeatable project template can create the next video with the same review and export gates. |

# 16. Decisions to keep configurable

- Default video length and allowable maximum.
- Default FPS and whether 60 FPS is offered in the first release.
- Whether direct Claude Code process launch is supported or the first version uses a copy-ready prompt and local project scaffold.
- Audio scope at launch: supplied music analysis only, synthesized score, per-scene voiceover, and/or generated SFX.
- Whether to ship framework adapters (Remotion/HyperFrames) in MVP or document them as optional routes.
- Maximum reference file size and custom output dimension limits.
_End of PRD_
