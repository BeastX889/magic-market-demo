// All art is drawn from code and cached into offscreen canvases.
const MAX_TIER = 8;

const OUT = '#2b1a3d';          // outline ink
const cache = new Map();
const CACHE_BUDGET = 24e6;      // pixels (~96 MB of canvas)
let cachePx = 0;

export function sprite(key, size, drawFn) {
  const k = key + '@' + size;
  let c = cache.get(k);
  if (!c) {
    if (cachePx + size * size > CACHE_BUDGET) { cache.clear(); cachePx = 0; }   // stay well under iOS canvas memory limits
    cachePx += size * size;
    c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.lineJoin = 'round'; g.lineCap = 'round';
    drawFn(g, size);
    cache.set(k, c);
  }
  return c;
}

export function clearArtCache() { cache.clear(); cachePx = 0; }

// ---------- helpers ----------
function lg(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}
function rg(g, x, y, r0, r1, stops) {
  const gr = g.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}
function ink(g, w) { g.strokeStyle = OUT; g.lineWidth = w; g.stroke(); }
function fillInk(g, fill, w) { g.fillStyle = fill; g.fill(); ink(g, w); }
function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); }
function ellipse(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); }
export function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}
function shine(g, x, y, rx, ry, a = 0.55) {
  g.save(); g.globalAlpha = a; g.fillStyle = '#fff';
  ellipse(g, x, y, rx, ry, -0.5); g.fill(); g.restore();
}
function face(g, x, y, s, mood = 'happy') {
  g.fillStyle = OUT;
  circle(g, x - s, y, s * 0.42); g.fill();
  circle(g, x + s, y, s * 0.42); g.fill();
  g.fillStyle = '#fff';
  circle(g, x - s + s * 0.15, y - s * 0.15, s * 0.14); g.fill();
  circle(g, x + s + s * 0.15, y - s * 0.15, s * 0.14); g.fill();
  g.beginPath();
  if (mood === 'happy') g.arc(x, y + s * 0.35, s * 0.45, 0.15 * Math.PI, 0.85 * Math.PI);
  else g.arc(x, y + s * 0.9, s * 0.35, 1.2 * Math.PI, 1.8 * Math.PI);
  g.strokeStyle = OUT; g.lineWidth = s * 0.22; g.stroke();
  g.fillStyle = 'rgba(255,110,140,0.55)';
  ellipse(g, x - s * 1.7, y + s * 0.55, s * 0.45, s * 0.28); g.fill();
  ellipse(g, x + s * 1.7, y + s * 0.55, s * 0.45, s * 0.28); g.fill();
}
function star(g, x, y, r, n = 5, inner = 0.45) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / n;
    const rr = i % 2 ? r * inner : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}
function sparkle(g, x, y, r, col = '#fff') {
  g.save(); g.fillStyle = col;
  g.beginPath();
  g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill();
  g.restore();
}
function halo(g, s, col, strength) {
  g.save();
  g.fillStyle = rg(g, s / 2, s / 2, s * 0.05, s * 0.5, [[0, col], [1, 'rgba(0,0,0,0)']]);
  g.globalAlpha = strength;
  g.fillRect(0, 0, s, s);
  g.restore();
}

// ---------- items ----------
const LIQUID = ['#7fe0ff', '#7fe0ff', '#7dff9a', '#ffd84a', '#ff6fae', null, '#ff8a2a', '#c9a6ff'];

