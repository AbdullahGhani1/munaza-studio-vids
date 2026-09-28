"""Original score + sound effects, synthesised from scratch (no samples, no licences needed), mixed with the narration.

Usage:
  python3 tools/mix.py main   -> audio/mix-177.wav (narration + music + sfx)
  python3 tools/mix.py short  -> audio/mix-20.wav  (music + sfx, no narration)
Then encode: ffmpeg -i audio/mix-177.wav -c:a aac -b:a 192k audio/mix-177.m4a
"""
import json, os, sys
import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
rng = np.random.default_rng(2026)
MODE = sys.argv[1] if len(sys.argv) > 1 else 'main'
DUR = 177.0 if MODE == 'main' else 20.0
N = int(DUR * SR)

def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)

def env_adsr(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e

def pad_note(f, dur, amp):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.zeros(n)
    for det in (-0.12, 0.0, 0.13):           # gently detuned voices
        ff = f * 2 ** (det / 12)
        s += np.sin(2 * np.pi * ff * t) + 0.35 * np.sin(4 * np.pi * ff * t) + 0.12 * np.sin(6 * np.pi * ff * t)
    s *= env_adsr(n, min(1.2, dur * 0.4), min(1.6, dur * 0.5)) * amp / 3
    return s

def piano_note(f, dur, amp):
    n = int(dur * SR); t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * f * t) + 0.45 * np.sin(4 * np.pi * f * t) * np.exp(-t * 3) + 0.2 * np.sin(6 * np.pi * f * t) * np.exp(-t * 5))
    s *= np.exp(-t * 2.2) * amp
    s[:int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    return s

def place(buf, sig, t0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    sig = sig[:N - i]
    buf[i:i + len(sig), 0] += sig * (1 - max(0, pan))
    buf[i:i + len(sig), 1] += sig * (1 + min(0, pan))

def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x); acc = 0.0
    # vectorised one-pole via lfilter-equivalent recursion in chunks
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y

def noise_burst(dur, fc, amp, decay):
    n = int(dur * SR); t = np.arange(n) / SR
    x = rng.normal(0, 1, n)
    # crude band shaping: difference of two moving averages
    k1, k2 = max(1, int(SR / fc / 2)), max(2, int(SR / fc * 2))
    hi = np.convolve(x, np.ones(k1) / k1, 'same') - np.convolve(x, np.ones(k2) / k2, 'same')
    return hi * np.exp(-t * decay) * amp

# ---------------- SFX ----------------
def sfx_tab():      # red pause tab: paper flick + soft tonal pop
    n = int(0.18 * SR); t = np.arange(n) / SR
    pop = np.sin(2 * np.pi * (660 + 300 * np.exp(-t * 40)) * t) * np.exp(-t * 28) * 0.55
    return pop + noise_burst(0.18, 3500, 0.35, 45)
def sfx_swish(dur=0.55):   # paper slide
    n = int(dur * SR); t = np.arange(n) / SR
    e = np.sin(np.pi * t / dur) ** 2
    return noise_burst(dur, 1800, 0.5, 0) * e
def sfx_snap():     # card landing
    return noise_burst(0.12, 2600, 0.6, 60) + np.sin(2 * np.pi * 180 * np.arange(int(0.12 * SR)) / SR) * np.exp(-np.arange(int(0.12 * SR)) / SR * 40) * 0.4
def sfx_tap():      # screen tap
    n = int(0.08 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 1400 * t) * np.exp(-t * 90) * 0.4 + noise_burst(0.08, 5000, 0.15, 80)
def sfx_check():
    n = int(0.25 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 880 * t) * np.exp(-t * 18) + 0.6 * np.sin(2 * np.pi * 1320 * t) * np.exp(-t * 22) * (t > 0.06)) * 0.35
def sfx_page():
    return sfx_swish(0.35) * 0.8 + noise_burst(0.35, 900, 0.25, 12)
def sfx_shimmer(dur):
    out = np.zeros(int(dur * SR))
    for i in range(40):
        f = midi(rng.choice([76, 79, 81, 84, 88, 91]))
        s = piano_note(f, 0.6, 0.05)
        j = int(rng.uniform(0, dur - 0.6) * SR)
        out[j:j + len(s)] += s
    return out

# ---------------- score ----------------
buf = np.zeros((N, 2))
def chord_prog(t0, t1, chords, beat, pad_amp, pno_amp, arp=True):
    t = t0; i = 0
    while t < t1 - 0.1:
        ch = chords[i % len(chords)]
        d = min(beat * 4, t1 - t)
        for k, nn in enumerate(ch):
            place(buf, pad_note(midi(nn), d + 0.8, pad_amp), t, pan=(k - 1) * 0.3)
        if arp and pno_amp > 0:
            pat = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12]
            for b in range(4):
                if t + b * beat < t1 - 0.2:
                    place(buf, piano_note(midi(pat[b]), 1.6, pno_amp * (1.0 if b == 0 else 0.7)), t + b * beat, pan=(b - 1.5) * 0.25)
        t += d; i += 1

