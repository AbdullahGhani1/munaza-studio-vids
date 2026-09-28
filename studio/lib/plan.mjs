// Brief validation and deterministic plan generation (no network, no model calls).
// The generated plan is a scaffold the user edits; Claude Code refines it during the build.

export const STYLES = {
  cinematic: { label: 'Cinematic', palette: { bg: '#0E0E10', fg: '#F2EFE8', accent: '#D97757' }, type: 'Archivo 700 display, Inter 400 body', texture: 'fine film grain, soft vignette', camera: 'slow push-ins, rack focus' },
  editorial: { label: 'Editorial', palette: { bg: '#F0EEE6', fg: '#141413', accent: '#D97757' }, type: 'Serif display, Inter body', texture: 'paper grain', camera: 'locked frames, cuts on beat' },
  minimalist: { label: 'Minimalist', palette: { bg: '#FAFAF7', fg: '#1A1A18', accent: '#3FB68B' }, type: 'Inter 600 only', texture: 'none', camera: 'static, motion by scale and opacity' },
  kinetic: { label: 'Kinetic typography', palette: { bg: '#141413', fg: '#F0EEE6', accent: '#F0A93B' }, type: 'Archivo 800 huge, tight tracking', texture: 'none', camera: 'type is the camera' },
  illustration: { label: '2D illustration', palette: { bg: '#F5EBDD', fg: '#2B2622', accent: '#D97757' }, type: 'Rounded sans labels', texture: 'flat shapes, light grain', camera: 'parallax layers' },
  '3d': { label: '3D', palette: { bg: '#101216', fg: '#E8ECF2', accent: '#6C9BEF' }, type: 'Inter 600', texture: 'soft shadows, depth blur', camera: 'orbit and dolly' },
  collage: { label: 'Paper / collage', palette: { bg: '#EFE6D6', fg: '#2A2521', accent: '#D97757' }, type: 'Hand-cut caps + Caveat notes', texture: 'paper grain, torn edges, stop-motion boil', camera: 'flat table-top, slight parallax' },
  retro: { label: 'Retro / analog', palette: { bg: '#1B1712', fg: '#F1E3C2', accent: '#E0663B' }, type: 'Mono + slab', texture: 'scanlines, tape noise', camera: 'CRT shake on transitions' },
  'product-ui': { label: 'Product UI motion', palette: { bg: '#F0EEE6', fg: '#141413', accent: '#D97757' }, type: 'Inter 600, tabular numerals', texture: 'none', camera: 'one container morphs; a cursor drives changes' },
  reference: { label: 'From reference', palette: { bg: '#141413', fg: '#F0EEE6', accent: '#D97757' }, type: 'Derived from reference frames', texture: 'Derived from reference frames', camera: 'Derived from reference frames' },
  custom: { label: 'Custom', palette: { bg: '#141413', fg: '#F0EEE6', accent: '#D97757' }, type: 'As described', texture: 'As described', camera: 'As described' },
};

export const SIZES = {
  '9:16': [1080, 1920],
  '1:1': [1080, 1080],
  '16:9': [1920, 1080],
  '4:5': [1080, 1350],
};

export const STATUSES = ['Draft', 'Planning', 'Building', 'Preview ready', 'Rendering', 'Complete', 'Needs attention'];

export function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 60).replace(/^-|-$/g, '');
}

export function validateBrief(b) {
  const errors = {};
  const topic = String(b.topic || '').trim();
  if (topic.length < 10 || topic.length > 600) errors.topic = 'Add a sentence about what the video is for.';
  const style = String(b.style || '');
  if (!style || (!STYLES[style])) errors.style = 'Choose a style or describe your own.';
  if (style === 'custom') {
    const c = String(b.customStyle || '').trim();
    if (c.length < 3 || c.length > 120) errors.style = 'Choose a style or describe your own.';
  }
  const dur = Number(b.durationSeconds);
  if (!Number.isInteger(dur) || dur < 5 || dur > 180) errors.durationSeconds = 'Enter a length between 5 and 180 seconds.';
  let w, h;
  if (b.size === 'custom') { w = Number(b.width); h = Number(b.height); } else if (SIZES[b.size]) { [w, h] = SIZES[b.size]; }
  const okDim = (n) => Number.isInteger(n) && n >= 240 && n <= 4096 && n % 2 === 0;
  if (!okDim(w) || !okDim(h)) errors.size = 'Width and height must be even numbers from 240 to 4096.';
  const fps = Number(b.fps || 30);
  if (![24, 30, 60].includes(fps)) errors.fps = 'Choose 24, 30 or 60 fps.';
  const name = String(b.name || '').trim();
  if (name && (name.length > 60 || !/^[\w -]+$/.test(name))) errors.name = 'Use letters, digits, spaces, hyphens or underscores (60 max).';
  return { errors, value: { topic, style, customStyle: String(b.customStyle || '').trim(), durationSeconds: dur, outputWidth: w, outputHeight: h, fps, name } };
}