function drawPotion(g, s, t) {
  const w = s * 0.045;
  const cx = s / 2;
  if (t >= 5) halo(g, s, t === 8 ? '#fff3a0' : LIQUID[t - 1] || '#fff', 0.35 + t * 0.04);
  if (t === 1) {
    g.beginPath();
    g.moveTo(cx, s * 0.18);
    g.bezierCurveTo(cx + s * 0.28, s * 0.5, cx + s * 0.25, s * 0.82, cx, s * 0.82);
    g.bezierCurveTo(cx - s * 0.25, s * 0.82, cx - s * 0.28, s * 0.5, cx, s * 0.18);
    fillInk(g, lg(g, 0, s * 0.2, 0, s * 0.8, [[0, '#d4f6ff'], [1, '#4cc4f0']]), w);
    shine(g, cx - s * 0.08, s * 0.56, s * 0.05, s * 0.1);
    face(g, cx, s * 0.62, s * 0.045);
    return;
  }
  // bottle silhouettes per tier
  const liquid = LIQUID[t - 1];
  let body;
  g.save();
  const bodyPath = () => {
    g.beginPath();
    switch (t) {
      case 2: rrect(g, cx - s * 0.13, s * 0.3, s * 0.26, s * 0.54, s * 0.12); break;
      case 3: circle(g, cx, s * 0.6, s * 0.25); break;
      case 4: g.moveTo(cx - s * 0.08, s * 0.32); g.lineTo(cx + s * 0.08, s * 0.32); g.lineTo(cx + s * 0.3, s * 0.82); g.quadraticCurveTo(cx, s * 0.9, cx - s * 0.3, s * 0.82); g.closePath(); break;
      case 5: g.moveTo(cx, s * 0.86); g.bezierCurveTo(cx - s * 0.45, s * 0.6, cx - s * 0.25, s * 0.28, cx, s * 0.42); g.bezierCurveTo(cx + s * 0.25, s * 0.28, cx + s * 0.45, s * 0.6, cx, s * 0.86); break;
      case 6: ellipse(g, cx, s * 0.6, s * 0.22, s * 0.28); break;
      case 7: g.moveTo(cx - s * 0.1, s * 0.3); g.lineTo(cx + s * 0.1, s * 0.3); g.bezierCurveTo(cx + s * 0.38, s * 0.5, cx + s * 0.3, s * 0.88, cx, s * 0.88); g.bezierCurveTo(cx - s * 0.3, s * 0.88, cx - s * 0.38, s * 0.5, cx - s * 0.1, s * 0.3); break;
      case 8: star(g, cx, s * 0.6, s * 0.32, 5, 0.6); break;
    }
  };
  // neck
  if (t !== 5 && t !== 8) {
    rrect(g, cx - s * 0.07, s * 0.17, s * 0.14, s * 0.2, s * 0.03);
    fillInk(g, 'rgba(230,245,255,0.9)', w);
  }
  // glass
  bodyPath();
  g.fillStyle = 'rgba(235,248,255,0.85)'; g.fill();
  // liquid (clip to body, lower ~65%)
  g.save(); bodyPath(); g.clip();
  const top = s * (t === 3 ? 0.5 : t === 8 ? 0.45 : 0.5);
  if (t === 6) {
    const cols = ['#ff5d73', '#ffb347', '#ffe66d', '#6ee7a0', '#5cc8ff', '#a17bff'];
    cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, top + i * s * 0.07, s, s * 0.08); });
  } else {
    g.fillStyle = lg(g, 0, top, 0, s * 0.9, [[0, liquid], [1, shade(liquid, -0.35)]]);
    g.fillRect(0, top, s, s);
  }
  // bubbles
  g.fillStyle = 'rgba(255,255,255,0.7)';
  circle(g, cx - s * 0.06, top + s * 0.12, s * 0.03); g.fill();
  circle(g, cx + s * 0.07, top + s * 0.2, s * 0.02); g.fill();
  g.restore();
  bodyPath(); ink(g, w);
  shine(g, cx - s * 0.1, s * 0.5, s * 0.04, s * 0.09, 0.7);
  // cork / caps
  if (t !== 5 && t !== 8) {
    rrect(g, cx - s * 0.085, s * 0.1, s * 0.17, s * 0.1, s * 0.03);
    fillInk(g, t >= 7 ? '#ffd24a' : '#c98a52', w);
  } else if (t === 5) {
    // heart stopper
    g.save(); g.translate(cx, s * 0.27); g.scale(0.35, 0.35); g.translate(-cx, -s * 0.6);
    g.beginPath(); g.moveTo(cx, s * 0.86); g.bezierCurveTo(cx - s * 0.45, s * 0.6, cx - s * 0.25, s * 0.28, cx, s * 0.42); g.bezierCurveTo(cx + s * 0.25, s * 0.28, cx + s * 0.45, s * 0.6, cx, s * 0.86);
    g.fillStyle = '#ff3d7f'; g.fill(); g.strokeStyle = OUT; g.lineWidth = w / 0.35; g.stroke(); g.restore();
  } else {
    circle(g, cx, s * 0.22, s * 0.07); fillInk(g, '#ffd24a', w);
  }
  if (t === 7) { // flame
    g.beginPath(); g.moveTo(cx, s * 0.02); g.quadraticCurveTo(cx + s * 0.1, s * 0.08, cx + s * 0.04, s * 0.13); g.quadraticCurveTo(cx, s * 0.1, cx - s * 0.04, s * 0.13); g.quadraticCurveTo(cx - s * 0.1, s * 0.08, cx, s * 0.02);
    fillInk(g, '#ffb020', w * 0.7);
  }
  if (t >= 3 && t <= 6) face(g, cx, s * 0.7, s * 0.035);
  if (t >= 6) { sparkle(g, s * 0.2, s * 0.25, s * 0.06); sparkle(g, s * 0.82, s * 0.4, s * 0.05); }
  if (t === 8) { sparkle(g, s * 0.8, s * 0.15, s * 0.08, '#fff6b0'); sparkle(g, s * 0.15, s * 0.75, s * 0.06, '#fff6b0'); }
  g.restore();
}

function leaf(g, x, y, len, wid, ang, fill, w) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.beginPath(); g.moveTo(0, 0);
  g.quadraticCurveTo(wid, -len * 0.5, 0, -len); g.quadraticCurveTo(-wid, -len * 0.5, 0, 0);
  fillInk(g, fill, w);
  g.beginPath(); g.moveTo(0, -len * 0.1); g.lineTo(0, -len * 0.8);
  g.strokeStyle = 'rgba(43,26,61,0.35)'; g.lineWidth = w * 0.6; g.stroke();
  g.restore();
}
function petals(g, x, y, n, len, wid, fill, w, rot = 0) {
  for (let i = 0; i < n; i++) leaf(g, x, y, len, wid, rot + i * Math.PI * 2 / n, fill, w);
}

