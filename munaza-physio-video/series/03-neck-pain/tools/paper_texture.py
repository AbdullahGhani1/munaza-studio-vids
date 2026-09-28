"""Generate a seamless-ish paper grain texture (neutral grey, for soft-light blending)."""
import numpy as np, subprocess, sys
W, H = 1080, 1920
rng = np.random.default_rng(20260928)
def blur(a, k):
    for ax in (0, 1):
        c = np.cumsum(np.pad(a, [(k, k) if i == ax else (0, 0) for i in range(2)], mode='wrap'), axis=ax)
        a = (np.take(c, range(2 * k, c.shape[ax]), axis=ax) - np.take(c, range(0, c.shape[ax] - 2 * k), axis=ax)) / (2 * k)
    return a
fine = rng.normal(0, 1, (H, W))
mid = blur(rng.normal(0, 1, (H, W)), 3) * 2.2
low = blur(rng.normal(0, 1, (H, W)), 24) * 6
tex = fine * 0.35 + mid * 0.5 + low * 0.9
# fibres: short random strokes
for _ in range(2600):
    x, y = rng.integers(0, W), rng.integers(0, H)
    ang, ln = rng.uniform(0, np.pi), rng.integers(8, 40)
    xs = (x + np.cos(ang) * np.arange(ln)).astype(int) % W
    ys = (y + np.sin(ang) * np.arange(ln)).astype(int) % H
    tex[ys, xs] += rng.choice([-1, 1]) * rng.uniform(0.6, 1.4)
tex = (tex - tex.mean()) / tex.std()
img = np.clip(128 + tex * 9, 0, 255).astype(np.uint8)
out = sys.argv[1]
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', f'{W}x{H}', '-i', '-', out], input=img.tobytes(), check=True)
print('wrote', out)
