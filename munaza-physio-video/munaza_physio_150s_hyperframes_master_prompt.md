@munaza-physio-video/assets/Move_Like_You_Mean_It.mp3
@munaza-physio-video/assets/posts 
@munaza-physio-video/assets/site_logo.png
@munaza-physio-video/assets/Doctor_munaza_ghani.png
@munaza-physio-video/assets/clinic.png
Story Leader The MAESTRO style

# MASTER VIDEO PROMPT — Munaza Physio Studio
## 2:30 Cinematic Motion-Graphics Website Promo using HyperFrames

### ROLE
Act as a **senior motion designer, creative director, healthcare brand strategist, frontend animation engineer, and HyperFrames production engineer**.

Your job is to design and build a **fully rendered 2 minute 30 second motion-graphics promo video** for:

**Munaza Physio Studio**  
Website: https://munazaphysio.studio/  
About: https://munazaphysio.studio/about  
Conditions / Services: https://munazaphysio.studio/conditions  

The practice is **women-only physiotherapy in Lahore**, led by **Dr. Munaza Ghani**. The film should explain what the clinic offers, how women can use the website, what kinds of physiotherapy concerns are covered, and why the service is designed around privacy, dignity, individualized assessment, rehabilitation, mobility, confidence, and function.

Do **not** make unsupported medical claims. Do **not** promise guaranteed recovery, instant treatment, permanent cure, 100% results, or fixed recovery times.

---

# PRIMARY OBJECTIVE

Create a **premium, cinematic, highly dynamic 150-second film** that feels like a polished healthcare campaign, not a generic startup explainer.

The final video must:

- Introduce **Dr. Munaza Ghani** and Munaza Physio Studio.
- Communicate that the clinic is **for women and girls only**.
- Present major physiotherapy areas clearly and responsibly.
- Show examples such as:
  - Back Pain
  - Neck Pain
  - Frozen Shoulder
  - Shoulder and upper-limb conditions
  - Hip / Knee / Foot & Ankle problems
  - Women’s Health Physiotherapy
  - Pelvic-health related rehabilitation where appropriate
  - Sports Injury Rehabilitation
  - Neurological Rehabilitation
  - Pediatric Physiotherapy / developmental rehabilitation
  - Balance, gait and mobility rehabilitation
  - Post-fracture / post-surgical rehabilitation where listed on the website
- Explain how the website helps users:
  - discover services
  - understand conditions
  - learn about the clinic
  - find contact information
  - book / contact the clinic where supported
- End with a strong, memorable clinic identity and CTA.

The film must feel like it **could only belong to Munaza Physio Studio**.

---

# REQUIRED TECH STACK

Build the project with **HyperFrames**:

https://github.com/heygen-com/hyperframes

Install/update the core HyperFrames skills first:

```bash
npx skills add heygen-com/hyperframes
# or, for non-interactive/agent runs:
npx hyperframes skills update
```

Use HyperFrames as the primary production system.

HyperFrames requirements:

- HTML/CSS/JavaScript composition
- deterministic frame rendering
- finite GSAP timelines
- all timelines created with:

```js
const tl = gsap.timeline({ paused: true });
window.__timelines["munaza-physio-150s"] = tl;
```

- root `data-composition-id` must be exactly:

```text
munaza-physio-150s
```

- root canvas:
  - 1920 × 1080
  - 30 fps
  - 150 seconds
- no runtime wall-clock dependencies
- no `Date.now()`
- no `performance.now()`
- no unseeded `Math.random()`
- no infinite loops
- no render-critical hover / scroll / timers
- seeded randomness only for particles
- media playback must be owned by HyperFrames
- do not manually call `video.play()`, `video.pause()`, or modify media currentTime
- all render-critical motion must be seek-safe and deterministic

HyperFrames rendering should produce the final MP4 directly.

Use **Three.js via the HyperFrames adapter** only if genuine 3D depth, lighting, particles, camera travel, or dimensional environments materially improve the shot.

Optional fallback only if absolutely necessary:
https://www.remotion.dev/

Use **21st.dev** for refined component references where appropriate:
https://21st.dev/community/components

Do not create generic placeholder UI. Rebuild actual Munaza site cards, navigation, page sections, buttons and interface states from real website screenshots/content.

---

# REFERENCE-DRIVEN ART DIRECTION

Do **not** rely on the default centered-text + gradient-background AI-video look.

Before animation:

1. Inspect the real Munaza Physio Studio website.
2. Collect screenshots of:
   - homepage
   - About
   - Conditions
   - service cards
   - contact / booking UI
   - navigation
   - any real clinic imagery supplied by the user