function drawHerb(g, s, t) {
  const w = s * 0.045, cx = s / 2;
  const green = lg(g, 0, s * 0.2, 0, s * 0.9, [[0, '#9df07a'], [1, '#3faa4f']]);
  if (t >= 6) halo(g, s, t === 8 ? '#ffe680' : t === 7 ? '#ffd24a' : '#cfe3ff', 0.4);
  // pot for low tiers
  const pot = () => {
    g.beginPath(); g.moveTo(cx - s * 0.2, s * 0.66); g.lineTo(cx + s * 0.2, s * 0.66); g.lineTo(cx + s * 0.15, s * 0.88); g.lineTo(cx - s * 0.15, s * 0.88); g.closePath();
    fillInk(g, lg(g, 0, s * 0.66, 0, s * 0.88, [[0, '#e58a55'], [1, '#b85d34']]), w);
    rrect(g, cx - s * 0.23, s * 0.62, s * 0.46, s * 0.08, s * 0.03); fillInk(g, '#f09a62', w);
  };
  switch (t) {
    case 1:
      leaf(g, cx, s * 0.62, s * 0.22, s * 0.12, -0.6, green, w);
      leaf(g, cx, s * 0.62, s * 0.22, s * 0.12, 0.6, green, w);
      pot(); face(g, cx, s * 0.76, s * 0.03); break;
    case 2:
      leaf(g, cx, s * 0.84, s * 0.62, s * 0.28, 0.25, green, w);
      face(g, cx + s * 0.06, s * 0.5, s * 0.035); break;
    case 3: {
      g.beginPath(); g.moveTo(cx, s * 0.5); g.quadraticCurveTo(cx + s * 0.05, s * 0.75, cx - s * 0.03, s * 0.9); ink(g, w * 1.2);
      const heart = (a) => { g.save(); g.translate(cx, s * 0.45); g.rotate(a);
        g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-s * 0.2, -s * 0.12, -s * 0.12, -s * 0.3, 0, -s * 0.2); g.bezierCurveTo(s * 0.12, -s * 0.3, s * 0.2, -s * 0.12, 0, 0);
        fillInk(g, green, w); g.restore(); };
      heart(0); heart(2.1); heart(-2.1);
      face(g, cx, s * 0.45, s * 0.028); break;
    }
    case 4: {
      g.beginPath(); g.moveTo(cx - s * 0.1, s * 0.9); g.quadraticCurveTo(cx, s * 0.5, cx + s * 0.12, s * 0.1); ink(g, w);
      for (let i = 0; i < 6; i++) {
        const k = i / 6, y = s * (0.82 - k * 0.66), x = cx - s * 0.08 + k * s * 0.18;
        leaf(g, x, y, s * (0.2 - k * 0.1), s * 0.06, -1.3, green, w * 0.8);
        leaf(g, x, y, s * (0.2 - k * 0.1), s * 0.06, 1.1, green, w * 0.8);
      }
      break;
    }
    case 5: {
      const pur = lg(g, 0, 0, 0, s, [[0, '#d7b4ff'], [1, '#8a5cf0']]);
      [[-0.2, 0], [0, 0.04], [0.2, 0]].forEach(([dx, dy]) => {
        g.beginPath(); g.moveTo(cx + dx * s * 0.4, s * 0.9); g.lineTo(cx + dx * s, s * (0.35 + dy)); ink(g, w);
        for (let i = 0; i < 5; i++) { ellipse(g, cx + dx * s * (0.95 - i * 0.05), s * (0.2 + dy + i * 0.07), s * 0.05, s * 0.04); fillInk(g, pur, w * 0.7); }
      });
      rrect(g, cx - s * 0.12, s * 0.7, s * 0.24, s * 0.07, s * 0.02); fillInk(g, '#ff8ab4', w);
      break;
    }
    case 6: {
      leaf(g, cx, s * 0.92, s * 0.3, s * 0.1, -0.7, green, w); leaf(g, cx, s * 0.92, s * 0.3, s * 0.1, 0.7, green, w);
      petals(g, cx, s * 0.45, 6, s * 0.3, s * 0.13, lg(g, 0, s * 0.1, 0, s * 0.7, [[0, '#ffffff'], [1, '#a9c8ff']]), w);
      circle(g, cx, s * 0.45, s * 0.08); fillInk(g, '#fff4a8', w);
      face(g, cx, s * 0.45, s * 0.025);
      sparkle(g, s * 0.2, s * 0.2, s * 0.05); break;
    }
    case 7: {
      g.beginPath(); g.moveTo(cx, s * 0.95); g.lineTo(cx, s * 0.6); ink(g, w * 1.4);
      petals(g, cx, s * 0.42, 12, s * 0.32, s * 0.08, lg(g, 0, 0, 0, s, [[0, '#ffe45c'], [1, '#ff9f1c']]), w * 0.8);
      circle(g, cx, s * 0.42, s * 0.14); fillInk(g, rg(g, cx, s * 0.42, 0, s * 0.14, [[0, '#a0522d'], [1, '#5c2e12']]), w);
      face(g, cx, s * 0.42, s * 0.03); break;
    }
    case 8: {
      ellipse(g, cx, s * 0.78, s * 0.36, s * 0.1); fillInk(g, '#4fbf7a', w);
      petals(g, cx, s * 0.66, 7, s * 0.36, s * 0.13, '#ffbf1a', w, -Math.PI / 2 - 1.3);
      petals(g, cx, s * 0.66, 5, s * 0.26, s * 0.1, '#fff09a', w, -Math.PI / 2 - 0.9);
      circle(g, cx, s * 0.55, s * 0.06); fillInk(g, '#fff', w);
      sparkle(g, s * 0.82, s * 0.2, s * 0.08, '#fff6b0'); sparkle(g, s * 0.18, s * 0.3, s * 0.06, '#fff6b0'); break;
    }
  }
}

function cap(g, x, y, rw, rh, fill, w) {
  g.beginPath(); g.moveTo(x - rw, y); g.bezierCurveTo(x - rw, y - rh * 1.3, x + rw, y - rh * 1.3, x + rw, y);
  g.quadraticCurveTo(x, y + rh * 0.25, x - rw, y); fillInk(g, fill, w);
}
function stem(g, x, y, rw, h, w) {
  rrect(g, x - rw, y, rw * 2, h, rw * 0.8); fillInk(g, lg(g, 0, y, 0, y + h, [[0, '#fff7e6'], [1, '#e6cfa8']]), w);
}
function spots(g, x, y, rw, rh) {
  g.fillStyle = 'rgba(255,255,255,0.9)';
  circle(g, x - rw * 0.45, y - rh * 0.55, rw * 0.15); g.fill();
  circle(g, x + rw * 0.2, y - rh * 0.85, rw * 0.12); g.fill();
  circle(g, x + rw * 0.55, y - rh * 0.35, rw * 0.1); g.fill();
}

