// Shop art drawn from code: witch, stands, counter, bat, spellbook.
import { LINES } from './game.js';
import { sprite, rrect, lg, circle, ellipse, sparkle, star, OUT, face, fillInk } from './art.js';

export function drawWitch(g2, s) {
  const w = s * 0.035, cx = s / 2;
  // robe
  g2.beginPath(); g2.moveTo(cx - s * 0.13, s * 0.5); g2.lineTo(cx + s * 0.13, s * 0.5); g2.quadraticCurveTo(cx + s * 0.24, s * 0.8, cx + s * 0.27, s * 0.95);
  g2.quadraticCurveTo(cx, s * 0.99, cx - s * 0.27, s * 0.95); g2.quadraticCurveTo(cx - s * 0.24, s * 0.8, cx - s * 0.13, s * 0.5); g2.closePath();
  fillInk(g2, lg(g2, 0, s * 0.5, 0, s, [[0, '#9a6cff'], [1, '#5a33b8']]), w);
  star(g2, cx + s * 0.06, s * 0.78, s * 0.05); g2.fillStyle = '#ffe14a'; g2.fill();
  // cape collar
  g2.beginPath(); g2.moveTo(cx - s * 0.16, s * 0.52); g2.quadraticCurveTo(cx, s * 0.62, cx + s * 0.16, s * 0.52); g2.lineTo(cx, s * 0.58); g2.closePath(); fillInk(g2, '#ff7ac0', w * 0.8);
  // hair + head
  ellipse(g2, cx, s * 0.43, s * 0.2, s * 0.15); fillInk(g2, '#ff9a3c', w);
  circle(g2, cx, s * 0.41, s * 0.155); fillInk(g2, '#ffe0c4', w);
  face(g2, cx, s * 0.43, s * 0.028);
  g2.fillStyle = 'rgba(255,120,150,0.5)'; circle(g2, cx - s * 0.085, s * 0.47, s * 0.025); g2.fill(); circle(g2, cx + s * 0.085, s * 0.47, s * 0.025); g2.fill();
  // hat
  ellipse(g2, cx, s * 0.29, s * 0.3, s * 0.065); fillInk(g2, '#4a2a8a', w);
  g2.beginPath(); g2.moveTo(cx - s * 0.16, s * 0.29); g2.quadraticCurveTo(cx - s * 0.08, s * 0.12, cx + s * 0.04, s * 0.02);
  g2.quadraticCurveTo(cx + s * 0.16, s * 0.0, cx + s * 0.2, s * 0.06); g2.quadraticCurveTo(cx + s * 0.1, s * 0.08, cx + s * 0.09, s * 0.14);
  g2.quadraticCurveTo(cx + s * 0.12, s * 0.22, cx + s * 0.16, s * 0.29); g2.closePath();
  fillInk(g2, lg(g2, 0, 0, 0, s * 0.3, [[0, '#7a4ae0'], [1, '#4a2a8a']]), w);
  g2.beginPath(); g2.moveTo(cx - s * 0.15, s * 0.255); g2.quadraticCurveTo(cx, s * 0.28, cx + s * 0.155, s * 0.255); g2.lineTo(cx + s * 0.14, s * 0.21); g2.quadraticCurveTo(cx, s * 0.235, cx - s * 0.125, s * 0.21); g2.closePath();
  fillInk(g2, '#ffd23f', w * 0.7);
  sparkle(g2, cx + s * 0.2, s * 0.06, s * 0.035, '#fff6a8');
}
export const witchSprite = n => sprite('witch', n, drawWitch);