3. Use the user-provided reference videos / visual references.
4. Select **1–2 visual references** whose:
   - pacing
   - typography
   - edit rhythm
   - camera motion
   - transition language
   - composition density
   best fit this healthcare campaign.
5. State which 1–2 references are being matched before implementation.

Do not imitate copyrighted footage shot-for-shot. Match the **design grammar, pacing, editorial energy, transition logic and typographic behavior**, while creating an original Munaza-specific composition.

---

# BRAND SYSTEM

Use the Munaza visual language consistently.

Primary palette:

```css
--red: #E7212B;
--dark-red: #C80710;
--black: #101010;
--charcoal: #151515;
--pure-black: #000000;
--white: #FFFFFF;
--soft-accent: #FFF3F3;
--off-white: #FAFAFA;
--grey: #474747;
```

Primary visual character:

- strong Munaza red
- premium black
- clinical off-white
- high contrast
- elegant medical editorial design
- sophisticated motion
- confident but compassionate
- no cheap gradients
- no excessive glow
- no cyberpunk blue/purple
- no fake medical sci-fi overlays
- no random skeletons
- no inaccurate anatomy

Typography:

- use a premium modern grotesk / editorial sans for English
- if Urdu captions are generated, use a verified Urdu-capable font such as:
  - Noto Nastaliq Urdu
  - Gulzar
  - Mehr Nastaliq Web
- never use broken or disconnected Urdu glyphs

Logo:

- use the supplied official Munaza logo
- preserve aspect ratio
- never redraw it incorrectly
- final logo reveal should use real brand geometry

---

# CREATIVE MOTION LANGUAGE

The film must combine these four signature systems:

## 1. MASKED TYPE
Use large typographic masks to reveal:
- Dr. Munaza Ghani
- WOMEN-ONLY PHYSIOTHERAPY
- BACK PAIN
- NECK PAIN
- FROZEN SHOULDER
- WOMEN’S HEALTH
- REHABILITATION
- MOVE WITH CONFIDENCE

Techniques:
- clip-path wipes
- SVG masks
- image-through-type
- side-to-side editorial cropping
- oversized edge-to-edge typography

## 2. ELASTIC TYPE
Use finite GSAP elastic/spring-style typography for selected service words.

Examples:
- BACK
- NECK
- SHOULDER
- BALANCE
- MOVE
- STRENGTH

Keep movement elegant and controlled. No cartoon bounce.

## 3. SPRING STACK
Use spring-stacked website/service cards to demonstrate how the site works.

Examples:
- service card enters
- next card stacks above
- cursor/tap selects a condition
- page expands
- information panel opens
- Contact / Book CTA becomes visible

The UI must look like Munaza’s real website rather than invented SaaS UI.

## 4. PARTICLE LOGO
Final brand reveal:

- sample particles from the real Munaza logo geometry
- particles start scattered
- use **seeded deterministic coordinates**
- particles flow into the logo
- resolve into the exact official logo
- finish crisp and static

No random particle positions at render time.

---

# PRESENTER CHARACTER

Use a recurring **female presenter character** throughout the film.

Preferred visual:
- professional Pakistani female physiotherapist / presenter
- modest attire
- clinic-appropriate
- warm, confident and energetic
- natural facial expressions
- no exaggerated influencer behavior

If using the supplied Dr. Munaza reference:
- navy hijab
- white clinical coat
- modest navy medical attire
- clinical mask only where appropriate
- preserve professional identity cues
- do not create uncanny facial animation

Character behavior:
- direct-to-camera intro
- occasional side-profile / three-quarter shots
- gestures toward service cards
- points to navigation
- demonstrates “how to use the website”
- appears in clinic scene
- appears beside motion graphics
- never blocks critical text

Talking animation:
- subtle head movement
- blinking
- restrained hand gestures
- natural mouth synchronization
- no puppet-like motion

---

# NARRATION STYLE

Primary narration:
- **energetic female Pakistani voice**
- warm
- clear
- intelligent
- reassuring
- premium commercial tone
- moderate pace
- confident, never salesy
- medically responsible

Background score:
- light cinematic score
- soft piano
- subtle strings
- gentle percussion
- warm ambient texture
- optional light South-Asian rhythmic accent
- dialogue always dominant
- music must never overpower narration
- avoid dramatic trailer booms
- avoid aggressive EDM

Sound design:
- soft whooshes
- card snaps
- kinetic text ticks
- subtle risers
- particle shimmer
- restrained UI taps
- gentle room tone in clinic shots

