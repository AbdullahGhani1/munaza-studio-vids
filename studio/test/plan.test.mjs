import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBrief, generatePlan, validateScenes, rebalance, slugify } from '../lib/plan.mjs';

const brief = { topic: 'How a heat pump moves heat, for homeowners deciding whether to switch.', style: 'collage', durationSeconds: 30, size: '9:16', fps: 30 };

test('valid brief resolves size and passes', () => {
  const { errors, value } = validateBrief(brief);
  assert.deepEqual(errors, {});
  assert.equal(value.outputWidth, 1080); assert.equal(value.outputHeight, 1920);
});
test('invalid brief reports each field with the contract copy', () => {
  const { errors } = validateBrief({ topic: 'x', style: '', durationSeconds: 3, size: 'custom', width: 1001, height: 100, fps: 30 });
  assert.equal(errors.topic, 'Add a sentence about what the video is for.');
  assert.equal(errors.style, 'Choose a style or describe your own.');
  assert.equal(errors.durationSeconds, 'Enter a length between 5 and 180 seconds.');
  assert.equal(errors.size, 'Width and height must be even numbers from 240 to 4096.');
});
test('custom style needs 3 to 120 characters', () => {
  assert.ok(validateBrief({ ...brief, style: 'custom', customStyle: 'ab' }).errors.style);
  assert.deepEqual(validateBrief({ ...brief, style: 'custom', customStyle: 'hand-inked, warm' }).errors, {});
});
test('project names are folder safe', () => {
  assert.ok(validateBrief({ ...brief, name: '../evil' }).errors.name);
  assert.equal(slugify('  Heat Pump: 101! '), 'heat-pump-101');
});

for (const D of [5, 10, 15, 30, 45, 60, 90, 180]) {
  test(`generated plan for ${D}s is contiguous and sums to the runtime`, () => {
    const { value } = validateBrief({ ...brief, durationSeconds: D });
    const plan = generatePlan({ ...value, hasReference: false });
    assert.equal(plan.scenes[0].startSeconds, 0);
    assert.equal(plan.scenes.at(-1).endSeconds, D);
    assert.deepEqual(validateScenes(plan.scenes, D, 30), []);
    assert.equal(plan.scenes[0].beat, 'Hook');
    assert.ok(plan.scenes[0].endSeconds <= 2.5 + 1e-9, 'hook is short');
  });
}
test('validateScenes flags overlap, gap and wrong total', () => {
  const mk = (a, b) => ({ startSeconds: a, endSeconds: b, purpose: 'p', visual: 'v', transition: 't', onScreenText: [] });
  assert.match(validateScenes([mk(0, 5), mk(4, 10)], 10, 30)[0], /overlaps/);
  assert.match(validateScenes([mk(0, 4), mk(5, 10)], 10, 30)[0], /gap/);
  assert.match(validateScenes([mk(0, 4), mk(4, 9)], 10, 30).join(' '), /add up to 9 s\. Target is 10 s/);
  assert.match(validateScenes([{ ...mk(0, 10), onScreenText: ['x'.repeat(41)] }], 10, 30)[0], /40 characters/);
});
test('rebalance restores the total and keeps order', () => {
  const mk = (a, b, n) => ({ id: n, startSeconds: a, endSeconds: b, purpose: 'p', visual: 'v', transition: 't', onScreenText: [] });
  const out = rebalance([mk(0, 3, 'a'), mk(3, 4, 'b'), mk(4, 5, 'c')], 30);
  assert.equal(out.at(-1).endSeconds, 30);
  assert.deepEqual(validateScenes(out, 30, 30), []);
  assert.deepEqual(out.map((s) => s.id), ['a', 'b', 'c']);
});
test('plan generation is deterministic', () => {
  const { value } = validateBrief(brief);
  assert.deepEqual(generatePlan({ ...value }), generatePlan({ ...value }));
});
