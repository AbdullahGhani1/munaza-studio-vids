# Credits, sources and verification

## Brand and website (verified live on 2026-09-28)

| Source | Used for |
|--------|----------|
| https://munazaphysio.studio/ | Mobile home capture (`assets/site/neck/home-00.jpg`), menu (`menu-02.jpg`) |
| https://munazaphysio.studio/neck-pain-cervical-spine | Neck page hero and "Care begins with listening" (`neck-00.jpg`, `neck-02.jpg`); page text read for accuracy |
| https://munazaphysio.studio/about | Dr. Munaza's card: MSOMPT · DPT · AHPC (`about-02.jpg`) |
| https://munazaphysio.studio/conditions | Checked the condition search ("neck", 9 of 68 results) |
| https://munazaphysio.studio/book | Booking step 1, "What do you need help with?", incl. "Initial Assessment · 60 min" (`book-00.jpg`). Viewed only; nothing was submitted |

The walkthrough path shown in the film (Home → Menu → What We Treat → Neck Pain & Cervical Spine → About → Book an appointment → Initial Assessment) was clicked through on the live site at 390×844 (mobile).

Some neck-page copy is stronger than this film's claims rules (e.g. "relieves the pain… so symptoms stop recurring", "Pain-Free Living"). Those sections are **not** shown in the film.

## Supplied assets

| File | Use |
|------|-----|
| `assets/Doctor_munaza_ghani.png` | Reference for Dr. Munaza's illustrated look (navy hijab, mask, white coat, navy modest clothing, white closed shoes). The illustration is a drawing, not a photo, so no authentic likeness is fabricated. Her real photo appears only inside the genuine website captures |
| `assets/clinic.png` | Reference for the paper-cut clinic set (large grid window, light walls) |
| `assets/site_logo.png` | Logo, used unmodified (aspect ratio preserved) and sampled into the seeded paper-fragment particles |

## Created for this film

| Item | How |
|------|-----|
| Characters, sets, props | Hand-authored SVG paper-cut illustration (`lib/cast.js`, `lib/scenes.js`) |
| Paper grain | Generated procedurally (`tools/paper_texture.py`) |
| Narration | Synthetic female voice, Kokoro v1.0 (`hf_alpha`, Apache-2.0 model), generated offline (`tools/tts.py`). It is **not** Dr. Munaza's voice |
| Music and sound effects | Original, synthesised from scratch in NumPy (`tools/mix.py`); no samples or third-party recordings |
| Typography | Inter (SIL Open Font License), bundled at `assets/fonts/Inter-latin-var.woff2` |
| Animation runtime | HyperFrames 0.8.79 (Apache-2.0) + GSAP 3.12.5 (vendored) |

## References

- **Engineering:** https://github.com/JohnHeibel/PDoomVideo was read. Adopted: every frame is a pure function of time; characters are rigs with pose and mood parameters; blinks instead of snapping between expressions; contact-sheet checks at every shot boundary.
- **Visual (whatships.com):** "P(doom) — a generative three.js music video" (https://whatships.com/videos/pdoom/) and "A history of video games, made in Cursor" (https://whatships.com/videos/history-of-video-games/). **These videos are X embeds that did not load in the build environment, so they were not watched.** Only their titles, descriptions and poster images were seen. No pacing or framing is claimed to be copied from them.
- **21st.dev:** not used. The explanatory overlays are simple enough to build directly, and the website sections use real captures.