const r1 = (n) => Math.round(n * 10) / 10;

function shortTopic(topic) {
  const first = topic.split(/[.!?\n]/)[0].trim();
  return first.length > 60 ? first.slice(0, 57).trimEnd() + '…' : first;
}

// Extended beat vocabulary from the blueprint's storyboard (Hook, World, Question, Mechanism, Discovery, Payoff, Loop).
const BEATS = ['Hook', 'World', 'Question', 'Mechanism', 'Detail', 'Discovery', 'Detail', 'Payoff', 'Recap', 'Loop'];

function beatsFor(n) {
  if (n <= 1) return ['Hook'];
  const out = [];
  for (let i = 0; i < n; i++) {
    if (n <= BEATS.length) out.push(BEATS[Math.round((i * (BEATS.length - 1)) / (n - 1))]);
    else out.push(i === 0 ? 'Hook' : i === n - 1 ? 'Loop' : i === n - 2 ? 'Payoff' : BEATS[1 + ((i - 1) % 6)]);
  }
  return out;
}

function sceneFor(beat, t, style, i, n) {
  const S = STYLES[style.key];
  const T = {
    Hook: ['Stop the scroll: show the core problem or the most striking image in the first 2 seconds.', `One striking image of "${t}", huge type, no logo, no title card.`, 'Fast push-in on the subject; type snaps in on the first beat.', 'Hard cut allowed here: it is the first frame.'],
    World: ['Establish the visual rules and who this is for.', `The world of "${t}": three or four recurring shapes, ${S.palette.accent} accent only.`, 'Objects assemble piece by piece; secondary motion settles.', 'The last object grows into the next scene.'],
    Question: ['Pose the one question the viewer should want answered.', `A single question about "${t}" set large on screen.`, 'Type enters after the container starts to move; nothing else competes.', 'The question mark becomes the next scene’s focal point.'],
    Mechanism: ['Explain cause and effect: how it works.', `Diagram or demonstration of the mechanism behind "${t}", one idea per beat.`, 'Primary action on the beat; a cursor or object drives each change.', 'The moving part carries into the next scene.'],
    Detail: ['Add one supporting detail that advances the same idea.', `A close view of one detail of "${t}".`, 'Camera moves 4–8 % over the shot; one new visual event.', 'Match cut on shape or motion direction.'],
    Discovery: ['Show the experiment or reveal that makes the idea click.', `The reveal for "${t}": the key object transforms into its explained form.`, 'Anticipation, then a hero move on a downbeat.', 'The transformed object becomes the payoff.'],
    Payoff: ['State the takeaway in one sentence.', `The takeaway for "${t}" in six words or fewer.`, 'Settle: everything eases to rest, then one accent flash.', 'Elements fold into the closing frame.'],
    Recap: ['Reinforce the takeaway with a fast recap.', 'Quick strip of earlier visuals, resolved.', 'Rapid but readable; one event every 1–2 seconds.', 'Compress into the final frame.'],
    Loop: ['Close the loop: end where the film started.', 'The last frame matches the first frame, position and velocity included.', 'Reverse the opening move in a calmer register.', 'Loop back to the first frame.'],
  };
  const [purpose, visual, motion, transition] = T[beat];
  return {
    id: `s${i + 1}`,
    order: i + 1,
    beat,
    purpose,
    visual,
    camera: S.camera,
    motion,
    onScreenText: beat === 'Hook' ? [shortTopic(t).toUpperCase().slice(0, 40)] : beat === 'Question' ? ['Why does this matter?'] : beat === 'Payoff' ? ['Remember this.'] : [],
    voiceover: '',
    audioCue: beat === 'Hook' ? 'Hit on the first beat' : beat === 'Discovery' ? 'Riser into a downbeat hit' : 'Tactile click on each new event',
    transition: i === n - 1 ? 'Loop to first frame' : transition,
    reviewNotes: '',
  };
}

