"""Synthesise the narration phrase by phrase with Kokoro (offline) and lay it out on the film's timeline.

Usage:
  python3 tools/tts.py <kokoro-v1.0.onnx> <voices-v1.0.bin>                           # 177 s film
  python3 tools/tts.py <kokoro-v1.0.onnx> <voices-v1.0.bin> data/narration-30.json    # 30 s short
Writes data/narration-timing[-30].json/.js and audio/narration[-30].wav (24 kHz mono).
"""
import json, sys, os
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SR = 24000

spec_path = sys.argv[3] if len(sys.argv) > 3 else os.path.join(ROOT, 'data', 'narration.json')
if not os.path.exists(spec_path):
    spec_path = os.path.join(ROOT, spec_path)
spec = json.load(open(spec_path))
DUR = spec.get('duration', 177.0)
suffix = f"-{spec['out']}" if spec.get('out') else ''
js_var = 'NARRATION' + (spec['out'] if spec.get('out') else '')
speeds = spec.get('speeds', [0.9, 0.94, 0.98, 1.02, 1.06])
k = Kokoro(sys.argv[1], sys.argv[2])

def synth(text, speed):
    a, sr = k.create(text, voice=spec['voice'], speed=speed, lang='en-us')
    assert sr == SR
    # trim leading/trailing silence so caption timings match the voice
    env = np.abs(a) > 0.01
    idx = np.nonzero(env)[0]
    a = a[max(0, idx[0] - int(0.03 * SR)): idx[-1] + int(0.06 * SR)]
    return a.astype(np.float32)

track = np.zeros(int(DUR * SR), dtype=np.float32)
timing = []
for sc in spec['scenes']:
    window = sc['end'] - sc['start']
    for speed in speeds:
        clips = [synth(p.get('say', p['text']), speed) for p in sc['phrases']]
        gaps = [p.get('gapAfter', 0.35) for p in sc['phrases']]
        total = sum(len(c) / SR for c in clips) + sum(gaps[:-1])
        if total <= window:
            break
    else:
        raise SystemExit(f"{sc['id']}: narration {total:.2f}s does not fit {window:.2f}s window")
    t = sc['start']
    for p, c, g in zip(sc['phrases'], clips, gaps):
        s = int(round(t * SR))
        track[s:s + len(c)] += c
        timing.append({'scene': sc['id'], 'text': p['text'], 'start': round(t, 3), 'end': round(t + len(c) / SR, 3)})
        t += len(c) / SR + g
    print(f"{sc['id']}: speed {speed}, {total:.2f}s of {window:.2f}s")

words = sum(len(p['text'].split()) for sc in spec['scenes'] for p in sc['phrases'])
voiced = sum(x['end'] - x['start'] for x in timing)
json.dump({'voice': spec['voice'], 'words': words, 'voiced_seconds': round(voiced, 2), 'phrases': timing},
          open(os.path.join(ROOT, 'data', f'narration-timing{suffix}.json'), 'w'), indent=1)
with open(os.path.join(ROOT, 'data', f'narration-timing{suffix}.js'), 'w') as f:
    f.write(f'window.{js_var} = ' + json.dumps(timing) + ';\n')
sf.write(os.path.join(ROOT, 'audio', f'narration{suffix}.wav'), np.clip(track, -1, 1), SR)
print(f'{words} words, {voiced:.1f}s voiced')