---

# FULL 150-SECOND STORY STRUCTURE

## SCENE 01 — 0:00–0:10
### Cold Open — “Movement Matters”

Visual:
- black → red flash frame → clinic texture
- macro motion fragments
- masked type reveals:
  - “PAIN CAN CHANGE HOW YOU MOVE.”
  - “THE RIGHT SUPPORT CAN CHANGE WHAT COMES NEXT.”
- cut to female presenter

Narration:
“Pain, stiffness or difficulty moving can affect work, sleep, confidence and everyday life.”

Motion:
- masked type
- one hard cut
- slow push-in
- restrained red wipe

---

## SCENE 02 — 0:10–0:24
### Meet Dr. Munaza Ghani

Visual:
- presenter / supplied doctor imagery
- clinic environment
- name reveal
- subtle lower-third

On-screen:
**Dr. Munaza Ghani**
**Women-Only Physiotherapy — Lahore**

Narration:
“At Munaza Physio Studio in Lahore, Dr. Munaza Ghani provides physiotherapy and rehabilitation designed specifically for women and girls.”

Do not add qualifications not verified by source material supplied or visible on the website.

---

## SCENE 03 — 0:24–0:38
### What the Clinic Helps With

Rapid but readable elastic-type sequence:

- Back Pain
- Neck Pain
- Frozen Shoulder
- Joint Pain
- Sports Injuries
- Mobility Problems

Use different clinically believable female poses.

Narration:
“From back and neck pain to frozen shoulder, joint problems, sports injuries and movement limitations, care begins with understanding the individual.”

---

## SCENE 04 — 0:38–0:53
### Women’s Health

Visual:
- softer transition
- off-white / red editorial layout
- privacy / dignity / women-only message
- tasteful women’s-health iconography

On-screen:
**Women’s Health Physiotherapy**
**Privacy. Dignity. Individual Care.**

Narration:
“The studio also supports women’s health physiotherapy, with an emphasis on privacy, dignity and care tailored to each stage of life.”

No explicit or sensational anatomical graphics.

---

## SCENE 05 — 0:53–1:08
### Rehabilitation Beyond Pain

Visual:
layered cards for:
- neurological rehabilitation
- pediatric rehabilitation
- sports rehabilitation
- balance and gait
- post-injury / post-surgical rehabilitation where supported by site content

Narration:
“Rehabilitation may also focus on neurological conditions, pediatric needs, sports recovery, balance, gait and rebuilding everyday function.”

Use wording such as:
- “may support”
- “assessment”
- “rehabilitation”
- “individual goals”

Never imply guaranteed outcomes.

---

## SCENE 06 — 1:08–1:23
### How Care Feels

Visual:
- clinic room
- one-on-one female physiotherapist
- assessment
- movement testing
- guided exercise
- hands-on care where appropriate
- no invasive procedures

On-screen kinetic words:
**ASSESS**
**UNDERSTAND**
**PLAN**
**PROGRESS**

Narration:
“The process is personal: assess what is limiting movement, understand the goal, build a plan, and progress rehabilitation according to the person in front of you.”

---

## SCENE 07 — 1:23–1:41
### Website Walkthrough — Spring Stack

Use actual website screenshots or faithful UI reconstruction.

Show:
1. open munazaphysio.studio
2. browse Conditions
3. choose a condition
4. read service information
5. open About
6. find contact / booking information

Narration:
“The website makes it easy to explore conditions, understand available services, learn about the clinic, and find the next step when you are ready to get in touch.”

Animation:
- spring-stack cards
- real cursor
- realistic mobile and desktop viewport
- screen content remains sharp and readable

---

## SCENE 08 — 1:41–1:56
### Back Pain Micro-Story

Visual:
- woman struggles with sitting / bending
- clean transition into guided movement
- end on more confident movement

On-screen:
**BACK PAIN**
**Movement • Strength • Function**

Narration:
“For back pain, the goal is not a miracle promise. It is careful assessment, better movement strategies and a rehabilitation plan built around function.”

---

## SCENE 09 — 1:56–2:09
### Frozen Shoulder + Neck Pain

Split visual:
- frozen shoulder: limited overhead reach
- neck pain: guarded rotation / posture
- progression visuals emphasize assessment and movement

Narration:
“With shoulder stiffness or neck pain, rehabilitation can focus on comfortable movement, mobility, strength and the activities that matter in daily life.”

No flames.
No glowing skeletons.
No “cure” wording.

---

