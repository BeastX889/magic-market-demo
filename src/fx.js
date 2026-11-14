// Particles, flying icons, floating text, easing, text helper.
import { star, sparkle, circle } from './art.js';

export const E = {
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  inOutQuad: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  outElastic: t => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1,
};

export const FONT = '"Baloo 2","Fredoka","Arial Rounded MT Bold","Trebuchet MS",system-ui,sans-serif';

export function text(g, s, x, y, size, fill = '#fff', o = {}) {
  g.font = `${o.weight || 800} ${size}px ${FONT}`;
  g.textAlign = o.align || 'center';
  g.textBaseline = o.base || 'middle';
  if (o.stroke !== false) {
    g.lineJoin = 'round';
    g.lineWidth = o.lw || Math.max(3, size * 0.2);
    g.strokeStyle = o.stroke || '#2b1a3d';
    g.strokeText(s, x, y);
  }
  g.fillStyle = fill;
  g.fillText(s, x, y);
}

const parts = [], texts = [], flyers = [];
const shakeState = { v: 0, x: 0, y: 0 };
export const shake = shakeState;
export function addShake(v) { shakeState.v = Math.max(shakeState.v, v); }

export function burst(x, y, colors, n = 16, speed = 380, opt = {}) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = speed * (0.35 + Math.random() * 0.65);
    parts.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opt.up || 0),
      life: 0, max: (opt.life || 0.6) * (0.7 + Math.random() * 0.6),
      size: (opt.size || 9) * (0.5 + Math.random() * 0.8),
      color: colors[i % colors.length],
      kind: opt.kind || (Math.random() < 0.45 ? 'star' : 'dot'),
      g: opt.gravity ?? 700, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, drag: opt.drag ?? 2.2,
    });
  }
}
export function ring(x, y, color, r = 80, life = 0.45) {
  parts.push({ x, y, vx: 0, vy: 0, life: 0, max: life, size: r, color, kind: 'ring', g: 0, drag: 0 });
}
export function spark(x, y, color = '#fff') {
  parts.push({ x, y, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 30, life: 0, max: 0.9, size: 5 + Math.random() * 5, color, kind: 'twinkle', g: 0, drag: 0, rot: 0, vr: 0 });
}
export function floatText(x, y, s, color = '#fff', size = 36, opt = {}) {
  texts.push({ x, y, s, color, size, life: 0, max: opt.max || 1.1, vy: opt.vy ?? -80, delay: opt.delay || 0 });
}
// draw(g, x, y, p) renders the flying thing at its current spot.
export function fly(sx, sy, ex, ey, draw, dur = 0.6, onDone = null, delay = 0, arc = null) {
  flyers.push({ sx, sy, ex, ey, draw, dur, t: -delay, onDone, arc: arc ?? (-100 - Math.random() * 120), wob: (Math.random() - 0.5) * 160 });
}

export function updateFx(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life += dt;
    if (p.life >= p.max) { parts.splice(i, 1); continue; }
    const d = Math.exp(-p.drag * dt);
    p.vx *= d; p.vy *= d; p.vy += p.g * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += (p.vr || 0) * dt;
  }
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    if (t.delay > 0) { t.delay -= dt; continue; }
    t.life += dt; t.y += t.vy * dt; t.vy *= Math.exp(-2 * dt);
    if (t.life >= t.max) texts.splice(i, 1);
  }
  for (let i = flyers.length - 1; i >= 0; i--) {
    const f = flyers[i];
    f.t += dt;
    if (f.t >= f.dur) { flyers.splice(i, 1); f.onDone && f.onDone(); }
  }
  if (shakeState.v > 0) {
    shakeState.v = Math.max(0, shakeState.v - dt * 40);
    shakeState.x = (Math.random() - 0.5) * shakeState.v;
    shakeState.y = (Math.random() - 0.5) * shakeState.v;
  } else { shakeState.x = shakeState.y = 0; }
}

export function drawParticles(g) {
  for (const p of parts) {
    const k = p.life / p.max;
    g.save();
    g.globalAlpha = Math.max(0, 1 - k * k);
    if (p.kind === 'ring') {
      g.strokeStyle = p.color; g.lineWidth = 8 * (1 - k);
      circle(g, p.x, p.y, p.size * E.outCubic(k)); g.stroke();
    } else if (p.kind === 'star') {
      g.translate(p.x, p.y); g.rotate(p.rot);
      star(g, 0, 0, p.size, 5, 0.5); g.fillStyle = p.color; g.fill();
    } else if (p.kind === 'twinkle') {
      g.globalAlpha = Math.sin(k * Math.PI);
      sparkle(g, p.x, p.y, p.size, p.color);
    } else {
      circle(g, p.x, p.y, p.size * (1 - k * 0.5)); g.fillStyle = p.color; g.fill();
    }
    g.restore();
  }
}

export function drawFlyers(g) {
  for (const f of flyers) {
    if (f.t < 0) continue;
    const p = Math.min(1, f.t / f.dur);
    const e = E.inOutQuad(p);
    const x = f.sx + (f.ex - f.sx) * e + Math.sin(p * Math.PI) * f.wob * 0.3;
    const y = f.sy + (f.ey - f.sy) * e + Math.sin(p * Math.PI) * f.arc;
    f.draw(g, x, y, p);
  }
}

export function drawTexts(g) {
  for (const t of texts) {
    if (t.delay > 0) continue;
    const k = t.life / t.max;
    const pop = k < 0.15 ? E.outBack(k / 0.15) : 1;
    g.save();
    g.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    g.translate(t.x, t.y); g.scale(pop, pop);
    text(g, t.s, 0, 0, t.size, t.color);
    g.restore();
  }
}

export function clearFx() { parts.length = 0; texts.length = 0; flyers.length = 0; shakeState.v = 0; }