function drawMush(g, s, t) {
  const w = s * 0.045, cx = s / 2;
  const red = lg(g, 0, s * 0.2, 0, s * 0.6, [[0, '#ff8a8a'], [1, '#d93b3b']]);
  if (t >= 5) halo(g, s, t === 5 ? '#7ff6ff' : t === 8 ? '#e0b3ff' : '#ffd6f0', 0.4);
  switch (t) {
    case 1:
      [[0, 0, 0.09], [-0.15, 0.1, 0.06], [0.14, 0.08, 0.07], [0.02, 0.2, 0.05]].forEach(([dx, dy, r]) => { circle(g, cx + dx * s, s * (0.5 + dy), r * s); fillInk(g, rg(g, cx + dx * s, s * (0.5 + dy), 0, r * s, [[0, '#fff2c6'], [1, '#e6b25c']]), w * 0.8); });
      break;
    case 2:
      stem(g, cx, s * 0.55, s * 0.09, s * 0.28, w); cap(g, cx, s * 0.58, s * 0.24, s * 0.2, lg(g, 0, 0, 0, s * 0.6, [[0, '#f2d0a0'], [1, '#c99556']]), w);
      face(g, cx, s * 0.7, s * 0.03); break;
    case 3:
      stem(g, cx, s * 0.55, s * 0.1, s * 0.32, w); cap(g, cx, s * 0.58, s * 0.33, s * 0.26, red, w); spots(g, cx, s * 0.58, s * 0.33, s * 0.26);
      face(g, cx, s * 0.73, s * 0.032); break;
    case 4:
      ellipse(g, cx, s * 0.58, s * 0.3, s * 0.27); fillInk(g, rg(g, cx - s * 0.08, s * 0.5, 0, s * 0.35, [[0, '#fffaf0'], [1, '#e8d2b0']]), w);
      shine(g, cx - s * 0.12, s * 0.45, s * 0.07, s * 0.04); face(g, cx, s * 0.6, s * 0.035); break;
    case 5:
      stem(g, cx, s * 0.55, s * 0.09, s * 0.32, w); cap(g, cx, s * 0.58, s * 0.3, s * 0.24, lg(g, 0, s * 0.2, 0, s * 0.6, [[0, '#a6fbff'], [1, '#22b8d6']]), w);
      spots(g, cx, s * 0.58, s * 0.3, s * 0.24); face(g, cx, s * 0.73, s * 0.03); sparkle(g, s * 0.82, s * 0.25, s * 0.05); break;
    case 6:
      stem(g, cx - s * 0.13, s * 0.58, s * 0.07, s * 0.28, w); cap(g, cx - s * 0.13, s * 0.6, s * 0.2, s * 0.17, red, w); spots(g, cx - s * 0.13, s * 0.6, s * 0.2, s * 0.17);
      stem(g, cx + s * 0.15, s * 0.45, s * 0.08, s * 0.4, w); cap(g, cx + s * 0.15, s * 0.48, s * 0.24, s * 0.2, lg(g, 0, 0, 0, s * 0.5, [[0, '#ffb3e6'], [1, '#d14fa8']]), w); spots(g, cx + s * 0.15, s * 0.48, s * 0.24, s * 0.2);
      face(g, cx + s * 0.15, s * 0.62, s * 0.025); break;
    case 7:
      ellipse(g, cx, s * 0.7, s * 0.36, s * 0.13); g.fillStyle = 'rgba(120,220,120,0.6)'; g.fill();
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2, x = cx + Math.cos(a) * s * 0.3, y = s * 0.7 + Math.sin(a) * s * 0.1;
        stem(g, x, y - s * 0.12, s * 0.035, s * 0.12, w * 0.6); cap(g, x, y - s * 0.1, s * 0.08, s * 0.07, i % 2 ? red : lg(g, 0, 0, 0, s, [[0, '#ffe680'], [1, '#e8a500']]), w * 0.6);
      }
      sparkle(g, cx, s * 0.45, s * 0.09, '#fff6b0'); break;
    case 8:
      stem(g, cx, s * 0.5, s * 0.14, s * 0.4, w); cap(g, cx, s * 0.55, s * 0.42, s * 0.32, lg(g, 0, s * 0.1, 0, s * 0.55, [[0, '#d9a6ff'], [1, '#7b3fd6']]), w);
      spots(g, cx, s * 0.55, s * 0.42, s * 0.32);
      star(g, cx, s * 0.2, s * 0.06); fillInk(g, '#ffe14a', w * 0.6);
      face(g, cx, s * 0.72, s * 0.035); sparkle(g, s * 0.15, s * 0.2, s * 0.06, '#fff6b0'); break;
  }
}

