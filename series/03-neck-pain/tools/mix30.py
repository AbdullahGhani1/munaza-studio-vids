"""30 s short: original up-tempo score + punchy SFX, synthesised from scratch (no samples), mixed under the narration.

Usage: python3 tools/mix30.py        -> audio/mix-30.wav
Then:  ffmpeg -y -i audio/mix-30.wav -af loudnorm=I=-14:TP=-1.5:LRA=9 -c:a aac -b:a 192k audio/mix-30.m4a
Shot times are derived from data/narration-timing-30.json exactly as lib/short30.js derives them.
"""
import json, os
import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
DUR = 30.0
N = int(DUR * SR)
rng = np.random.default_rng(3030)

NAR = json.load(open(os.path.join(ROOT, 'data', 'narration-timing-30.json')))['phrases']
by = lambda sid: [p for p in NAR if p['scene'] == sid]
T = {
    'work': by('work')[0]['start'] - 0.12, 'read': by('read')[0]['start'] - 0.12, 'rest': by('rest')[0]['start'] - 0.12,
    'pause': by('pause')[0]['start'] - 0.1, 'fix': by('pause')[1]['start'] - 0.1, 'story': by('story')[0]['start'] - 0.08,
    'listen': by('listen')[0]['start'] - 0.15, 'plan': by('plan')[0]['start'] - 0.15, 'cta': by('cta')[0]['start'] - 0.2,
}
gp = by('listen')[1]; gd = gp['end'] - gp['start']
GOALS = [gp['start'] + gd * k for k in (0.08, 0.42, 0.76)]
CHECK = by('check')[0]['start'] - 0.15

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
def tt(d): return np.arange(int(d * SR)) / SR

def env(n, a, r):
    e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e

def noise(d, lo, hi, amp=1.0):
    """band-limited noise via FFT masking"""
    x = rng.normal(0, 1, int(d * SR))
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    X[(fr < lo) | (fr > hi)] = 0
    y = np.fft.irfft(X, len(x)); return y / (np.max(np.abs(y)) + 1e-9) * amp

def place(buf, sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or i + len(sig) <= 0: return
    if i < 0: sig = sig[-i:]; i = 0
    sig = sig[:N - i] * gain
    buf[i:i + len(sig), 0] += sig * (1 - max(0, pan)); buf[i:i + len(sig), 1] += sig * (1 + min(0, pan))

# ---------- instruments ----------
def kick():
    t = tt(0.32); f = 45 + 85 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * 0.9 + noise(0.32, 2000, 6000, 0.05) * np.exp(-t * 80)
def hat(open_=False):
    d = 0.18 if open_ else 0.05; t = tt(d)
    return noise(d, 7000, 16000, 0.22) * np.exp(-t * (18 if open_ else 70))
def clap():
    out = np.zeros(int(0.25 * SR))
    for k, o in enumerate((0, 0.012, 0.024)):
        s = noise(0.2, 900, 3500, 0.55) * np.exp(-tt(0.2) * (60 if k < 2 else 16)); i = int(o * SR)
        out[i:i + len(s)] += s[:len(out) - i]
    return out
def bass(n, d):
    t = tt(d); f = midi(n)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) + 0.12 * np.sign(np.sin(2 * np.pi * f * t))
    return s * env(len(t), 0.01, 0.08) * np.exp(-t * 1.5) * 0.4
def pluck(n, d=0.5, amp=0.16):
    t = tt(d); f = midi(n)
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(4 * np.pi * f * t) * np.exp(-t * 6) + 0.2 * np.sin(6 * np.pi * f * t) * np.exp(-t * 9)) * np.exp(-t * 5) * amp * env(len(t), 0.003, 0.05)
def pad(notes, d, amp=0.05):
    t = tt(d); s = np.zeros(len(t))
    for n in notes:
        for det in (-0.1, 0.1):
            ff = midi(n) * 2 ** (det / 12); s += np.sin(2 * np.pi * ff * t) + 0.3 * np.sin(4 * np.pi * ff * t)
    return s * env(len(t), min(0.4, d * 0.3), min(0.6, d * 0.4)) * amp / (2 * len(notes)) * 2

# ---------- SFX ----------
def sfx_hit():      # hook impact
    t = tt(1.2); f = 38 + 60 * np.exp(-t * 12)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.2) * 0.9 + noise(1.2, 200, 3000, 0.35) * np.exp(-t * 14)
