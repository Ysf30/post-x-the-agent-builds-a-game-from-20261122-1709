// Renders real gameplay of Star Catcher to raw RGB24 video on stdout.
// The SAME game-logic.js the browser game runs is stepped here with an
// auto-player (the basket chases the lowest falling star), so every frame
// is the real game running — deterministic under a fixed seed. Pipe it
// straight into ffmpeg, e.g.:
//   node video/render-game.mjs --seconds 13 --fps 30 --seed 7 --preroll 4 \
//     | ffmpeg -f rawvideo -pix_fmt rgb24 -s 1080x1920 -r 30 -i - game.mp4
import { createRequire } from 'node:module';

// Write one frame, honouring pipe backpressure: a fire-and-forget async
// write lets the next frame mutate this same buffer before the pipe
// drains, which froze the gameplay at its last frame in the first render.
// A copy per frame + waiting for drain keeps every frame intact.
function writeFrame(buf) {
  return new Promise((resolve, reject) => {
    const copy = Buffer.from(buf);
    const ok = process.stdout.write(copy, (err) => {
      if (err) reject(err);
      else resolve();
    });
    if (!ok) process.stdout.once('drain', resolve);
  });
}

const require = createRequire(import.meta.url);
const SC = require('../game-logic.js');

const rawArgs = process.argv.slice(2);
const args = {};
for (let i = 0; i < rawArgs.length; i++) {
  const m = rawArgs[i].match(/^--([^=]+)(?:=(.+))?$/);
  if (!m) continue;
  args[m[1]] = m[2] !== undefined ? m[2] : rawArgs[++i];
}
const FPS = Number(args.fps || 30);
const SECONDS = Number(args.seconds || 13);
const SEED = Number(args.seed || 7);
const PREROLL = Number(args.preroll || 4);
const W = SC.W;
const H = SC.H;

// --- 5x7 bitmap font (digits + the letters the HUD needs) -----------------
const FONT = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11100', '10010', '10001', '10001', '10001', '10010', '11100'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  ':': ['00000', '00100', '00000', '00000', '00000', '00100', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00000', '00100'],
  '·': ['00000', '00000', '00000', '00100', '00000', '00000', '00000'],
};

// --- Raw RGB24 frame buffer with a tiny rasterizer -------------------------
const frame = Buffer.alloc(W * H * 3);

function blend(px, r, g, b, a) {
  if (a <= 0) return;
  if (a >= 1) {
    frame[px] = r; frame[px + 1] = g; frame[px + 2] = b;
    return;
  }
  frame[px] = Math.round(frame[px] * (1 - a) + r * a);
  frame[px + 1] = Math.round(frame[px + 1] * (1 - a) + g * a);
  frame[px + 2] = Math.round(frame[px + 2] * (1 - a) + b * a);
}

function fillRect(x, y, w, h, color) {
  const [r, g, b, a = 1] = color;
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  if (a >= 1) {
    const row = Buffer.alloc((x1 - x0) * 3);
    for (let i = 0; i < x1 - x0; i++) { row[i * 3] = r; row[i * 3 + 1] = g; row[i * 3 + 2] = b; }
    for (let yy = y0; yy < y1; yy++) row.copy(frame, (yy * W + x0) * 3);
  } else {
    for (let yy = y0; yy < y1; yy++) {
      let px = (yy * W + x0) * 3;
      for (let xx = x0; xx < x1; xx++, px += 3) blend(px, r, g, b, a);
    }
  }
}

function fillCircle(cx, cy, rad, color) {
  const [r, g, b, a = 1] = color;
  const x0 = Math.max(0, Math.floor(cx - rad));
  const x1 = Math.min(W - 1, Math.ceil(cx + rad));
  const y0 = Math.max(0, Math.floor(cy - rad));
  const y1 = Math.min(H - 1, Math.ceil(cy + rad));
  const rr = rad * rad;
  for (let yy = y0; yy <= y1; yy++) {
    const dy = yy - cy;
    let px = (yy * W + x0) * 3;
    for (let xx = x0; xx <= x1; xx++, px += 3) {
      const dx = xx - cx;
      if (dx * dx + dy * dy <= rr) blend(px, r, g, b, a);
    }
  }
}