Am, F, C, G, Dm, Em = [57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62], [50, 53, 57], [52, 55, 59]
beat = 60 / 72
if MODE == 'main':
    chord_prog(0.0, 23.0, [Am, F, Am, Em], beat, 0.05, 0.0, arp=False)            # dark, sparse
    chord_prog(23.0, 38.2, [Am, F, C, G], beat, 0.055, 0.035)                     # stakes, gentle piano
    chord_prog(38.2, 44.0, [Dm, Am], beat, 0.04, 0.0, arp=False)                   # headfake: held breath
    chord_prog(44.0, 98.3, [C, G, Am, F], beat, 0.05, 0.04)                       # light, care
    chord_prog(98.3, 143.3, [F, C, G, Am], beat, 0.05, 0.045)                     # plan + practice
    chord_prog(143.3, 162.3, [C, F, G, C], beat, 0.045, 0.04)                     # website
    chord_prog(162.3, 171.0, [F, G, Am, F], beat, 0.055, 0.045)                   # resolution
    for k, nn in enumerate(C + [60, 67]):                                          # final chord rings out
        place(buf, pad_note(midi(nn), 6.0, 0.06), 171.0, pan=(k - 2) * 0.2)
        place(buf, piano_note(midi(nn + 12), 5.5, 0.05), 171.0 + k * 0.08)
    ev = {
        'tab': [3.4, 9.8, 13.8, 17.1],
        'swish': [8.0, 23.0, 38.2, 53.2, 73.2, 98.3, 108.1, 112.9, 117.5, 123.3, 132.6, 139.2, 143.3, 162.3, 166.9],
        'snap': [30.5, 30.9, 31.3, 31.7, 38.5, 74.0, 83.3, 95.3, 117.6, 117.9, 118.2],
        'page': [44.0, 44.6, 128.9, 130.3],
        'check': [48.5, 49.8, 51.0, 87.9, 92.6, 93.5, 113.1],
        'tap': [146.4, 151.9, 157.2],
        'shimmer': [(167.1, 4.4)],
    }
else:
    chord_prog(0.0, 7.0, [Am, F], beat, 0.05, 0.0, arp=False)
    chord_prog(7.0, 16.0, [C, G, F], beat, 0.05, 0.045)
    for k, nn in enumerate(C + [60, 67]):
        place(buf, pad_note(midi(nn), 4.2, 0.06), 16.0, pan=(k - 2) * 0.2)
        place(buf, piano_note(midi(nn + 12), 4.0, 0.05), 16.0 + k * 0.08)
    ev = {'tab': [2.0, 4.6, 5.7, 6.8], 'swish': [3.0, 7.0, 9.6, 12.0, 14.2, 16.0], 'snap': [16.2], 'page': [14.3], 'check': [], 'tap': [], 'shimmer': [(16.0, 1.2)]}

# light low-pass on the music bed for warmth (vectorised via FFT)
def fft_lowpass(x, fc):
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (fr / fc) ** 4)
    return np.fft.irfft(X, len(x))
music = np.stack([fft_lowpass(buf[:, 0], 5000), fft_lowpass(buf[:, 1], 5000)], 1)

fx = np.zeros((N, 2))
S = {'tab': sfx_tab, 'swish': sfx_swish, 'snap': sfx_snap, 'page': sfx_page, 'check': sfx_check, 'tap': sfx_tap}
for name, times in ev.items():
    for tt in times:
        if name == 'shimmer':
            s = sfx_shimmer(tt[1]); i = int(tt[0] * SR); fx[i:i + len(s), 0] += s; fx[i:i + len(s), 1] += s
        else:
            s = S[name](); i = int(tt * SR); s = s[:N - i]
            fx[i:i + len(s), 0] += s * 0.9; fx[i:i + len(s), 1] += s * 0.9

out = music * 1.0 + fx * 0.55
if MODE == 'main':
    voice, vsr = sf.read(os.path.join(ROOT, 'audio', 'narration.wav'))
    tv = np.arange(int(len(voice) * SR / vsr)) / SR
    voice48 = np.interp(tv, np.arange(len(voice)) / vsr, voice)[:N]
    voice48 = np.pad(voice48, (0, N - len(voice48)))
    # duck the music under the voice (from the phrase timing, with smooth ramps)
    duck = np.ones(N)
    for p in json.load(open(os.path.join(ROOT, 'data', 'narration-timing.json')))['phrases']:
        a, b = int((p['start'] - 0.25) * SR), int((p['end'] + 0.35) * SR)
        duck[max(0, a):b] = 0.45
    k = int(0.25 * SR); duck = np.convolve(duck, np.ones(k) / k, 'same')
    out = music * duck[:, None] + fx * 0.5 + np.stack([voice48, voice48], 1) * 1.6
# fades
fade_in, fade_out = int(0.3 * SR), int(1.2 * SR)
out[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
out[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]
peak = np.max(np.abs(out)); out = out / peak * 0.89
path = os.path.join(ROOT, 'audio', f"mix-{'177' if MODE == 'main' else '20'}.wav")
sf.write(path, out.astype(np.float32), SR)
print('wrote', path, f'{DUR}s peak-normalised')