def sfx_whoosh(d=0.35):
    t = tt(d); e = np.sin(np.pi * t / d) ** 2
    lo = noise(d, 300, 1500, 0.5) * e; hi = noise(d, 2000, 8000, 0.25) * e
    return lo + hi
def sfx_pop():
    t = tt(0.16)
    return np.sin(2 * np.pi * (520 + 500 * np.exp(-t * 45)) * t) * np.exp(-t * 26) * 0.6 + noise(0.16, 2500, 7000, 0.25) * np.exp(-t * 60)
def sfx_click():
    t = tt(0.03)
    return noise(0.03, 1800, 7000, 0.35) * np.exp(-t * 220)
def sfx_riser(d):
    t = tt(d); f = 200 * (8 ** (t / d))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.12
    return (noise(d, 800, 9000, 0.35) * (t / d) ** 2 + tone * (t / d)) * env(len(t), 0.05, 0.03)
def sfx_thud():
    t = tt(0.4)
    return np.sin(2 * np.pi * (70 + 40 * np.exp(-t * 20)) * t) * np.exp(-t * 11) * 0.8 + noise(0.4, 150, 1500, 0.4) * np.exp(-t * 25)
def sfx_scratch():  # record-scratch style stop
    d = 0.42; t = tt(d); f = 900 * np.exp(-t * 6) + 120 * np.sin(2 * np.pi * 7 * t)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3 + noise(d, 1000, 5000, 0.35)) * np.sin(np.pi * t / d) ** 0.5 * np.exp(-t * 3)
def sfx_stamp():
    return sfx_thud() * 0.8 + noise(0.2, 2000, 6000, 0.3) * np.exp(-tt(0.2) * 40)
def sfx_page():
    return sfx_whoosh(0.3) * 0.7 + noise(0.3, 600, 2500, 0.2) * np.exp(-tt(0.3) * 10)
def sfx_pen(d=0.5):
    t = tt(d); am = (np.sin(2 * np.pi * 11 * t) > 0.2).astype(float)
    return noise(d, 2500, 9000, 0.12) * am * env(len(t), 0.02, 0.05)
def sfx_check():
    t = tt(0.3)
    return (np.sin(2 * np.pi * 988 * t) * np.exp(-t * 16) + 0.6 * np.sin(2 * np.pi * 1480 * t) * np.exp(-t * 18) * (t > 0.07)) * 0.3