## SCENE 10 — 2:09–2:20
### Women-Only Promise

Visual:
- women of different adult age groups
- clinic details
- calm confidence
- presenter returns to camera

Large masked typography:
**FOR WOMEN.**
**FOR MOVEMENT.**
**FOR EVERYDAY LIFE.**

Narration:
“A women-only environment means care can be delivered with privacy, cultural sensitivity and a clearer focus on each woman’s needs.”

---

## SCENE 11 — 2:20–2:30
### Particle Logo + CTA

Visual:
- particles scatter on black
- deterministic seeded flow
- assemble into exact Munaza logo
- final red / black / white lockup

On-screen:

**Munaza Physio Studio**
**Women-Only Physiotherapy — Lahore**

**+92 307 5810689**
**munazaphysio.studio**

Optional:
**Hasham St, Karim Block, Allama Iqbal Town, Lahore**

Narration:
“Munaza Physio Studio. Move with confidence, with care designed for women.”

End on the brand for at least 1.5 seconds.

---

# CAPTIONS

Create synchronized captions throughout.

English:
- clean sans-serif
- max 2 lines
- safe lower-third region
- word-level highlighting only where elegant

Also create an optional Urdu caption track:
- proper RTL
- Noto Nastaliq Urdu or another verified Urdu font
- never mirrored
- never disconnected
- never fake glyphs

Export:
- burned-in English master
- optional Urdu-caption master
- optional `.srt` / `.vtt`

---

# WEBSITE ACCURACY RULES

Use the website as the primary source of truth for:
- services
- condition names
- clinic information
- women-only positioning
- contact details
- address
- hours
- page structure

Important:
- if the website contains a typo, inconsistent job title, outdated wording, or contradictory copy, **do not amplify it blindly**
- use clinically consistent, neutral wording
- preserve only verified physiotherapy claims
- do not invent qualifications
- do not invent awards
- do not invent patient counts
- do not invent success rates
- do not invent recovery timelines

---

# CLINICAL SAFETY / CLAIMS

Allowed:
- “may support”
- “can help assess”
- “rehabilitation may focus on”
- “movement, strength, balance and function”
- “individualized physiotherapy assessment”
- “guided rehabilitation”
- “alongside medical care”
- “when medically appropriate”
- “screening and referral when needed”

Never use:
- guaranteed recovery
- cure
- permanent cure
- instant treatment
- 100% results
- fixed recovery times
- “works for everyone”
- “pain-free in X days”
- unsupported before/after claims

---

# VISUAL QUALITY RULES

People:
- photorealistic
- anatomically correct
- correct hands and fingers
- believable joints
- natural shoulder mechanics
- natural gait
- realistic seated and standing posture
- no duplicated limbs
- no impossible joint angles
- no deformed faces
- no AI-plastic skin

Clinical visuals:
- anatomically plausible
- no random red-glow anatomy unless subtle and location-appropriate
- no fake X-rays
- no sci-fi medical HUDs
- no floating organs
- no misleading diagnosis graphics

Clinic:
- use the supplied clinic image where appropriate
- preserve real spatial cues
- do not invent large hospital environments if the actual practice is a clinic/home-clinic environment

---

# CAMERA & EDITING VOCABULARY

Use director-level notes internally:

- hard cut
- match cut
- push in
- pull back
- parallax drift
- lateral track
- rack-style focus simulation
- whip-mask
- type wipe
- snap zoom
- hold
- overshoot
- settle
- cut on beat
- J-cut audio
- L-cut narration
- 0.7x slow push
- 1.15x micro punch-in

Avoid:
- every element fading in
- endless center alignment
- identical easing everywhere
- random camera movement
- overuse of zoom blur
- excessive motion blur
- unnecessary spin transitions

---

# ANIMATION IMPLEMENTATION

Use:
- GSAP for most motion
- SVG masks for typography
- CSS for layout
- Canvas or SVG particles for logo build
- Three.js only where actual 3D helps
- optional Lottie for small deterministic icons

Create reusable composition files:

```text
/compositions
  intro.html
  doctor.html
  services.html
  womens-health.html
  rehab.html
  care-process.html
  website-walkthrough.html
  back-pain.html
  shoulder-neck.html
  women-only.html
  logo-outro.html
  captions.html
```

Each composition:
- wrapped in `<template>`
- explicit `data-width`
- explicit `data-height`
- deterministic timeline
- finite duration
- registered timeline
- no uncontrolled async animation

Master:
```text
index.html
data-composition-id="munaza-physio-150s"
```

---