function gem(g, cx, cy, r, sides, colA, colB, w, rot = -Math.PI / 2) {
  g.beginPath();
  for (let i = 0; i < sides; i++) { const a = rot + i * Math.PI * 2 / sides; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  g.closePath(); fillInk(g, lg(g, cx - r, cy - r, cx + r, cy + r, [[0, colA], [1, colB]]), w);
  // facets
  g.save(); g.globalAlpha = 0.35; g.strokeStyle = '#fff'; g.lineWidth = w * 0.5;
  g.beginPath();
  for (let i = 0; i < sides; i++) { const a = rot + i * Math.PI * 2 / sides; g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  g.stroke(); g.restore();
}
function shardPath(g, x, y, w0, h, lean) {
  g.beginPath(); g.moveTo(x - w0, y); g.lineTo(x - w0 * 0.9 + lean, y - h * 0.8); g.lineTo(x + lean * 1.2, y - h); g.lineTo(x + w0 * 0.9 + lean, y - h * 0.8); g.lineTo(x + w0, y); g.closePath();
}

function drawCrys(g, s, t) {
  const w = s * 0.045, cx = s / 2;
  if (t >= 4) halo(g, s, ['', '', '', '#d6a8ff', '#ffffff', '#fff3a0', '#cfe8ff', '#ff8a8a'][t - 1], 0.4);
  switch (t) {
    case 1:
      ellipse(g, cx, s * 0.6, s * 0.24, s * 0.18); fillInk(g, lg(g, 0, s * 0.4, 0, s * 0.8, [[0, '#d9dde6'], [1, '#8d93a6']]), w);
      shine(g, cx - s * 0.08, s * 0.54, s * 0.06, s * 0.03); face(g, cx, s * 0.62, s * 0.03); break;
    case 2:
      shardPath(g, cx, s * 0.85, s * 0.12, s * 0.66, s * 0.05); fillInk(g, lg(g, 0, s * 0.2, s, s * 0.8, [[0, '#d6f4ff'], [1, '#4aaee6']]), w);
      shine(g, cx - s * 0.03, s * 0.45, s * 0.025, s * 0.1); break;
    case 3: {
      const c = lg(g, 0, s * 0.2, s, s * 0.8, [[0, '#d6f4ff'], [1, '#3a9ad9']]);
      shardPath(g, cx - s * 0.17, s * 0.85, s * 0.08, s * 0.42, -s * 0.06); fillInk(g, c, w);
      shardPath(g, cx + s * 0.17, s * 0.85, s * 0.08, s * 0.46, s * 0.06); fillInk(g, c, w);
      shardPath(g, cx, s * 0.87, s * 0.12, s * 0.7, 0); fillInk(g, c, w);
      face(g, cx, s * 0.6, s * 0.028); break;
    }
    case 4: gem(g, cx, s * 0.52, s * 0.32, 6, '#e8c9ff', '#7a3fd0', w); face(g, cx, s * 0.55, s * 0.035); break;
    case 5: {
      g.beginPath(); g.moveTo(cx, s * 0.12); g.lineTo(cx + s * 0.32, s * 0.78); g.lineTo(cx - s * 0.32, s * 0.78); g.closePath();
      fillInk(g, 'rgba(240,250,255,0.9)', w);
      const cols = ['#ff5d73', '#ffb347', '#ffe66d', '#6ee7a0', '#5cc8ff', '#a17bff'];
      cols.forEach((c, i) => { g.save(); g.globalAlpha = 0.85; g.strokeStyle = c; g.lineWidth = s * 0.03; g.beginPath(); g.moveTo(cx + s * 0.05, s * 0.5); g.lineTo(s * 0.98, s * (0.42 + i * 0.05)); g.stroke(); g.restore(); });
      g.beginPath(); g.moveTo(cx, s * 0.12); g.lineTo(cx + s * 0.32, s * 0.78); g.lineTo(cx - s * 0.32, s * 0.78); g.closePath(); ink(g, w);
      face(g, cx, s * 0.6, s * 0.03); break;
    }
    case 6:
      star(g, cx, s * 0.52, s * 0.38, 5, 0.5); fillInk(g, lg(g, 0, s * 0.1, 0, s * 0.9, [[0, '#fff7b0'], [1, '#ffb800']]), w);
      face(g, cx, s * 0.55, s * 0.035); sparkle(g, s * 0.85, s * 0.18, s * 0.06); break;
    case 7:
      circle(g, cx, s * 0.52, s * 0.33); fillInk(g, rg(g, cx - s * 0.1, s * 0.42, 0, s * 0.4, [[0, '#ffffff'], [0.6, '#cfe0ff'], [1, '#8fa8e8']]), w);
      g.beginPath(); g.arc(cx + s * 0.06, s * 0.5, s * 0.2, 0.6, Math.PI * 2 - 0.6, false); g.arc(cx + s * 0.16, s * 0.48, s * 0.15, Math.PI * 2 - 0.9, 0.9, true); g.closePath();
      g.fillStyle = 'rgba(80,100,180,0.35)'; g.fill();
      sparkle(g, s * 0.2, s * 0.2, s * 0.06); sparkle(g, s * 0.82, s * 0.8, s * 0.05); break;
    case 8: {
      g.beginPath(); g.moveTo(cx, s * 0.88); g.lineTo(cx - s * 0.36, s * 0.45); g.lineTo(cx - s * 0.22, s * 0.22); g.lineTo(cx, s * 0.34); g.lineTo(cx + s * 0.22, s * 0.22); g.lineTo(cx + s * 0.36, s * 0.45); g.closePath();
      fillInk(g, lg(g, 0, s * 0.2, 0, s * 0.9, [[0, '#ff9a9a'], [1, '#b0102a']]), w);
      g.save(); g.globalAlpha = 0.4; g.strokeStyle = '#fff'; g.lineWidth = w * 0.5; g.beginPath();
      g.moveTo(cx, s * 0.34); g.lineTo(cx, s * 0.88); g.moveTo(cx - s * 0.36, s * 0.45); g.lineTo(cx + s * 0.36, s * 0.45); g.stroke(); g.restore();
      shine(g, cx - s * 0.16, s * 0.4, s * 0.06, s * 0.03, 0.8);
      sparkle(g, s * 0.82, s * 0.16, s * 0.08, '#fff6b0'); sparkle(g, s * 0.16, s * 0.75, s * 0.06, '#ffd0d0'); break;
    }
  }
}

export function drawItem(g, s, chain, tier) {
  // soft drop shadow
  g.save(); g.fillStyle = 'rgba(40,20,60,0.18)'; ellipse(g, s / 2, s * 0.9, s * 0.28, s * 0.05); g.fill(); g.restore();
  if (chain === 'potion') drawPotion(g, s, tier);
  else if (chain === 'herb') drawHerb(g, s, tier);
  else if (chain === 'mush') drawMush(g, s, tier);
  else if (chain === 'crys') drawCrys(g, s, tier);
  else if (chain === 'chest') drawChest(g, s, tier);
  else if (chain === 'energy') drawEnergy(g, s, tier);
  else if (chain === 'coin') drawCoinItem(g, s, tier);
}

export function itemSprite(chain, tier, size) {
  return sprite(`i-${chain}-${tier}`, size, (g, s) => drawItem(g, s, chain, tier));
}

// ---------- generators ----------
export function drawGenerator(g, s, kind) {
  const w = s * 0.045, cx = s / 2;
  g.save(); g.fillStyle = 'rgba(40,20,60,0.2)'; ellipse(g, cx, s * 0.9, s * 0.36, s * 0.06); g.fill(); g.restore();
  if (kind === 'cauldron') {
    // legs
    [-0.22, 0.22].forEach(d => { rrect(g, cx + d * s - s * 0.04, s * 0.72, s * 0.08, s * 0.16, s * 0.03); fillInk(g, '#3d2f4f', w); });
    ellipse(g, cx, s * 0.58, s * 0.38, s * 0.28); fillInk(g, lg(g, 0, s * 0.3, 0, s * 0.86, [[0, '#5a4870'], [1, '#231a33']]), w);
    ellipse(g, cx, s * 0.38, s * 0.36, s * 0.1); fillInk(g, '#3d2f4f', w);
    ellipse(g, cx, s * 0.38, s * 0.3, s * 0.07); g.fillStyle = lg(g, 0, s * 0.32, 0, s * 0.45, [[0, '#c7ff6b'], [1, '#4fd14f']]); g.fill();
    [[-0.1, 0.3, 0.06], [0.08, 0.26, 0.08], [0.18, 0.33, 0.04], [-0.02, 0.18, 0.05]].forEach(([dx, y, r]) => { circle(g, cx + dx * s, s * y, s * r); fillInk(g, 'rgba(180,255,110,0.9)', w * 0.6); });
    shine(g, cx - s * 0.2, s * 0.56, s * 0.05, s * 0.1, 0.25);
    face(g, cx, s * 0.62, s * 0.04);
  } else if (kind === 'basket') {
    leaf(g, cx - s * 0.12, s * 0.5, s * 0.3, s * 0.12, -0.4, '#6fdc6a', w);
    leaf(g, cx + s * 0.1, s * 0.5, s * 0.34, s * 0.12, 0.3, '#4fc25a', w);
    leaf(g, cx, s * 0.5, s * 0.36, s * 0.13, 0, '#8ef07a', w);
    g.beginPath(); g.moveTo(cx - s * 0.36, s * 0.48); g.lineTo(cx + s * 0.36, s * 0.48); g.lineTo(cx + s * 0.28, s * 0.86); g.lineTo(cx - s * 0.28, s * 0.86); g.closePath();
    fillInk(g, lg(g, 0, s * 0.48, 0, s * 0.86, [[0, '#e8b46a'], [1, '#a8702e']]), w);
    g.save(); g.strokeStyle = 'rgba(80,40,10,0.45)'; g.lineWidth = w * 0.6;
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(cx - s * 0.36 + i * s * 0.02, s * (0.48 + i * 0.095)); g.lineTo(cx + s * 0.36 - i * s * 0.02, s * (0.48 + i * 0.095)); g.stroke(); }
    g.restore();
    g.beginPath(); g.arc(cx, s * 0.48, s * 0.3, Math.PI, 0); g.strokeStyle = OUT; g.lineWidth = w * 2.4; g.stroke(); g.strokeStyle = '#c98a40'; g.lineWidth = w * 1.2; g.stroke();
    face(g, cx, s * 0.66, s * 0.035);
  } else if (kind === 'log') {
    rrect(g, cx - s * 0.4, s * 0.55, s * 0.8, s * 0.3, s * 0.14); fillInk(g, lg(g, 0, s * 0.55, 0, s * 0.85, [[0, '#a8724a'], [1, '#6b4128']]), w);
    ellipse(g, cx + s * 0.34, s * 0.7, s * 0.08, s * 0.14); fillInk(g, '#e8c48e', w);
    stem(g, cx - s * 0.15, s * 0.4, s * 0.05, s * 0.18, w * 0.8); cap(g, cx - s * 0.15, s * 0.42, s * 0.14, s * 0.12, '#ff6b6b', w * 0.8);
    stem(g, cx + s * 0.08, s * 0.32, s * 0.06, s * 0.25, w * 0.8); cap(g, cx + s * 0.08, s * 0.34, s * 0.18, s * 0.15, '#ff8a5c', w * 0.8); spots(g, cx + s * 0.08, s * 0.34, s * 0.18, s * 0.15);
    face(g, cx - s * 0.06, s * 0.7, s * 0.035);
  } else if (kind === 'geode') {
    g.beginPath(); g.moveTo(cx - s * 0.4, s * 0.85); g.lineTo(cx - s * 0.38, s * 0.45); g.lineTo(cx - s * 0.15, s * 0.22); g.lineTo(cx + s * 0.2, s * 0.25); g.lineTo(cx + s * 0.4, s * 0.5); g.lineTo(cx + s * 0.38, s * 0.85); g.closePath();
    fillInk(g, lg(g, 0, s * 0.2, 0, s * 0.85, [[0, '#a59bb5'], [1, '#5d5470']]), w);
    ellipse(g, cx, s * 0.56, s * 0.24, s * 0.2); fillInk(g, '#3a2850', w);
    gem(g, cx - s * 0.08, s * 0.55, s * 0.1, 6, '#d6f4ff', '#3a9ad9', w * 0.7);
    gem(g, cx + s * 0.1, s * 0.58, s * 0.08, 5, '#f0d0ff', '#9a4fe0', w * 0.7);
    gem(g, cx + s * 0.01, s * 0.66, s * 0.06, 6, '#d0ffe8', '#2fb880', w * 0.7);
  }
}
export function generatorSprite(kind, size) {
  return sprite(`g-${kind}`, size, (g, s) => drawGenerator(g, s, kind));
}

function drawChest(g, s, t) {
  const w = s * 0.045, cx = s / 2;
  halo(g, s, '#fff0a0', 0.35);
  rrect(g, cx - s * 0.34, s * 0.45, s * 0.68, s * 0.4, s * 0.06); fillInk(g, lg(g, 0, s * 0.45, 0, s * 0.85, [[0, '#c9803f'], [1, '#8a4f22']]), w);
  g.beginPath(); g.moveTo(cx - s * 0.34, s * 0.47); g.bezierCurveTo(cx - s * 0.34, s * 0.2, cx + s * 0.34, s * 0.2, cx + s * 0.34, s * 0.47); g.closePath();
  fillInk(g, lg(g, 0, s * 0.25, 0, s * 0.47, [[0, '#e09a52'], [1, '#a8602a']]), w);
  rrect(g, cx - s * 0.05, s * 0.26, s * 0.1, s * 0.59, s * 0.02); fillInk(g, '#ffd24a', w * 0.7);
  rrect(g, cx - s * 0.08, s * 0.44, s * 0.16, s * 0.13, s * 0.03); fillInk(g, '#ffe680', w * 0.8);
  sparkle(g, s * 0.82, s * 0.22, s * 0.07); sparkle(g, s * 0.16, s * 0.3, s * 0.05);
}
function drawEnergy(g, s) {
  const w = s * 0.045, cx = s / 2;
  halo(g, s, '#9ff7ff', 0.45);
  circle(g, cx, s * 0.52, s * 0.3); fillInk(g, rg(g, cx - s * 0.08, s * 0.44, 0, s * 0.34, [[0, '#e8ffff'], [1, '#2fb4e8']]), w);
  g.beginPath(); g.moveTo(cx + s * 0.04, s * 0.3); g.lineTo(cx - s * 0.12, s * 0.55); g.lineTo(cx, s * 0.55); g.lineTo(cx - s * 0.04, s * 0.76); g.lineTo(cx + s * 0.13, s * 0.48); g.lineTo(cx, s * 0.48); g.closePath();
  fillInk(g, '#fff36b', w * 0.7);
}
function drawCoinItem(g, s) {
  const w = s * 0.045, cx = s / 2;
  [[-0.12, 0.66], [0.12, 0.66], [0, 0.5]].forEach(([dx, y]) => { ellipse(g, cx + dx * s, s * y, s * 0.2, s * 0.2); fillInk(g, lg(g, 0, s * (y - 0.2), 0, s * (y + 0.2), [[0, '#fff1a0'], [1, '#e6a400']]), w); star(g, cx + dx * s, s * y, s * 0.08); g.fillStyle = 'rgba(160,90,0,0.5)'; g.fill(); });
}

export function coinIcon(size) {
  return sprite('coin', size, (g, s) => {
    const w = s * 0.08;
    circle(g, s / 2, s / 2, s * 0.4); fillInk(g, lg(g, 0, s * 0.1, 0, s * 0.9, [[0, '#fff1a0'], [1, '#e6a400']]), w);
    star(g, s / 2, s / 2, s * 0.18); g.fillStyle = 'rgba(160,90,0,0.55)'; g.fill();
  });
}
export function energyIcon(size) {
  return sprite('energy', size, (g, s) => {
    const w = s * 0.08, cx = s / 2;
    g.beginPath(); g.moveTo(cx + s * 0.1, s * 0.05); g.lineTo(cx - s * 0.28, s * 0.55); g.lineTo(cx - s * 0.02, s * 0.55); g.lineTo(cx - s * 0.1, s * 0.95); g.lineTo(cx + s * 0.3, s * 0.42); g.lineTo(cx + s * 0.02, s * 0.42); g.closePath();
    fillInk(g, lg(g, 0, 0, 0, s, [[0, '#fff9a8'], [1, '#ffb800']]), w);
  });
}
export function starIcon(size) {
  return sprite('star', size, (g, s) => { star(g, s / 2, s * 0.53, s * 0.44); fillInk(g, lg(g, 0, 0, 0, s, [[0, '#fff3a0'], [1, '#ff9f1c']]), s * 0.08); });
}

// ---------- customers ----------
export function drawCustomer(g, s, id, mood = 'happy') {
  const w = s * 0.04, cx = s / 2, cy = s * 0.56;
  const head = (fill, rx = 0.34, ry = 0.3) => { ellipse(g, cx, cy, s * rx, s * ry); fillInk(g, fill, w); };
  switch (id) {
    case 'cat':
      [[-1], [1]].forEach(([d]) => { g.beginPath(); g.moveTo(cx + d * s * 0.3, cy - s * 0.1); g.lineTo(cx + d * s * 0.26, cy - s * 0.42); g.lineTo(cx + d * s * 0.06, cy - s * 0.24); g.closePath(); fillInk(g, '#ffb067', w); });
      head(lg(g, 0, cy - s * 0.3, 0, cy + s * 0.3, [[0, '#ffc98a'], [1, '#f08a3c']]));
      g.strokeStyle = OUT; g.lineWidth = w * 0.6;
      [-1, 1].forEach(d => { for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(cx + d * s * 0.16, cy + s * 0.08 + i * s * 0.03); g.lineTo(cx + d * s * 0.36, cy + s * 0.05 + i * s * 0.06); g.stroke(); } });
      break;
    case 'frog':
      [-1, 1].forEach(d => { circle(g, cx + d * s * 0.17, cy - s * 0.24, s * 0.12); fillInk(g, '#7ad65a', w); });
      head(lg(g, 0, cy - s * 0.3, 0, cy + s * 0.3, [[0, '#9ae67a'], [1, '#4aa83a']]), 0.38, 0.27);
      // crown
      g.beginPath(); g.moveTo(cx - s * 0.12, cy - s * 0.3); g.lineTo(cx - s * 0.12, cy - s * 0.44); g.lineTo(cx - s * 0.05, cy - s * 0.36); g.lineTo(cx, cy - s * 0.46); g.lineTo(cx + s * 0.05, cy - s * 0.36); g.lineTo(cx + s * 0.12, cy - s * 0.44); g.lineTo(cx + s * 0.12, cy - s * 0.3); g.closePath();
      fillInk(g, '#ffd24a', w * 0.8);
      break;
    case 'ghost':
      g.beginPath(); g.moveTo(cx - s * 0.32, cy + s * 0.32); g.lineTo(cx - s * 0.32, cy - s * 0.05); g.bezierCurveTo(cx - s * 0.32, cy - s * 0.45, cx + s * 0.32, cy - s * 0.45, cx + s * 0.32, cy - s * 0.05); g.lineTo(cx + s * 0.32, cy + s * 0.32);
      for (let i = 0; i < 4; i++) { const x = cx + s * 0.32 - (i + 0.5) * s * 0.16; g.quadraticCurveTo(x, cy + s * 0.2, x - s * 0.08, cy + s * 0.32); }
      g.closePath(); fillInk(g, lg(g, 0, cy - s * 0.4, 0, cy + s * 0.3, [[0, '#ffffff'], [1, '#d6d0f0']]), w);
      break;
    case 'knight':
      head('#ffd9b8', 0.28, 0.27);
      g.beginPath(); g.arc(cx, cy - s * 0.02, s * 0.32, Math.PI, 0); g.lineTo(cx + s * 0.32, cy - s * 0.04); g.lineTo(cx - s * 0.32, cy - s * 0.04); g.closePath();
      fillInk(g, lg(g, 0, cy - s * 0.34, 0, cy, [[0, '#e8eef8'], [1, '#8a98b0']]), w);
      g.beginPath(); g.moveTo(cx, cy - s * 0.34); g.quadraticCurveTo(cx + s * 0.2, cy - s * 0.55, cx + s * 0.1, cy - s * 0.6); ink(g, w * 2.4); g.strokeStyle = '#ff4d6d'; g.lineWidth = w * 1.4; g.stroke();
      break;
    case 'owl':
      [-1, 1].forEach(d => { g.beginPath(); g.moveTo(cx + d * s * 0.28, cy - s * 0.15); g.lineTo(cx + d * s * 0.3, cy - s * 0.42); g.lineTo(cx + d * s * 0.12, cy - s * 0.25); g.closePath(); fillInk(g, '#a8784e', w); });
      head(lg(g, 0, cy - s * 0.3, 0, cy + s * 0.3, [[0, '#c4946a'], [1, '#7a5030']]));
      [-1, 1].forEach(d => { circle(g, cx + d * s * 0.13, cy - s * 0.02, s * 0.12); fillInk(g, '#fff4dc', w * 0.7); });
      g.beginPath(); g.moveTo(cx - s * 0.05, cy + s * 0.08); g.lineTo(cx + s * 0.05, cy + s * 0.08); g.lineTo(cx, cy + s * 0.16); g.closePath(); fillInk(g, '#ffb020', w * 0.6);
      // glasses
      g.strokeStyle = OUT; g.lineWidth = w * 0.8; circle(g, cx - s * 0.13, cy - s * 0.02, s * 0.13); g.stroke(); circle(g, cx + s * 0.13, cy - s * 0.02, s * 0.13); g.stroke();
      break;
    case 'slime':
      g.beginPath(); g.moveTo(cx - s * 0.38, cy + s * 0.3); g.bezierCurveTo(cx - s * 0.38, cy - s * 0.3, cx - s * 0.1, cy - s * 0.42, cx, cy - s * 0.42); g.bezierCurveTo(cx + s * 0.1, cy - s * 0.42, cx + s * 0.38, cy - s * 0.3, cx + s * 0.38, cy + s * 0.3); g.closePath();
      fillInk(g, lg(g, 0, cy - s * 0.4, 0, cy + s * 0.3, [[0, '#b3f0ff'], [1, '#3fa8e0']]), w);
      shine(g, cx - s * 0.18, cy - s * 0.15, s * 0.06, s * 0.1, 0.6);
      break;
    case 'pumpkin':
      rrect(g, cx - s * 0.04, cy - s * 0.42, s * 0.08, s * 0.14, s * 0.02); fillInk(g, '#5a8a3a', w);
      [-0.18, 0.18, 0].forEach(d => { ellipse(g, cx + d * s, cy, s * 0.2, s * 0.28); fillInk(g, lg(g, 0, cy - s * 0.3, 0, cy + s * 0.3, [[0, '#ffb04a'], [1, '#e86a10']]), w); });
      break;
    case 'fox':
      [-1, 1].forEach(d => { g.beginPath(); g.moveTo(cx + d * s * 0.3, cy - s * 0.05); g.lineTo(cx + d * s * 0.32, cy - s * 0.45); g.lineTo(cx + d * s * 0.08, cy - s * 0.25); g.closePath(); fillInk(g, '#ff8a3c', w); });
      g.beginPath(); g.moveTo(cx - s * 0.36, cy - s * 0.1); g.quadraticCurveTo(cx - s * 0.3, cy + s * 0.3, cx, cy + s * 0.3); g.quadraticCurveTo(cx + s * 0.3, cy + s * 0.3, cx + s * 0.36, cy - s * 0.1); g.quadraticCurveTo(cx, cy - s * 0.4, cx - s * 0.36, cy - s * 0.1);
      fillInk(g, lg(g, 0, cy - s * 0.3, 0, cy + s * 0.3, [[0, '#ffa860'], [1, '#e8641c']]), w);
      g.beginPath(); g.moveTo(cx - s * 0.2, cy + s * 0.12); g.quadraticCurveTo(cx, cy + s * 0.35, cx + s * 0.2, cy + s * 0.12); g.quadraticCurveTo(cx, cy + s * 0.05, cx - s * 0.2, cy + s * 0.12); g.fillStyle = '#fff4e6'; g.fill();
      break;
  }
  face(g, cx, cy + s * (id === 'frog' ? 0.02 : id === 'owl' ? -0.02 : 0.03), s * 0.045, mood);
}
export function customerSprite(id, size, mood = 'happy') {
  return sprite(`c-${id}-${mood}`, size, (g, s) => drawCustomer(g, s, id, mood));
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return `rgb(${f(r)},${f(gg)},${f(b)})`;
}

export { OUT, star, sparkle, circle, ellipse, lg, rg, shine, face, fillInk };
export const TIERS = MAX_TIER;