def sfx_slide(d=0.9):
    t = tt(d); f = 180 + 260 * (t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.1 * np.sin(np.pi * t / d) + sfx_whoosh(d) * 0.4
def sfx_shimmer(d):
    out = np.zeros(int(d * SR))
    for i in range(36):
        s = pluck(rng.choice([79, 81, 84, 88, 91, 93]), 0.6, 0.05); j = int(rng.uniform(0, d - 0.6) * SR)
        out[j:j + len(s)] += s
    return out

# ---------- score ----------
music = np.zeros((N, 2)); fx = np.zeros((N, 2))
beat = 0.6            # 100 BPM
Am, F, C, G, Em = [57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62], [52, 55, 59]

def groove(t0, t1, chords, full=True, drums=True):
    b = 0; t = t0
    while t < t1 - 0.05:
        bar = int(b // 4); ch = chords[bar % len(chords)]; pos = b % 4
        if drums:
            if pos in (0, 2) or (full and pos == 3 and bar % 2): place(music, kick(), t, 0.85)
            if full and pos in (1, 3): place(music, clap(), t, 0.5, 0.1)
            place(music, hat(), t + beat / 2, 0.8, -0.3)
            if full: place(music, hat(), t, 0.5, 0.3)
        place(music, bass(ch[0] - 12, beat * 0.9), t, 0.9)
        if full:
            arp = [ch[0] + 12, ch[2] + 12, ch[1] + 12, ch[2] + 12]
            place(music, pluck(arp[pos], 0.5), t, 1.0, (pos - 1.5) * 0.3)
            place(music, pluck(arp[(pos + 2) % 4] + 12, 0.35, 0.07), t + beat / 2, 1.0, -(pos - 1.5) * 0.3)
        if pos == 0: place(music, pad(ch, min(beat * 4, t1 - t) + 0.3), t, 1.0)
        t += beat; b += 1

groove(0.0, T['pause'], [Am, F, Am, Em], full=False)           # tense, driving
groove(T['pause'], T['fix'], [F, G], full=False)               # build
place(music, sfx_riser(T['fix'] - T['pause']), T['pause'], 0.9)
# the headfake: music drops to a held low pad, then stops dead on the stamp
place(music, pad([45, 52], T['story'] - T['fix'] + 0.2, 0.06), T['fix'])
groove(T['story'], T['cta'], [C, G, Am, F], full=True)         # bright payoff
for k, n in enumerate(C + [60, 67]):
    place(music, pad([n], 3.4, 0.08), T['cta'], 1.0, (k - 2) * 0.2)
    place(music, pluck(n + 12, 2.5, 0.12), T['cta'] + k * 0.07, 1.0)

# ---------- SFX events ----------
place(fx, sfx_hit(), 0.0, 0.9)
t = 0.08
while t < T['work'] + 0.55:                                    # typing
    place(fx, sfx_click(), t, 0.6 + 0.4 * rng.random(), rng.uniform(-0.2, 0.2)); t += rng.uniform(0.07, 0.16)
place(fx, sfx_pop(), 1.55, 0.7)                                # HEAD FORWARD chip
for k in ('work', 'read', 'rest', 'pause', 'story', 'listen', 'plan', 'cta'):
    place(fx, sfx_whoosh(), T[k] - 0.12, 0.8)
place(fx, sfx_pop(), T['work'] + 1.0, 0.9); place(fx, sfx_pop(), T['read'] + 1.0, 0.9); place(fx, sfx_pop(), T['rest'] + 1.2, 0.9)
place(fx, sfx_page(), T['read'] + 0.1, 0.5)
for i in range(3): place(fx, sfx_pop(), T['pause'] + 0.45 + i * 0.3, 0.8, (i - 1) * 0.3)
place(fx, sfx_thud(), T['fix'] + 0.3, 0.9)
place(fx, sfx_scratch(), T['fix'] + 1.2, 0.8)
place(fx, sfx_stamp(), T['fix'] + 1.27, 0.9)
place(fx, sfx_whoosh(0.4), T['fix'] + 1.95, 0.7)
place(fx, sfx_page(), T['story'] + 0.15, 0.8)
for k in range(3): place(fx, sfx_pen(0.45), T['listen'] + 0.5 + k * 0.9, 0.7)
for g in GOALS: place(fx, sfx_check(), g + 0.05, 0.9)
place(fx, sfx_whoosh(0.5), CHECK, 0.5)
place(fx, sfx_slide(0.9), T['plan'] + 0.35, 0.8)
for k, o in enumerate((1.35, 1.7, 2.05)): place(fx, sfx_pop(), T['plan'] + o, 0.7, (k - 1) * 0.3)
place(fx, sfx_shimmer(2.2), T['cta'] + 0.1, 0.9)

def lowpass(x, fc):
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / np.sqrt(1 + (fr / fc) ** 4), len(x))
music = np.stack([lowpass(music[:, 0], 9000), lowpass(music[:, 1], 9000)], 1)

voice, vsr = sf.read(os.path.join(ROOT, 'audio', 'narration-30.wav'))
v = np.interp(np.arange(int(len(voice) * SR / vsr)) / SR, np.arange(len(voice)) / vsr, voice)[:N]
v = np.pad(v, (0, N - len(v)))
duck = np.ones(N)
for p in NAR:
    a, b = int((p['start'] - 0.15) * SR), int((p['end'] + 0.2) * SR)
    duck[max(0, a):b] = 0.42
k = int(0.12 * SR); duck = np.convolve(duck, np.ones(k) / k, 'same')
out = music * duck[:, None] * 0.9 + fx * 0.55 + np.stack([v, v], 1) * 1.7
fi, fo = int(0.02 * SR), int(0.6 * SR)
out[:fi] *= np.linspace(0, 1, fi)[:, None]; out[-fo:] *= np.linspace(1, 0, fo)[:, None]
out = out / np.max(np.abs(out)) * 0.89
path = os.path.join(ROOT, 'audio', 'mix-30.wav')
sf.write(path, out.astype(np.float32), SR)
print('wrote', path, {k: round(v, 2) for k, v in T.items()})
