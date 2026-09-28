import { renameSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STYLES } from './plan.mjs';

const TPL = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates');
const tpl = (f) => readFileSync(join(TPL, f), 'utf8');
const fill = (s, m) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in m ? m[k] : `{{${k}}}`));
const fmt = (n) => { const m = Math.floor(n / 60), s = (n % 60).toFixed(1).padStart(4, '0'); return `${m}:${s}`; };

export function writeFileAtomic(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = path + '.tmp-' + process.pid;
  writeFileSync(tmp, data);
  renameSync(tmp, path);
}

export function shotlistMd(p) {
  const rows = p.scenes.map((s) => `## Scene ${s.order}: ${s.beat} (${fmt(s.startSeconds)}-${fmt(s.endSeconds)})
- **Purpose:** ${s.purpose}
- **Visual:** ${s.visual}
- **Camera:** ${s.camera || '-'}
- **Motion:** ${s.motion}
- **On-screen text:** ${(s.onScreenText || []).join(' / ') || '-'}
- **Voiceover:** ${s.voiceover || '-'}
- **Audio cue:** ${s.audioCue || '-'}
- **Transition:** ${s.transition}
`).join('\n');
  return `# Shot list: ${p.name}\n\nLogline: ${p.logline}\n\n${rows}`;
}

export function styleGuideMd(p) {
  const g = p.styleGuide;
  return `# Style guide: ${p.name}

Style: ${g.label}
Palette: ${g.palette.join(', ')}
Type: ${g.type}
Texture: ${g.texture}
Camera: ${g.camera}

## Take
${g.take.map((x) => '- ' + x).join('\n')}

## Do not take
${g.avoid.map((x) => '- ' + x).join('\n')}
${p.reference ? `\n## Reference\n${p.reference.name} (${p.reference.duration ? p.reference.duration.toFixed(1) + ' s' : 'image'}). Frames in refs/frames/. Study them and refine this guide before writing code.\n` : ''}`;
}

export function promptText(p) {
  return `You are the director, animator, sound designer and render engineer for a ${p.durationSeconds}-second film made in code.
Read CLAUDE.md, project.json, docs/style_guide.md and docs/shotlist.md first. The plan is approved; do not re-plan it.

Film in one line: ${p.logline}
Format: ${p.outputWidth}x${p.outputHeight}, ${p.fps} fps, seed ${p.seed}. Framework: ${p.framework || 'single HTML + window.seek(t)'}.

Workflow, with gates:
1. Build stills for every shot and a contact sheet. Critique it at phone size.
2. Replace the scaffold animatic in index.html with the real renderer (src/), keeping window.seek(t) deterministic. Render out/animatic.mp4 at low resolution:  node render.mjs --scale 0.5 --out out/animatic.mp4
3. ${p.audio ? 'Measure audio/beats.json is present; snap state changes to beats and reveals to downbeats.' : 'Audio is optional; add a synthesized score only if enabled.'}
4. Critique loop (at least 3 rounds): render contact.png, strip.png, phone.png, score 1-10 on hook, phone readability, motion, variety, composition, style match, sound sync. Log in docs/review_log.md. Fix the 3 worst problems. Repeat until all are 8+.
5. Final render: node render.mjs --out out/final.mp4, then poster.png and README.md.

Originality: ${p.reference ? 'the reference in refs/ lends grammar only; never copy its story, logos, characters or claims.' : 'no reference supplied.'}
Do not print API keys. Ask before spending money.`;
}

export function scaffold(dir, p) {
  const S = STYLES[p.style] || STYLES.custom;
  const map = {
    name: p.name, width: p.outputWidth, height: p.outputHeight, fps: p.fps, duration: p.durationSeconds,
    styleLabel: p.styleGuide.label, palette: p.styleGuide.palette.join(' / '), type: p.styleGuide.type, texture: p.styleGuide.texture,
  };
  for (const d of ['docs', 'assets', 'audio/vo', 'audio/sfx', 'refs/frames', 'src', 'out']) mkdirSync(join(dir, d), { recursive: true });
  const put = (rel, data) => writeFileSync(join(dir, rel), data);
  put('CLAUDE.md', fill(tpl('CLAUDE.md'), map));
  put('index.html', fill(tpl('index.html'), map));
  put('render.mjs', tpl('render.mjs'));
  put('data.js', 'window.PROJECT = ' + JSON.stringify({
    name: p.name, outputWidth: p.outputWidth, outputHeight: p.outputHeight, durationSeconds: p.durationSeconds,
    fps: p.fps, seed: p.seed, palette: { bg: S.palette.bg, fg: S.palette.fg, accent: S.palette.accent },
    scenes: p.scenes.map((s) => ({ order: s.order, beat: s.beat, purpose: s.purpose, onScreenText: s.onScreenText, startSeconds: s.startSeconds, endSeconds: s.endSeconds })),
  }, null, 1) + ';\n');
  put('docs/shotlist.md', shotlistMd(p));
  put('docs/style_guide.md', styleGuideMd(p));
  if (!existsSync(join(dir, 'docs/review_log.md'))) put('docs/review_log.md', `# Review log: ${p.name}\n\nScore hook, phone readability, motion, variety, composition, style match, sound sync (1-10). List the 3 worst problems with timestamps. Repeat until all are 8+ for three rounds.\n`);
  if (!existsSync(join(dir, 'docs/audio_plan.md'))) put('docs/audio_plan.md', `# Audio plan: ${p.name}\n\nTrack: ${p.audio ? p.audio.name : 'none yet'}\nBPM: ${p.audio && p.audio.bpm ? p.audio.bpm : 'unmeasured'}\nTarget loudness: -14 LUFS. Voiceover: one file per scene in audio/vo/, never time-stretched.\n`);
  put('package.json', JSON.stringify({ name: p.id, private: true, type: 'module', scripts: { animatic: 'node render.mjs --scale 0.5 --out out/animatic.mp4', render: 'node render.mjs --out out/final.mp4' }, devDependencies: { playwright: '^1.49.0' } }, null, 2) + '\n');
  put('README.md', `# ${p.name}\n\n${p.logline}\n\n\`\`\`bash\nnpm install && npx playwright install chromium\nnpm run animatic   # low-res preview\nnpm run render     # final MP4\n\`\`\`\n\nRequires Node 22+, ffmpeg and Chromium (via Playwright). Open \`index.html\` in a browser to preview the scaffold live.\n`);
  put('CLAUDE-PROMPT.md', promptText(p) + '\n');
}

export function tree(dir, rel = '', depth = 0) {
  const out = [];
  if (depth > 4) return out;
  for (const name of readdirSync(join(dir, rel)).sort()) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const r = rel ? rel + '/' + name : name;
    const st = statSync(join(dir, r));
    if (st.isDirectory()) out.push({ path: r, type: 'dir', children: tree(dir, r, depth + 1) });
    else out.push({ path: r, type: 'file', size: st.size });
  }
  return out;
}