function fillPoly(points, color) {
  const [r, g, b, a = 1] = color;
  let minY = H, maxY = 0;
  for (const [, y] of points) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
  for (let yy = Math.max(0, Math.floor(minY)); yy <= Math.min(H - 1, Math.ceil(maxY)); yy++) {
    const xs = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((y1 <= yy && y2 > yy) || (y2 <= yy && y1 > yy)) {
        xs.push(x1 + ((yy - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const x0 = Math.max(0, Math.floor(xs[k]));
      const x1 = Math.min(W - 1, Math.ceil(xs[k + 1]));
      let px = (yy * W + x0) * 3;
      for (let xx = x0; xx <= x1; xx++, px += 3) blend(px, r, g, b, a);
    }
  }
}

function drawText(str, x, y, px, color, align) {
  const scale = px / 7;
  const cw = 6 * scale; // 5px glyph + 1px gap
  const totalW = str.length * cw - scale;
  let ox = x;
  if (align === 'center') ox = x - totalW / 2;
  if (align === 'right') ox = x - totalW;
  const [r, g, b, a = 1] = color;
  for (let ci = 0; ci < str.length; ci++) {
    const glyph = FONT[str[ci]] || FONT[' '];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] !== '1') continue;
        fillRect(ox + ci * cw + col * scale, y - px / 2 + row * scale, scale + 0.6, scale + 0.6, [r, g, b, a]);
      }
    }
  }
}

function lerpColor(c1, c2, t) {
  return [Math.round(c1[0] + (c2[0] - c1[0]) * t), Math.round(c1[1] + (c2[1] - c1[1]) * t), Math.round(c1[2] + (c2[2] - c1[2]) * t)];
}

const P = {
  bg() {
    const stops = [[11, 16, 38], [27, 17, 64], [42, 15, 69]];
    for (let yy = 0; yy < H; yy++) {
      const t = yy / H;
      const c = t < 0.55 ? lerpColor(stops[0], stops[1], t / 0.55) : lerpColor(stops[1], stops[2], (t - 0.55) / 0.45);
      frame.fill(Buffer.from(c), yy * W * 3, (yy + 1) * W * 3);
    }
  },
  circle: (cx, cy, r, c) => fillCircle(cx, cy, r, c),
  rect: (x, y, w, h, c) => fillRect(x, y, w, h, c),
  poly: (pts, c) => fillPoly(pts, c),
  text: (s, x, y, px, c, align) => drawText(s, x, y, px, c, align),
};

// --- Play the game ---------------------------------------------------------
const game = SC.createGame(SEED);

function autoInput() {
  let best = null;
  for (const st of game.stars) {
    if (!best || st.y > best.y) best = st;
  }
  return best ? { targetX: best.x } : { targetX: W / 2 };
}

function playFor(seconds) {
  const steps = Math.round(seconds * FPS);
  for (let i = 0; i < steps; i++) SC.step(game, autoInput(), 1 / FPS);
}

playFor(PREROLL); // stars already falling, score already ticking

// If the consumer (ffmpeg) stops early, exit quietly instead of an EPIPE crash.
process.stdout.on('error', () => process.exit(0));

const totalFrames = Math.round(SECONDS * FPS);
try {
  for (let f = 0; f < totalFrames; f++) {
    SC.step(game, autoInput(), 1 / FPS);
    SC.draw(game, P);
    await writeFrame(frame);
    if (f % 60 === 0) process.stderr.write(`frame ${f}/${totalFrames} score=${game.score} t=${Math.ceil(game.timeLeft)}s\n`);
  }
} catch (err) {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
}
process.stderr.write(`done: score=${game.score} caught=${game.caught} missed=${game.missed} lives=${game.lives} timeLeft=${game.timeLeft.toFixed(1)}s\n`);
