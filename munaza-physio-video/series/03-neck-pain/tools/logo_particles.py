"""Sample the supplied logo into seeded paper-fragment targets (data/logo-particles.js)."""
import subprocess, json, sys, numpy as np
src, out, W = sys.argv[1], sys.argv[2], 560  # target logo width in px (on the 1080 frame)
w0, h0 = [int(v) for v in subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src]).decode().strip().split(',')]
H = round(W * h0 / w0)
raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', src, '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'])
a = np.frombuffer(raw, np.uint8).reshape(H, W, 4)
rng = np.random.default_rng(177)
pts = []
step = 7
for y in range(0, H, step):
    for x in range(0, W, step):
        r, g, b, al = a[y, x]
        if al > 150:
            pts.append([x, y, '#%02x%02x%02x' % (r, g, b), round(float(rng.uniform(0, 1)), 3), round(float(rng.uniform(0, 1)), 3), round(float(rng.uniform(0, 1)), 3)])
open(out, 'w').write('window.LOGO_PARTICLES = ' + json.dumps({'w': W, 'h': H, 'step': step, 'pts': pts}) + ';\n')
print(len(pts), 'particles', W, H)