# ASSET PLAN

Create:

```text
/assets
  /brand
    logo.png
    logo.svg
  /site
    homepage.png
    about.png
    conditions.png
    contact.png
  /clinic
    clinic-room.png
  /doctor
    dr-munaza.png
  /patients
  /icons
  /audio
    voiceover.wav
    music.wav
    sfx.wav
```

Never rely on remote media during final deterministic render if it can be downloaded and bundled locally.

---

# PRODUCTION WORKFLOW — DO NOT SKIP

## PHASE 1 — RESEARCH + AUDIT
Before coding:
- inspect the site
- extract brand tokens
- inventory pages
- identify actual services
- capture screenshots
- inspect all supplied assets
- inspect reference videos

Deliver:
`research-notes.md`

## PHASE 2 — THREE STORYBOARD OPTIONS
Produce **3 distinct storyboard variants** before animation.

Each must include:
- timecode
- narration
- visual
- motion
- transition
- camera
- typography behavior
- site/UI elements

Suggested directions:

### Variant A — Editorial Kinetic Healthcare
Bold masked type, hard cuts, strong red/black/off-white.

### Variant B — Cinematic Clinic + UI
More presenter / clinic photography with elegant kinetic type.

### Variant C — Motion Systems Showcase
Heavier use of Masked Type + Elastic Type + Spring Stack + Particle Logo.

Do not render full motion yet.

## PHASE 3 — STILL FRAMES
For the selected direction, generate **one still frame for every scene**.

Deliver:
```text
/storyboard-stills/scene-01.png
...
/storyboard-stills/scene-11.png
```

Check:
- hierarchy
- spacing
- readability
- logo fidelity
- medical accuracy
- subject anatomy
- safe text regions
- brand consistency

Only after stills are coherent, continue.

## PHASE 4 — BUILD MOTION
Implement the selected storyboard in HyperFrames.

## PHASE 5 — DIRECTOR PASS
Perform a full review and make specific corrections such as:
- slow push-in to 0.7x
- remove redundant fades
- hard cut at beat
- increase hold by 8 frames
- reduce overshoot
- move CTA 80 px upward
- reduce music by 4 dB
- increase caption safe margin
- shorten card transition by 6 frames

## PHASE 6 — QA
Validate:
- 1920×1080
- 30 fps
- 150 s exact or within ±1 frame
- no missing fonts
- no broken images
- no non-deterministic animation
- captions synchronized
- logo readable
- phone readable
- URL readable
- no clipped text
- no malformed hands
- no impossible physiotherapy posture
- no medical overclaims
- audio peaks controlled
- voice intelligible on phone speakers

---

# DELIVERABLES

Produce:

```text
munaza-physio-video/
├── index.html
├── package.json
├── README.md
├── research-notes.md
├── storyboard.md
├── script.md
├── captions-en.srt
├── captions-ur.srt
├── compositions/
├── assets/
├── storyboard-stills/
└── renders/
    ├── munaza-physio-150s-en.mp4
    └── munaza-physio-150s-ur.mp4
```

Also export a poster frame:

```text
renders/munaza-physio-cover.png
```

---

# PREVIEW + RENDER

Use the current HyperFrames CLI as documented by the installed version.

Typical commands may resemble:

```bash
npx hyperframes preview
npx hyperframes render --output renders/munaza-physio-150s-en.mp4
```

If CLI flags differ:
- inspect the installed HyperFrames README / CLI help
- use the current syntax
- do not invent unsupported flags

For a pinned render environment when needed:

```bash
npx hyperframes render --docker --output renders/munaza-physio-150s-en.mp4
```

---

# FINAL CREATIVE STANDARD

The finished film must not feel like:
- a PowerPoint
- a slideshow
- a generic AI explainer
- a SaaS launch video
- a template with Munaza text pasted into it

It should feel like:
- a premium healthcare campaign
- an Awwwards-level motion identity
- an editorial film
- a modern women’s-health brand
- a real clinic with a real point of view
- a film designed specifically around Munaza Physio Studio

The viewer should understand, by the end:

1. **Who Dr. Munaza Ghani is**
2. **That the service is women-only**
3. **What kinds of physiotherapy concerns are covered**
4. **How rehabilitation is approached**
5. **How to use the website**
6. **How to contact the clinic**
7. **That the message is about movement, confidence, dignity and function — not miracle claims**

### Final CTA
**Munaza Physio Studio**  
**Women-Only Physiotherapy in Lahore**  
**+92 307 5810689**  
**https://munazaphysio.studio/**