export function generatePlan(p) {
  const key = p.style;
  const S = STYLES[key];
  const D = p.durationSeconds;
  const n = Math.max(2, Math.min(16, Math.round(D / 4.5)));
  const beats = beatsFor(n);
  const hookLen = D >= 15 ? 2.5 : 2;
  const rest = (D - hookLen) / (n - 1);
  const t = shortTopic(p.topic);
  const scenes = [];
  let cursor = 0;
  for (let i = 0; i < n; i++) {
    const len = i === 0 ? hookLen : rest;
    const start = r1(cursor);
    const end = i === n - 1 ? D : r1(cursor + len);
    cursor += len;
    const sc = sceneFor(beats[i], t, { key }, i, n);
    sc.startSeconds = start;
    sc.endSeconds = end;
    scenes.push(sc);
  }
  const styleLabel = key === 'custom' ? p.customStyle : S.label;
  return {
    logline: `In ${D} seconds, show one clear idea about ${t.replace(/[.!]+$/, '')}, and leave the viewer able to say it back.`,
    styleGuide: {
      label: styleLabel,
      palette: [S.palette.bg, S.palette.fg, S.palette.accent],
      type: S.type,
      texture: S.texture,
      camera: S.camera,
      take: p.hasReference
        ? ['Pacing: shot lengths and cut rhythm', 'Palette and contrast level', 'Type weight and scale relationships', 'Camera language and transition grammar', 'Texture and grain treatment']
        : ['Palette and type from the chosen style', 'A new visual event every 2–4 seconds', 'Physical transitions between scenes'],
      avoid: ['The reference’s story, script or claims', 'Logos, watermarks and branded artwork', 'Characters and distinctive illustrations', 'The exact shot sequence or composition'],
    },
    scenes,
  };
}

export function validateScenes(scenes, duration, fps) {
  const errors = [];
  if (!Array.isArray(scenes) || scenes.length < 1) return ['Add at least one scene.'];
  const frame = 1 / fps;
  let prevEnd = 0;
  scenes.forEach((s, i) => {
    const a = Number(s.startSeconds), b = Number(s.endSeconds);
    if (!(b > a)) errors.push(`Scene ${i + 1}: end must be after start.`);
    if (Math.abs(a - prevEnd) > frame + 1e-6) errors.push(a < prevEnd ? `Scene ${i + 1}: this scene overlaps the previous one.` : `Scene ${i + 1}: there is a gap before this scene.`);
    if (!String(s.purpose || '').trim()) errors.push(`Scene ${i + 1}: add a purpose.`);
    if (!String(s.visual || '').trim()) errors.push(`Scene ${i + 1}: add a visual description.`);
    if (!String(s.transition || '').trim()) errors.push(`Scene ${i + 1}: add a transition.`);
    if ((s.onScreenText || []).length > 3) errors.push(`Scene ${i + 1}: at most 3 on-screen text items.`);
    (s.onScreenText || []).forEach((x) => { if (String(x).length > 40) errors.push(`Scene ${i + 1}: on-screen text is over 40 characters.`); });
    prevEnd = b;
  });
  if (Math.abs(prevEnd - duration) > frame + 1e-6) errors.push(`Scenes add up to ${r1(prevEnd)} s. Target is ${duration} s.`);
  return errors;
}

export function rebalance(scenes, duration) {
  const total = scenes.reduce((a, s) => a + Math.max(0.1, s.endSeconds - s.startSeconds), 0);
  let cursor = 0;
  return scenes.map((s, i) => {
    const len = (Math.max(0.1, s.endSeconds - s.startSeconds) / total) * duration;
    const start = r1(cursor);
    cursor += len;
    const end = i === scenes.length - 1 ? duration : r1(cursor);
    return { ...s, order: i + 1, startSeconds: start, endSeconds: end };
  });
}