export function standSprite(i, n) {
  const l = LINES[i];
  return sprite('stand-' + i, n, (g2, s) => {
    const w = s * 0.022, cx = s / 2, u = s / 200;
    // poles + striped awning
    [-80, 80].forEach(d => { rrect(g2, cx + d * u - 5 * u, 40 * u, 10 * u, 120 * u, 4 * u); fillInk(g2, '#8a5a34', w); });
    g2.save();
    g2.beginPath(); g2.moveTo(cx - 96 * u, 70 * u); g2.lineTo(cx - 84 * u, 30 * u); g2.lineTo(cx + 84 * u, 30 * u); g2.lineTo(cx + 96 * u, 70 * u); g2.closePath();
    g2.fillStyle = '#fff8ee'; g2.fill(); g2.clip();
    g2.fillStyle = l.color;
    for (let k = -4; k < 5; k += 2) { g2.beginPath(); g2.moveTo(cx + k * 22 * u - 10 * u, 30 * u); g2.lineTo(cx + (k + 1) * 22 * u - 10 * u, 30 * u); g2.lineTo(cx + (k + 1) * 24 * u - 10 * u, 70 * u); g2.lineTo(cx + k * 24 * u - 10 * u, 70 * u); g2.fill(); }
    g2.restore();
    g2.beginPath(); g2.moveTo(cx - 96 * u, 70 * u); g2.lineTo(cx - 84 * u, 30 * u); g2.lineTo(cx + 84 * u, 30 * u); g2.lineTo(cx + 96 * u, 70 * u); g2.closePath(); g2.strokeStyle = OUT; g2.lineWidth = w; g2.stroke();
    for (let k = 0; k < 8; k++) { g2.beginPath(); g2.arc(cx - 84 * u + k * 24 * u, 70 * u, 12 * u, 0, Math.PI); fillInk(g2, k % 2 ? '#fff8ee' : l.color, w * 0.8); }
    // table
    rrect(g2, cx - 88 * u, 128 * u, 176 * u, 30 * u, 8 * u); fillInk(g2, lg(g2, 0, 128 * u, 0, 158 * u, [[0, '#e8b47a'], [1, '#c98a50']]), w);
    rrect(g2, cx - 82 * u, 154 * u, 164 * u, 36 * u, 6 * u); fillInk(g2, lg(g2, 0, 154 * u, 0, 190 * u, [[0, '#a8683a'], [1, '#7a4628']]), w);
    g2.strokeStyle = 'rgba(60,30,10,0.35)'; g2.lineWidth = w * 0.6;
    for (let k = 1; k < 4; k++) { g2.beginPath(); g2.moveTo(cx - 82 * u + k * 41 * u, 156 * u); g2.lineTo(cx - 82 * u + k * 41 * u, 188 * u); g2.stroke(); }
  });
}
export function counterSprite(n) {
  return sprite('counter', n, (g2, s) => {
    const w = s * 0.022, cx = s / 2, u = s / 220;
    rrect(g2, cx - 100 * u, 110 * u, 200 * u, 34 * u, 10 * u); fillInk(g2, lg(g2, 0, 110 * u, 0, 144 * u, [[0, '#ffd9a0'], [1, '#e0a860']]), w);
    rrect(g2, cx - 94 * u, 140 * u, 188 * u, 54 * u, 8 * u); fillInk(g2, lg(g2, 0, 140 * u, 0, 194 * u, [[0, '#b46ad8'], [1, '#7a3aa8']]), w);
    star(g2, cx, 167 * u, 14 * u); fillInk(g2, '#ffe14a', w * 0.7);
    // cash box
    rrect(g2, cx + 22 * u, 82 * u, 56 * u, 36 * u, 6 * u); fillInk(g2, lg(g2, 0, 82 * u, 0, 118 * u, [[0, '#9adfff'], [1, '#3a9ad9']]), w);
    rrect(g2, cx + 30 * u, 88 * u, 40 * u, 12 * u, 3 * u); fillInk(g2, '#e8fbff', w * 0.6);
    // bell
    g2.beginPath(); g2.arc(cx - 50 * u, 116 * u, 16 * u, Math.PI, 0); g2.closePath(); fillInk(g2, lg(g2, 0, 100 * u, 0, 116 * u, [[0, '#fff1a0'], [1, '#e6a400']]), w);
    circle(g2, cx - 50 * u, 98 * u, 4 * u); fillInk(g2, '#e6a400', w * 0.6);
  });
}
export function batDraw(g, x, y, ph, sc = 1) {
  const fl = Math.sin(ph) * 0.8;
  g.save(); g.translate(x, y); g.scale(sc, sc);
  for (const d of [-1, 1]) {
    g.save(); g.scale(d, 1); g.rotate(-fl * 0.5);
    g.beginPath(); g.moveTo(8, -4); g.quadraticCurveTo(26, -26, 40, -14); g.quadraticCurveTo(34, -6, 36, 2); g.quadraticCurveTo(28, -2, 24, 6); g.quadraticCurveTo(16, 0, 8, 6); g.closePath();
    fillInk(g, '#5a3a8a', 3); g.restore();
  }
  circle(g, 0, 0, 16); fillInk(g, lg(g, 0, -16, 0, 16, [[0, '#8a6ac8'], [1, '#4a2a7a']]), 3);
  for (const d of [-1, 1]) { g.beginPath(); g.moveTo(d * 6, -12); g.lineTo(d * 12, -24); g.lineTo(d * 13, -9); fillInk(g, '#6a4aa8', 2.5); }
  face(g, 0, -1, 3.2);
  g.restore();
}

export function bookIcon(x, y, r, g) {
  g.save(); g.translate(x, y); g.rotate(-0.12);
  rrect(g, -r * 0.62, -r * 0.5, r * 1.24, r * 1.0, r * 0.12); fillInk(g, '#ff7ac0', 3);
  rrect(g, -r * 0.54, -r * 0.42, r * 1.08, r * 0.84, r * 0.08); g.fillStyle = '#fff8ee'; g.fill();
  g.beginPath(); g.moveTo(0, -r * 0.42); g.lineTo(0, r * 0.42); g.strokeStyle = OUT; g.lineWidth = 3; g.stroke();
  star(g, -r * 0.27, 0, r * 0.2); g.fillStyle = '#ffd23f'; g.fill();
  g.beginPath(); g.moveTo(r * 0.12, -r * 0.15); g.lineTo(r * 0.42, -r * 0.15); g.moveTo(r * 0.12, r * 0.05); g.lineTo(r * 0.42, r * 0.05); g.moveTo(r * 0.12, r * 0.25); g.lineTo(r * 0.36, r * 0.25); g.lineWidth = 2.5; g.stroke();
  g.restore();
}
