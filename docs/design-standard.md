# Design Standard: Video Creation Studio

Applies to the studio web app in `docs/PRD.md` and `docs/site-contract.md`. It does **not** govern the videos themselves (those follow each film's own look) or munazaphysio.studio.

**Vibe sentence.** A calm, dark editorial workspace where the video is the brightest thing on screen: warm charcoal, cream type, one coral accent, quiet motion.

**Rule of the document.** Every statement resolves to a value. If a decision is not here, derive it from the tokens below; never invent a new colour, size, radius or duration. Contrast figures are approximate WCAG ratios computed for the exact hex pairs given.

Sources: PRD §7.1 (dark editorial shell, restrained accent, negative space, image-led cards), the motion-design blueprint (warm cream / coral / charcoal / teal palette, one display face + one UI face, one accent, texture never over legibility).

---

## 1. Colour palette

Warm neutrals, not blue-blacks. One accent (coral). Semantic colours appear only for status.

### 1.1 Surfaces (dark theme, the only theme in MVP)

| Token | Hex | Use |
|-------|-----|-----|
| `--bg` | `#141413` | App background, behind everything |
| `--surface-1` | `#1C1C1A` | Cards, rail, inspector, top bar |
| `--surface-2` | `#242422` | Inputs, hovered cards, raised menus |
| `--surface-3` | `#2E2E2B` | Selected rows, active tab fill |
| `--player-bg` | `#000000` | Behind the video frame only |
| `--border` | `#2F2F2C` | Decorative dividers and card outlines (1 px) |
| `--border-strong` | `#77756C` | Input outlines, focus-adjacent component edges (≥ 3:1 on `--bg` and `--surface-1`) |
| `--scrim` | `rgba(20,20,19,0.72)` | Behind modals and drawers |

### 1.2 Text

| Token | Hex | Contrast on `--bg` | Use |
|-------|-----|:---:|-----|
| `--text` | `#F0EEE6` | ~15:1 | Headings, body, values |
| `--text-muted` | `#A8A69C` | ~7.5:1 | Secondary text, captions, placeholders, labels |
| `--text-faint` | `#84827A` | ~4.9:1 | Timestamps, hints. Minimum text tone allowed; never go below it |
| `--text-on-accent` | `#141413` | ~5.8:1 on `--accent` | Text on coral fills (white on coral fails, never use it) |

### 1.3 Accent and semantics

| Token | Hex | Use |
|-------|-----|-----|
| `--accent` | `#D97757` | Primary buttons, active stage, playhead, downbeat ticks, links, focus ring |
| `--accent-hover` | `#E38A6C` | Hover on accent fills |
| `--accent-active` | `#C4633F` | Pressed accent fills |
| `--accent-soft` | `rgba(217,119,87,0.14)` | Selected-state tint, chip background |
| `--success` | `#3FB68B` | Complete, passed gate, done stage |
| `--warning` | `#F0A93B` | Needs attention, soft validation warnings |
| `--danger` | `#F0605D` | Errors, failed stage, destructive confirm |
| `--info` | `#6C9BEF` | Rendering/building in progress, neutral notices |

Rules:
- One accent per screen. Coral is the only saturated colour outside status chips and the video.
- Status is never colour alone: every chip carries an icon and a word.
- Semantic tints for chip backgrounds are the colour at 14 % alpha; chip text is the full colour.
- Scene colours in the timeline (needs 8 distinguishable blocks): `#D97757`, `#6C9BEF`, `#3FB68B`, `#F0A93B`, `#B58CF0`, `#F06BA0`, `#5CC8D6`, `#A8A69C`, cycling. Block labels always use `--text-on-accent`.

### 1.4 Forbidden

Pure white `#FFFFFF` text or backgrounds, pure black except `--player-bg`, gradients on UI chrome, glow or coloured shadows, a second accent colour, light-grey-on-grey below `--text-faint`.

---

## 2. Typography

Two families only, both already vendored in `assets/fonts/`. Serve locally, `font-display: swap`, no CDN.

| Role | Family | Fallback stack |
|------|--------|----------------|
| Display (page titles, big numbers, hero copy) | **Archivo** variable, weights 600 and 700 | `"Archivo", system-ui, sans-serif` |
| UI (everything else) | **Inter** variable, weights 400, 500, 600 | `"Inter", system-ui, sans-serif` |
| Code and logs | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` (system, no download) | – |

### 2.1 Scale (base 16 px, ratio ≈ 1.25)

| Token | Size / line height | Weight | Letter spacing | Use |
|-------|--------------------|:---:|:---:|-----|
| `--fs-display` | 40 / 44 px | Archivo 700 | -0.02em | Page title on Projects and Brief |
| `--fs-h1` | 28 / 34 px | Archivo 700 | -0.015em | Workspace project name, section hero |
| `--fs-h2` | 20 / 28 px | Archivo 600 | -0.01em | Section headings |
| `--fs-h3` | 16 / 24 px | Inter 600 | 0 | Card titles, field group titles |
| `--fs-body` | 14 / 22 px | Inter 400 | 0 | Default text, table cells, form values |
| `--fs-body-strong` | 14 / 22 px | Inter 500 | 0 | Emphasised values, buttons |
| `--fs-small` | 12 / 18 px | Inter 400 | 0.01em | Helper text, captions, meta |
| `--fs-label` | 11 / 16 px | Inter 600, uppercase | 0.08em | Section labels, table headers, stage names |
| `--fs-mono` | 12 / 18 px | mono 400 | 0 | Log tail, filenames, hashes, timestamps in timeline |

Rules:
- Minimum text size 11 px (labels only); body text never below 14 px.
- Line length for paragraphs: max 68ch. Helper and error text: max 60ch.
- Numbers in the player, timeline and metrics use `font-variant-numeric: tabular-nums`.
- No italics, no underline except links (underline on hover and focus only, always underlined inside running text).
- Text is left-aligned. Centre only the empty state and modal titles.
- Sentence case everywhere except `--fs-label` (uppercase). Buttons: sentence case ("Build my video plan").

---

## 3. Spacing and layout

**Base unit: 4 px.** Every margin, padding and gap is a multiple of 4. Preferred steps: 4, 8, 12, 16, 24, 32, 48, 64.

| Token | Value | Use |
|-------|------:|-----|
| `--space-1` | 4 px | Icon-to-text gap, chip inner gap |
| `--space-2` | 8 px | Inside compact controls, between label and field |
| `--space-3` | 12 px | Button padding-y, list item gap |
| `--space-4` | 16 px | Default gap between related items, form field spacing |
| `--space-6` | 24 px | **Standard card padding**, gap between cards |
| `--space-8` | 32 px | **Minimum padding on all container edges** (page canvas: 32 px left and right at ≥ 1280 px, 24 px below), gap between sections |
| `--space-12` | 48 px | Between page header and content, empty-state padding |
| `--space-16` | 64 px | Top of page hero area |

Layout values:
- Reference canvas 1440 px. Rail 240 px, inspector 320 px, canvas fluid. Top bar height 56 px.
- Content max width on form pages (`/new`): 640 px, centred, with the aspect-ratio preview in a 280 px column to its right at ≥ 1100 px.
- Project grid: `repeat(auto-fill, minmax(280px, 1fr))`, gap 24 px.
- Form controls: height 40 px (inputs, selects, buttons), 32 px for compact (table row actions, timeline tools). Touch/tablet width: 44 px.
- Hit target minimum 32 × 32 px with 8 px between adjacent targets.

Radii: `--radius-sm` 6 px (chips, small buttons), `--radius-md` 10 px (inputs, buttons, cards), `--radius-lg` 16 px (modals, drawers, player frame). Nothing else. Pills use 999 px for status chips only.

Whitespace philosophy: cards breathe (24 px inside, 24 px between); dense data (logs, timeline, tables) may compress to the 8/12 px steps. A screen with fewer than 3 clear groups is cleaner than one with cramped groups.

---

## 4. Texture and atmosphere

The surface is **flat, matte and warm**: paper-dark, not glass. Depth comes from stepping surface tone, not shadows.

| Property | Value |
|----------|-------|
| Grain | A single 3 % opacity monochrome noise overlay (`assets/paper-grain.png`, tiled 256 px) on `--bg` only, `pointer-events: none`. Not on cards, inputs or the player. Disabled under `prefers-reduced-transparency` |
| Gradients | None on chrome. One allowed use: a 24 px `--surface-1` → transparent fade at the edge of horizontally scrolling regions (timeline, tab strip) |
| Blur | Only behind modals and drawers: `backdrop-filter: blur(8px)` over `--scrim`. Never on cards or the top bar |
| Elevation | Level 0 `--bg`. Level 1 `--surface-1` + 1 px `--border`. Level 2 (menus, popovers) `--surface-2` + 1 px `--border-strong` + `0 8px 24px rgba(0,0,0,0.45)`. Level 3 (modals) same shadow, `0 16px 48px rgba(0,0,0,0.55)`. No shadows on level 1 |
| Borders | 1 px solid `--border`; never 2 px except the focus ring |
| Imagery | Thumbnails and reference frames sit in `--radius-md` frames with 1 px `--border`. The video frame sits on `--player-bg` with a 1 px `--border` and `--radius-lg`. Images are shown at true aspect ratio (letterboxed), never cropped to fit |
| Icons | 20 px line icons, 1.5 px stroke, `currentColor`, one icon set only |
| Focus ring | 2 px solid `--accent`, 2 px offset, on every focusable element; contrast ≥ 3:1 against both neighbours |
| Selection | Text selection background `--accent-soft`, text `--text` |
| Scrollbars | 10 px thumb `#3A3A36`, radius 999 px, track transparent; hover thumb `#4A4A45` |

Forbidden: glassmorphism cards, glows, neon outlines, particle or animated backgrounds, drop shadows on cards, coloured shadows.

---

## 5. Interactions

The emotional quality is **calm and decisive**: short, decelerating, never bouncy. The interface should feel settled the moment it responds.

### 5.1 Timing and easing

| Purpose | Duration | Easing |
|---------|---------:|--------|
| Hover, focus, colour and border changes | 150 ms | `cubic-bezier(0.2, 0, 0, 1)` (ease-out) |
| Panels, drawers, menus, accordions, tab content | 200 ms | `cubic-bezier(0.2, 0, 0, 1)` |
| Route change (cross-fade only) | 250 ms | `cubic-bezier(0.2, 0, 0, 1)` |
| Modal in / out | 200 ms in, 150 ms out | ease-out in, `cubic-bezier(0.4, 0, 1, 1)` out |
| Progress bar width | 200 ms | linear |
| Toast in / out | 200 ms / 150 ms | ease-out, slide 8 px + fade |
| Skeleton shimmer | 1600 ms loop | linear (off under reduced motion) |

Rules: only animate `opacity`, `transform`, `background-color`, `border-color`, `color`. No spring or overshoot in UI (springs are for the videos, not the shell). Nothing animates longer than 250 ms. No animation on first paint of a page apart from the route cross-fade.

### 5.2 Hover, active, disabled

| Element | Hover | Active | Disabled |
|---------|-------|--------|----------|
| Primary button (`--accent` fill) | `--accent-hover` | `--accent-active`, translateY(1 px) | 40 % opacity, no pointer |
| Secondary button (transparent, 1 px `--border-strong`) | fill `--surface-2` | fill `--surface-3` | 40 % opacity |
| Ghost / icon button | fill `--surface-2` | fill `--surface-3` | 40 % opacity |
| Card | border `--border-strong`, translateY(-2 px), fill `--surface-2` | translateY(0) | – |
| Table / list row | fill `--surface-2` | fill `--surface-3` | – |
| Link | underline appears | `--accent-active` | – |
| Scene block (timeline) | brightness +8 %, 2 px top outline `--text` | – | – |
| Input | border `--text-muted` | – | fill `--surface-1`, text `--text-faint` |

Hover never reveals the *only* path to an action; every hover action has a keyboard and overflow-menu equivalent.

### 5.3 Reduced motion and other preferences

- `prefers-reduced-motion: reduce` (and the in-app "Reduce interface motion" setting): all durations become 0 ms, translates removed, shimmer stopped, cross-fade replaced by instant swap.
- `prefers-contrast: more`: switch `--border` to `--border-strong` and `--text-muted` to `--text`.
- `prefers-reduced-transparency`: remove grain and blur; scrim becomes opaque `#141413` at 92 %.

### 5.4 Sound and media

The interface makes no sounds. Video never autoplays. Volume defaults to 70 % and mute state persists per project.

---

## 6. Component quick reference

| Component | Spec |
|-----------|------|
| Primary button | Height 40, padding 0 16 px, `--radius-md`, `--accent` fill, `--text-on-accent`, Inter 500 14 px |
| Input / select / textarea | Height 40 (textarea min 96), padding 0 12 px, `--surface-2` fill, 1 px `--border-strong`, `--radius-md`, focus ring per §4, error state: border `--danger` + message in `--danger` at `--fs-small` with icon |
| Status chip | Height 24, padding 0 8 px, pill, 14 % tint fill, full-colour text and 16 px icon, `--fs-small` weight 500 |
| Card | `--surface-1`, 1 px `--border`, `--radius-md`, padding 24 |
| Tab | Height 40, label `--fs-body-strong`; active: `--text` with 2 px bottom border `--accent`; inactive: `--text-muted` |
| Stage rail item | Height 40, 8 px padding; done: `--success` check; active: `--accent-soft` fill + coral 2 px left bar; blocked: `--text-faint` |
| Toast | Width 360, `--surface-2`, level-2 shadow, 12 px 16 px padding, bottom-right, 24 px from edges |
| Modal | Width 480 (560 for forms), `--radius-lg`, padding 32, level-3 |
| Timeline scene block | Height 48, `--radius-sm`, scene colour fill, 2 px gap between blocks |
| Playhead | 2 px `--accent` line with 12 px triangular head |
| Beat tick / downbeat tick | 1 px `--text-faint` / 2 px `--accent`, full lane height / lane height + 4 |

---

## 7. Tokens as CSS

```css
:root {
  --bg:#141413; --surface-1:#1C1C1A; --surface-2:#242422; --surface-3:#2E2E2B;
  --player-bg:#000; --border:#2F2F2C; --border-strong:#77756C; --scrim:rgba(20,20,19,.72);
  --text:#F0EEE6; --text-muted:#A8A69C; --text-faint:#84827A; --text-on-accent:#141413;
  --accent:#D97757; --accent-hover:#E38A6C; --accent-active:#C4633F; --accent-soft:rgba(217,119,87,.14);
  --success:#3FB68B; --warning:#F0A93B; --danger:#F0605D; --info:#6C9BEF;
  --font-display:"Archivo",system-ui,sans-serif; --font-ui:"Inter",system-ui,sans-serif;
  --font-mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-6:24px;
  --space-8:32px; --space-12:48px; --space-16:64px;
  --radius-sm:6px; --radius-md:10px; --radius-lg:16px;
  --ease:cubic-bezier(.2,0,0,1); --t-fast:150ms; --t-panel:200ms; --t-route:250ms;
}
@media (prefers-reduced-motion: reduce){ :root{ --t-fast:0ms; --t-panel:0ms; --t-route:0ms; } }
```

## 8. Pass / fail test for future edits

A rule belongs here only if a developer can turn it into a CSS value without asking.

| Fails | Passes |
|-------|--------|
| "Dark backgrounds" | `--bg: #141413`, cards `#1C1C1A` |
| "Generous spacing" | 24 px card padding, 32 px minimum canvas edge padding |
| "Smooth transitions" | 150 ms / 200 ms / 250 ms, `cubic-bezier(0.2, 0, 0, 1)` |
| "Readable text" | 14 px / 22 px Inter 400 body, `--text-faint` is the darkest allowed text |
| "Subtle texture" | 3 % grain overlay on `--bg` only |

## 9. Open decisions

- **Fonts:** Archivo and Inter were chosen because they are already vendored. A serif display face would suit the "editorial" line better (the blueprint PDF uses one) but needs a new licensed file.
- **Light theme:** deliberately out of MVP; tokens are structured so a light set can replace the values later.
- **Contrast ratios** are hand-estimated. Verify with a contrast checker on the built UI before sign-off.
