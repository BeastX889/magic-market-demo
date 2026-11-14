// Magic Market Tycoon: rendering, camera, joystick, HUD, popups.
import {
  P, G, on, loadProfile, saveProfile, startGame, tick, objective, offlineEarnings, addCoins, buyUpgrade, hireHelper, startRush,
  WW, WH, PROD_Y, STAND_Y, REG, CASH, PILE, DOOR, LINES, BUILDS, UPG, HELPER_COST, STAND_CAP, RUSH_TIME, DECOR,
  upgCost, genBuilt, standBuilt, isBuilt, activePads, helperOk, hasCashier, cap, prodMax, growEvery, priceOf,
} from './game.js';
import { itemSprite, generatorSprite, customerSprite, coinIcon, starIcon, rrect, sprite, clearArtCache, lg, rg, circle, ellipse, sparkle, star, shade, OUT, face, fillInk } from './art.js';
import { E, text, burst, ring, floatText, fly, updateFx, drawParticles, drawFlyers, drawTexts, shake, addShake, clearFx } from './fx.js';
import { unlockAudio, setMuted, duck, suspendAudio, sfx } from './audio.js';
import { portal } from './portal.js';
import { witchSprite, standSprite, counterSprite, batDraw, bookIcon } from './market-art.js';

const W = 720, H = 1280;
// Landscape (desktop) uses a shorter stage so the shop is drawn bigger; the HUD hugs the screen edges.
const LAND_H = 820;
let land = false, SH = H, hudL = 0, hudR = W, hudT = 0, hudB = H;
// The HUD hugs the real screen edges (minus notch / home-bar safe areas), so on phones taller than the
// stage it sits at the top and bottom of the screen instead of floating inside the 720x1280 frame.
const safeProbe = document.createElement('div');
safeProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
  'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
document.body.appendChild(safeProbe);
function safeInsets() {
  const cs = getComputedStyle(safeProbe), v = k => parseFloat(cs[k]) || 0;
  return { t: v('paddingTop'), r: v('paddingRight'), b: v('paddingBottom'), l: v('paddingLeft') };
}
const cv = document.getElementById('game');
const g = cv.getContext('2d');
const view = { sc: 1, res: 1, ox: 0, oy: 0, vx: 0, vy: 0, vw: W, vh: H };
const px = v => Math.max(4, Math.ceil(v * view.res));
let dpr = 1, paused = false, popup = null, banner = null, quietFx = false;
const nowS = () => performance.now() / 1000;
const bump = { coins: 0 };
let dispCoins = 0, holdCoins = 0;
const cam = { x: 0, y: 0 };
const fmt = n => n >= 1e12 ? (n / 1e12).toFixed(n >= 1e13 ? 0 : 1) + 'T' : n >= 1e9 ? (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 10000 ? (n / 1000).toFixed(n >= 1e5 ? 0 : 1) + 'K' : String(Math.floor(n));

function resize() {
  const oldRes = view.res, wasLand = land;
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const cw = Math.max(1, window.innerWidth), ch = Math.max(1, window.innerHeight);
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  land = cw > ch * 1.05;
  SH = land ? LAND_H : H;
  const sc = Math.min(cw / W, ch / SH);
  Object.assign(view, { sc, res: sc * dpr, ox: (cw - W * sc) / 2, oy: (ch - SH * sc) / 2 });
  view.vx = -view.ox / sc; view.vy = -view.oy / sc; view.vw = cw / sc; view.vh = ch / sc;
  const si = safeInsets();
  hudL = view.vx + si.l / sc; hudR = view.vx + view.vw - si.r / sc;
  hudT = view.vy + si.t / sc; hudB = view.vy + view.vh - si.b / sc;
  if (view.res !== oldRes) clearArtCache();
  // orientation flip: the stage changes shape, so a held joystick/button press has stale coordinates
  if (land !== wasLand) { Object.assign(joy, { active: false, dx: 0, dy: 0 }); press.id = null; press.b = null; }
}
window.addEventListener('resize', resize);

// ---------- camera ----------
function camTarget() {
  const pl = G.player;
  let x = pl.x - 360, y = pl.y - SH * (land ? 0.5 : 0.55);
  const fit = (v, lo, hi) => lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v));
  x = fit(x, -30 - view.vx, WW + 30 - view.vw - view.vx);
  y = fit(y, -150 - view.vy, WH + 30 - view.vh - view.vy);
  return { x, y };
}
const toStage = (x, y) => ({ x: x - cam.x, y: y - cam.y });

// ---------- sprites ----------
// ---------- world drawing ----------
// v 0/1 = round trees, 2 = bush with flowers
function drawWoodland(g, s, v) {
  const cx = s / 2;
  g.fillStyle = 'rgba(30,60,30,0.25)'; ellipse(g, cx, s * 0.9, s * 0.3, s * 0.07); g.fill();
  if (v === 2) {
    for (const [dx, dy, r] of [[-0.18, 0.66, 0.2], [0.18, 0.66, 0.2], [0, 0.56, 0.24]]) { circle(g, cx + dx * s, dy * s, r * s); fillInk(g, '#4f9a45', s * 0.035); }
    for (const [dx, dy, c] of [[-0.2, 0.6, '#ff9de0'], [0.12, 0.5, '#ffe14a'], [0.22, 0.7, '#ff9de0'], [-0.04, 0.72, '#fff']]) { circle(g, cx + dx * s, dy * s, s * 0.045); fillInk(g, c, s * 0.02); }
    return;
  }
  rrect(g, cx - s * 0.06, s * 0.55, s * 0.12, s * 0.36, s * 0.04); fillInk(g, '#8a5a34', s * 0.03);
  const leaf = v === 0 ? ['#5fbf54', '#3f9440'] : ['#7ac85a', '#4a9a3c'];
  for (const [dx, dy, r] of [[-0.2, 0.42, 0.2], [0.2, 0.42, 0.2], [0, 0.28, 0.25], [0, 0.48, 0.22]]) {
    circle(g, cx + dx * s, dy * s, r * s); g.fillStyle = lg(g, 0, (dy - r) * s, 0, (dy + r) * s, [[0, leaf[0]], [1, leaf[1]]]); g.fill(); g.lineWidth = s * 0.03; g.strokeStyle = OUT; g.stroke();
  }
  circle(g, cx - s * 0.08, s * 0.22, s * 0.06); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fill();
  if (v === 1) for (const [dx, dy] of [[-0.15, 0.4], [0.12, 0.3], [0.2, 0.48]]) { circle(g, cx + dx * s, dy * s, s * 0.035); fillInk(g, '#ff6a6a', s * 0.015); }
}
function drawGround(t) {
  const x0 = cam.x + view.vx, y0 = cam.y + view.vy, x1 = x0 + view.vw, y1 = y0 + view.vh;
  g.fillStyle = '#5fae54'; g.fillRect(x0 - 2, y0 - 2, view.vw + 4, view.vh + 4);
  g.fillStyle = '#549d4a';
  for (let gx = Math.floor(x0 / 90) * 90; gx < x1; gx += 90) for (let gy = Math.floor(y0 / 90) * 90; gy < y1; gy += 90) {
    const h = (gx * 31 + gy * 17) & 63; circle(g, gx + h, gy + (h * 3 & 63), 6 + (h & 7)); g.fill();
  }
  // woodland around the shop (only visible on wide screens)
  for (let gx = Math.floor(x0 / 170) * 170; gx < x1 + 170; gx += 170) for (let gy = Math.floor(y0 / 190) * 190; gy < y1 + 190; gy += 190) {
    const h = ((gx * 73856093) ^ (gy * 19349663)) >>> 0;
    const x = gx + (h % 70), y = gy + ((h >> 8) % 80);
    if (x > -40 && x < WW + 40 && y > -60) continue;   // keep the shop and its sign clear
    const v = (h >> 16) % 3, sz = v === 2 ? 90 : 140 + (h >> 4) % 30;
    g.drawImage(sprite('wood' + v, px(sz), (g2, s2) => drawWoodland(g2, s2, v)), x - sz / 2, y - sz * 0.85, sz, sz);
  }
  // shop floor tiles
  const fx0 = 30, fy0 = 120, fx1 = WW - 30, fy1 = WH - 60, T = 80;
  rrect(g, fx0 - 8, fy0 - 8, fx1 - fx0 + 16, fy1 - fy0 + 16, 26); g.fillStyle = '#8a5a34'; g.fill();
  g.save(); rrect(g, fx0, fy0, fx1 - fx0, fy1 - fy0, 20); g.clip();
  const ta = Math.max(fx0, Math.floor((x0 - fx0) / T) * T + fx0), tb = Math.max(fy0, Math.floor((y0 - fy0) / T) * T + fy0);
  for (let tx = ta; tx < Math.min(fx1, x1); tx += T) for (let ty = tb; ty < Math.min(fy1, y1); ty += T) {
    const k = (Math.round((tx - fx0) / T) + Math.round((ty - fy0) / T)) & 1;
    g.fillStyle = k ? '#f6e2bf' : '#ecd2a6'; g.fillRect(tx, ty, T, T);
  }
  // carpet from the door to the register
  g.fillStyle = '#c0405a'; g.fillRect(DOOR.x - 50, 1150, 100, WH);
  g.fillStyle = '#e0607a'; g.fillRect(DOOR.x - 38, 1150, 76, WH);
  g.strokeStyle = '#ffd23f'; g.lineWidth = 4; g.setLineDash([14, 10]); g.beginPath(); g.moveTo(DOOR.x - 30, 1160); g.lineTo(DOOR.x - 30, WH); g.moveTo(DOOR.x + 30, 1160); g.lineTo(DOOR.x + 30, WH); g.stroke(); g.setLineDash([]);
  g.restore();
  // back wall with windows
  rrect(g, fx0 - 8, 40, fx1 - fx0 + 16, 110, 18); g.fillStyle = lg(g, 0, 40, 0, 150, [[0, '#8a5ab8'], [1, '#5f3a8a']]); g.fill(); g.lineWidth = 6; g.strokeStyle = OUT; g.stroke();
  for (let k = 0; k < 5; k++) {
    const wx = 110 + k * 195;
    rrect(g, wx - 40, 58, 80, 70, 36); g.fillStyle = lg(g, 0, 58, 0, 128, [[0, '#2a2060'], [1, '#5a4aa8']]); g.fill(); g.lineWidth = 4; g.stroke();
    sparkle(g, wx - 12, 80, 6, '#fff6c8'); sparkle(g, wx + 16, 98, 4, '#fff6c8');
    g.beginPath(); g.moveTo(wx, 58); g.lineTo(wx, 128); g.moveTo(wx - 40, 96); g.lineTo(wx + 40, 96); g.lineWidth = 4; g.stroke();
  }
  // shop sign
  rrect(g, WW / 2 - 150, 14, 300, 54, 20); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 5; g.strokeStyle = OUT; g.stroke();
  text(g, 'MAGIC MARKET', WW / 2, 42, 32, '#7a3aa8', { stroke: '#fff8ee', lw: 6 });
  // door gap
  rrect(g, DOOR.x - 70, WH - 70, 140, 40, 10); g.fillStyle = '#c0405a'; g.fill();
  // floor decals: cashier spot
  const cs = hasCashier() ? 0 : 0.5 + 0.5 * Math.sin(t * 4);
  ellipse(g, CASH.x, CASH.y + 10, 58, 26); g.fillStyle = `rgba(255,214,63,${0.25 + cs * 0.25})`; g.fill(); g.lineWidth = 4; g.strokeStyle = 'rgba(200,140,20,0.8)'; g.setLineDash([10, 8]); g.stroke(); g.setLineDash([]);
}

function drawPad(b, t) {
  const paid = P.paid[b.id] || 0, k = paid / b.cost, s = 124, x = b.x - s / 2, y = b.y - s / 2;
  const near = Math.hypot(G.player.x - b.x, G.player.y - b.y) < 66;
  const pulse = near ? 1.06 : 1 + 0.02 * Math.sin(t * 4);
  g.save(); g.translate(b.x, b.y); g.scale(pulse, pulse); g.translate(-b.x, -b.y);
  rrect(g, x, y, s, s, 22); g.fillStyle = 'rgba(255,255,255,0.28)'; g.fill();
  if (k > 0) { g.save(); rrect(g, x, y, s, s, 22); g.clip(); g.fillStyle = 'rgba(80,220,100,0.55)'; g.fillRect(x, y + s * (1 - k), s, s * k); g.restore(); }
  rrect(g, x, y, s, s, 22); g.lineWidth = 5; g.strokeStyle = '#fff'; g.setLineDash([16, 10]); g.lineDashOffset = -t * 20; g.stroke(); g.setLineDash([]);
  g.globalAlpha = 0.75;
  const ic = 74;
  if (b.kind === 'gen') g.drawImage(generatorSprite(LINES[b.line].gen, px(ic)), b.x - ic / 2, b.y - ic / 2 - 14, ic, ic);
  else if (b.kind === 'stand') g.drawImage(itemSprite(LINES[b.line].chain, LINES[b.line].tier, px(ic)), b.x - ic / 2, b.y - ic / 2 - 14, ic, ic);
  else if (b.kind === 'cashier') g.drawImage(customerSprite('owl', px(ic)), b.x - ic / 2, b.y - ic / 2 - 14, ic, ic);
  else g.drawImage(starIcon(px(ic * 0.8)), b.x - ic * 0.4, b.y - ic * 0.4 - 14, ic * 0.8, ic * 0.8);
  g.globalAlpha = 1;
  const label = fmt(b.cost - paid);
  g.font = `800 26px "Arial Rounded MT Bold",system-ui`;
  const gw = 34 + g.measureText(label).width, gx = b.x - gw / 2;
  g.drawImage(coinIcon(px(30)), gx, b.y + 25, 30, 30);
  text(g, label, gx + 34, b.y + 41, 26, '#fff', { align: 'left' });
  g.restore();
  text(g, b.name, b.x, b.y - s / 2 - 16, 18, '#fff', { lw: 5 });
}

function drawProducer(p, t) {
  const l = LINES[p.i], sz = 150;
  ellipse(g, p.x, p.y + 26, 76, 18); g.fillStyle = 'rgba(40,20,60,0.22)'; g.fill();
  const wob = p.stock < prodMax() ? 1 + 0.025 * Math.sin(t * 5 + p.i) : 1;
  g.save(); g.translate(p.x, p.y + 30); g.scale(1 / wob, wob);
  g.drawImage(generatorSprite(l.gen, px(sz)), -sz / 2, -sz + 6, sz, sz);
  g.restore();
  // harvest mat with stock
  ellipse(g, p.x, p.y + 78, 64, 24); g.fillStyle = 'rgba(255,248,230,0.8)'; g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(120,80,40,0.5)'; g.stroke();
  const is = 34, spr = itemSprite(l.chain, l.tier, px(is));
  for (let k = 0; k < p.stock; k++) {
    let row = 0, idx = k, n = 5;
    while (idx >= n && n > 1) { idx -= n; row++; n--; }
    const ix = p.x + (idx - (n - 1) / 2) * 26, iy = p.y + 84 - row * 16;
    g.drawImage(spr, ix - is / 2, iy - is / 2, is, is);
  }
  if (p.stock < prodMax()) {
    const k = p.t / growEvery(p.i);
    g.beginPath(); g.arc(p.x + 66, p.y - 74, 14, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.lineWidth = 7; g.strokeStyle = l.color; g.stroke();
    circle(g, p.x + 66, p.y - 74, 14); g.lineWidth = 2; g.strokeStyle = 'rgba(43,26,61,0.4)'; g.stroke();
  } else text(g, 'FULL', p.x + 60, p.y - 74, 16, '#fff', { lw: 4 });
}

function drawStand(s, t) {
  const l = LINES[s.i], sz = 200;
  ellipse(g, s.x, s.y + 36, 92, 16); g.fillStyle = 'rgba(40,20,60,0.22)'; g.fill();
  g.drawImage(standSprite(s.i, px(sz)), s.x - sz / 2, s.y - 150, sz, sz);
  const is = 30, spr = itemSprite(l.chain, l.tier, px(is));
  for (let k = 0; k < s.stock; k++) {
    const row = k < 6 ? 0 : 1, idx = k % 6;
    g.drawImage(spr, s.x - 62 + idx * 25 - is / 2 + row * 12, s.y - 30 - row * 12 - is / 2, is, is);
  }
  // price tag
  rrect(g, s.x - 34, s.y + 2, 68, 30, 10); g.fillStyle = '#fff8ee'; g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
  g.drawImage(coinIcon(px(22)), s.x - 30, s.y + 6, 22, 22);
  text(g, String(priceOf(s.i)), s.x + 10, s.y + 18, 18, '#7a3aa8', { stroke: false });
  if (s.stock === 0) {
    const a = 0.6 + 0.4 * Math.sin(t * 6);
    g.globalAlpha = a; text(g, 'EMPTY', s.x, s.y - 40, 20, '#ff6b81', { lw: 5 }); g.globalAlpha = 1;
  }
}

function drawCounter(t) {
  const sz = 220;
  if (hasCashier()) {
    const by = Math.sin(t * 3) * 3;
    ellipse(g, CASH.x, CASH.y + 26, 34, 18); g.fillStyle = '#7a5030'; g.fill();
    g.drawImage(customerSprite('owl', px(84)), CASH.x - 42, CASH.y - 62 + by, 84, 84);
  }
  ellipse(g, REG.x, REG.y + 40, 104, 16); g.fillStyle = 'rgba(40,20,60,0.22)'; g.fill();
  g.drawImage(counterSprite(px(sz)), REG.x - sz / 2, REG.y - 150, sz, sz);
  if (G.checkT > 0) {
    const k = Math.min(1, G.checkT / (G.playerCashier ? 0.42 : 0.75));
    g.beginPath(); g.arc(REG.x - 50, REG.y - 70, 16, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.lineWidth = 7; g.strokeStyle = '#4cc35a'; g.stroke();
  }
}

function drawPile(t) {
  ellipse(g, PILE.x, PILE.y + 14, 50, 16); g.fillStyle = 'rgba(40,20,60,0.18)'; g.fill();
  rrect(g, PILE.x - 46, PILE.y - 12, 92, 30, 12); g.fillStyle = '#8a5a34'; g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
  if (G.pile <= 0) return;
  const n = Math.min(18, Math.ceil(G.pile / 4)), cs = 30;
  for (let k = 0; k < n; k++) {
    const col = k % 3, row = Math.floor(k / 3);
    g.drawImage(coinIcon(px(cs)), PILE.x - 34 + col * 24 - cs / 2 + 12 + (row % 2) * 6, PILE.y - 8 - row * 9 - cs / 2, cs, cs);
  }
  text(g, fmt(G.pile), PILE.x, PILE.y - 30 - Math.ceil(n / 3) * 9 + Math.sin(t * 4) * 3, 22, '#ffe680');
}

function drawDecor(id, t) {
  const d = DECOR[id];
  if (id === 'lanterns') {
    for (const [dx, dy] of [[-40, -60], [30, 0], [-20, 70]]) {
      const x = d.x + dx, y = d.y + dy;
      rrect(g, x - 4, y - 90, 8, 96, 3); fillInk(g, '#4a3a5a', 3);
      const gl = 0.7 + 0.3 * Math.sin(t * 3 + dx);
      circle(g, x, y - 98, 30); g.fillStyle = `rgba(255,220,120,${0.25 * gl})`; g.fill();
      rrect(g, x - 13, y - 112, 26, 28, 8); fillInk(g, `rgba(255,${200 + 40 * gl},120,1)`, 3);
    }
  } else if (id === 'fountain') {
    ellipse(g, d.x, d.y + 10, 90, 40); fillInk(g, '#b8b0c8', 4);
    ellipse(g, d.x, d.y + 4, 74, 30); g.fillStyle = lg(g, 0, d.y - 26, 0, d.y + 34, [[0, '#8ae0ff'], [1, '#3aa8d8']]); g.fill();
    rrect(g, d.x - 10, d.y - 60, 20, 64, 6); fillInk(g, '#d6d0e4', 4);
    for (let k = 0; k < 6; k++) { const a = t * 2 + k; circle(g, d.x + Math.cos(a) * 30 * ((t + k * 0.3) % 1), d.y - 60 + ((t * 2 + k * 0.4) % 1) * 60, 4); g.fillStyle = '#e8fbff'; g.fill(); }
    circle(g, d.x, d.y - 66, 12); fillInk(g, '#9adfff', 3);
  } else if (id === 'garden') {
    rrect(g, d.x - 100, d.y - 30, 200, 70, 30); fillInk(g, '#7a4a28', 4);
    rrect(g, d.x - 92, d.y - 24, 184, 56, 26); g.fillStyle = '#5a3a20'; g.fill();
    const cols = ['#ff6b9d', '#ffd23f', '#9a6cff', '#ff8a5c', '#5ad0ff'];
    for (let k = 0; k < 9; k++) {
      const x = d.x - 76 + k * 19, y = d.y - 6 + (k % 2) * 16, sw = Math.sin(t * 2 + k) * 2;
      g.beginPath(); g.moveTo(x, y + 10); g.lineTo(x + sw, y - 12); g.strokeStyle = '#3a8a3a'; g.lineWidth = 4; g.stroke();
      for (let q = 0; q < 5; q++) { circle(g, x + sw + Math.cos(q * 1.26) * 7, y - 14 + Math.sin(q * 1.26) * 7, 5); g.fillStyle = cols[k % 5]; g.fill(); }
      circle(g, x + sw, y - 14, 4); g.fillStyle = '#fff6a8'; g.fill();
    }
  } else if (id === 'statue') {
    rrect(g, d.x - 44, d.y - 30, 88, 50, 10); fillInk(g, '#c8c0d8', 4);
    g.save(); g.translate(d.x, d.y - 72); g.rotate(Math.sin(t) * 0.08);
    star(g, 0, 0, 52); fillInk(g, lg(g, 0, -52, 0, 52, [[0, '#fff3a0'], [1, '#ff9f1c']]), 5);
    face(g, 0, 4, 5);
    g.restore();
    sparkle(g, d.x + 50, d.y - 140 + Math.sin(t * 3) * 6, 9, '#fff6c8');
  }
}

function drawCustomer(c, t) {
  const bob = c.walking ? Math.abs(Math.sin(c.ph)) * 6 : Math.sin(c.ph * 0.3) * 1.5;
  ellipse(g, c.x, c.y + 4, 26, 9); g.fillStyle = 'rgba(40,20,60,0.25)'; g.fill();
  if (c.vip) { ellipse(g, c.x, c.y + 4, 40, 14); g.lineWidth = 4; g.strokeStyle = `rgba(255,214,63,${0.6 + 0.4 * Math.sin(t * 6)})`; g.stroke(); }
  const body = { cat: '#f08a3c', frog: '#4aa83a', ghost: '#c8c0f0', knight: '#8a98b0', owl: '#7a5030', slime: '#3fa8e0', pumpkin: '#e86a10', fox: '#e8641c' }[c.look];
  ellipse(g, c.x, c.y - 18 - bob * 0.5, 24, 24); fillInk(g, body, 3.5);
  const hs = 78;
  g.save(); g.translate(c.x, c.y - 54 - bob);
  if (c.face < 0) g.scale(-1, 1);
  g.drawImage(customerSprite(c.look, px(hs), c.mood), -hs / 2, -hs / 2 - 6, hs, hs);
  g.restore();
  if (c.vip) text(g, 'VIP', c.x + 30, c.y - 94 - bob, 16, '#ffe14a', { lw: 4 });
  // wants bubble
  const left = c.want.slice(c.got.length);
  if (c.state === 'shop' && left.length) {
    const n = Math.min(3, left.length), bw = 18 + n * 34, by = c.y - 128 - bob;
    rrect(g, c.x - bw / 2, by - 22, bw, 44, 16); g.fillStyle = c.mood === 'sad' ? '#ffd0d6' : '#fff'; g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.moveTo(c.x - 8, by + 21); g.lineTo(c.x, by + 32); g.lineTo(c.x + 8, by + 21); g.fillStyle = c.mood === 'sad' ? '#ffd0d6' : '#fff'; g.fill(); g.stroke();
    for (let k = 0; k < n; k++) { const l = LINES[left[k]]; g.drawImage(itemSprite(l.chain, l.tier, px(32)), c.x - bw / 2 + 9 + k * 34, by - 16, 32, 32); }
    if (left.length > 3) text(g, '+' + (left.length - 3), c.x + bw / 2 + 4, by, 16, '#fff', { align: 'left', lw: 4 });
  } else if (c.state === 'queue') {
    // basket of what they bought
    const n = Math.min(4, c.got.length);
    for (let k = 0; k < n; k++) { const l = LINES[c.got[k]]; g.drawImage(itemSprite(l.chain, l.tier, px(24)), c.x - n * 10 + k * 20 - 12 + 6, c.y - 36 - bob, 24, 24); }
  }
}

function drawPlayer(t) {
  const pl = G.player, sz = 120;
  const bob = pl.moving ? Math.abs(Math.sin(t * 12)) * 7 : Math.sin(t * 2) * 1.5;
  ellipse(g, pl.x, pl.y + 4, 30, 10); g.fillStyle = 'rgba(40,20,60,0.3)'; g.fill();
  g.save(); g.translate(pl.x, pl.y - bob);
  if (pl.face < 0) g.scale(-1, 1);
  g.drawImage(witchSprite(px(sz)), -sz / 2, -sz + 4, sz, sz);
  g.restore();
  // carried stack above the hat
  const is = 34, sway = pl.moving ? -pl.face * 1.8 : 0;
  pl.stack.forEach((li, k) => {
    const l = LINES[li];
    g.drawImage(itemSprite(l.chain, l.tier, px(is)), pl.x - is / 2 + sway * k + Math.sin(t * 3 + k * 0.5) * k * 0.3, pl.y - sz - 6 - k * 15 - bob - is / 2, is, is);
  });
  if (pl.stack.length >= cap()) text(g, 'MAX', pl.x, pl.y - sz - 26 - pl.stack.length * 15 - bob, 18, '#ff6b81', { lw: 5 });
}

function drawWorld(t) {
  drawGround(t);
  for (const b of activePads()) drawPad(b, t);
  const list = [];
  G.prods.forEach(p => { if (genBuilt(p.i)) list.push([p.y + 40, () => drawProducer(p, t)]); });
  G.stands.forEach(s => { if (standBuilt(s.i)) list.push([s.y + 10, () => drawStand(s, t)]); });
  list.push([REG.y + 10, () => drawCounter(t)]);
  list.push([PILE.y, () => drawPile(t)]);
  for (const id of Object.keys(DECOR)) if (isBuilt(id)) list.push([DECOR[id].y + 20, () => drawDecor(id, t)]);
  for (const c of G.customers) list.push([c.y, () => drawCustomer(c, t)]);
  list.push([G.player.y, () => drawPlayer(t)]);
  list.sort((a, b) => a[0] - b[0]);
  for (const [, fn] of list) fn();
  for (const b of G.bats) {
    const y = b.y - 70 + Math.sin(b.ph * 0.3) * 6;
    ellipse(g, b.x, b.y + 4, 16, 6); g.fillStyle = 'rgba(40,20,60,0.18)'; g.fill();
    const l = LINES[b.line], n = Math.min(3, b.carry);
    for (let k = 0; k < n; k++) g.drawImage(itemSprite(l.chain, l.tier, px(26)), b.x - 13 + (k - (n - 1) / 2) * 14, y + 14 + (k % 2) * 5, 26, 26);
    batDraw(g, b.x, y, b.ph, 0.9);
  }
  drawObjectiveArrow(t);
  drawParticles(g);
  drawTexts(g);
}

let goal = null;
function drawObjectiveArrow(t) {
  goal = popup ? null : objective();
  if (!goal || goal.soft) return;
  const r = 1 + 0.08 * Math.sin(t * 6);
  ellipse(g, goal.x, goal.y, 56 * r, 22 * r); g.lineWidth = 5; g.strokeStyle = 'rgba(255,225,74,0.9)'; g.stroke();
  const y = goal.y - (goal.pad ? 118 : 74) + Math.sin(t * 6) * 8;
  g.save(); g.translate(goal.x, y); g.scale(0.8, 0.8);
  g.beginPath(); g.moveTo(-16, -30); g.lineTo(16, -30); g.lineTo(16, 0); g.lineTo(30, 0); g.lineTo(0, 30); g.lineTo(-30, 0); g.lineTo(-16, 0); g.closePath();
  fillInk(g, '#ffe14a', 5);
  g.restore();
}

// ---------- HUD ----------
const buttons = [];
let layer = 0;
const press = { id: null, b: null };
let baseInv = null;   // inverse of the frame's base transform, set each frame
function reg(id, x, y, w, h, onTap) {
  if (baseInv) {   // map through any popup/pulse scaling so hit boxes match what is drawn
    const m = baseInv.multiply(g.getTransform());
    const x0 = m.a * x + m.c * y + m.e, y0 = m.b * x + m.d * y + m.f;
    const x1 = m.a * (x + w) + m.c * (y + h) + m.e, y1 = m.b * (x + w) + m.d * (y + h) + m.f;
    x = Math.min(x0, x1); y = Math.min(y0, y1); w = Math.abs(x1 - x0); h = Math.abs(y1 - y0);
  }
  buttons.push({ id, x, y, w, h, onTap, layer });
}
function hitButton(x, y) {
  // buttons are rebuilt each frame: two taps between frames must not hit a popup button that is already gone
  const want = popup ? 1 : 0;
  for (let k = buttons.length - 1; k >= 0; k--) {
    const b = buttons[k];
    if (b.layer === want && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}
function button(id, x, y, w, h, label, onTap, o = {}) {
  const down = press.id === id, base = o.disabled ? '#9a8fa8' : (o.color || '#4cc35a');
  g.save();
  if (o.pulse && !o.disabled) { const s = 1 + 0.045 * Math.sin(performance.now() / 140); g.translate(x + w / 2, y + h / 2); g.scale(s, s); g.translate(-(x + w / 2), -(y + h / 2)); }
  const dy = down ? 4 : 0, r = Math.min(h / 2, 24);
  rrect(g, x, y + 6, w, h, r); g.fillStyle = shade(base, -0.4); g.fill(); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke();
  rrect(g, x, y + dy, w, h, r); g.fillStyle = lg(g, 0, y, 0, y + h, [[0, shade(base, 0.3)], [1, base]]); g.fill(); g.stroke();
  rrect(g, x + 10, y + dy + 5, w - 20, h * 0.3, h * 0.15); g.fillStyle = 'rgba(255,255,255,0.32)'; g.fill();
  let tx = x + w / 2;
  if (o.icon) { const iw = h * 0.6; g.drawImage(o.icon, x + 12, y + dy + (h - iw) / 2, iw, iw); tx += iw * 0.42; }
  text(g, label, tx, y + dy + h / 2 + 1, o.size || Math.min(30, h * 0.48), '#fff');
  g.restore();
  if (!o.disabled) reg(id, x, y, w, h + 6, onTap);
}
function pill(x, y, w, h) {
  rrect(g, x, y + 4, w, h, h / 2); g.fillStyle = 'rgba(15,5,30,0.45)'; g.fill();
  rrect(g, x, y, w, h, h / 2); g.fillStyle = 'rgba(43,26,61,0.88)'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#140a24'; g.stroke();
}
function speaker(x, y, r, muted) {
  g.save(); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - r * 0.5, y - r * 0.2); g.lineTo(x - r * 0.25, y - r * 0.2); g.lineTo(x + r * 0.1, y - r * 0.5); g.lineTo(x + r * 0.1, y + r * 0.5); g.lineTo(x - r * 0.25, y + r * 0.2); g.lineTo(x - r * 0.5, y + r * 0.2); g.closePath(); g.fill();
  g.beginPath();
  if (muted) { g.moveTo(x + r * 0.25, y - r * 0.25); g.lineTo(x + r * 0.6, y + r * 0.25); g.moveTo(x + r * 0.6, y - r * 0.25); g.lineTo(x + r * 0.25, y + r * 0.25); }
  else { g.arc(x + r * 0.15, y, r * 0.3, -0.9, 0.9); g.moveTo(x + r * 0.15 + r * 0.55 * Math.cos(-0.9), y + r * 0.55 * Math.sin(-0.9)); g.arc(x + r * 0.15, y, r * 0.55, -0.9, 0.9); }
  g.stroke(); g.restore();
}
function canAffordSomething() {
  if (Object.keys(UPG).some(k => P.upg[k] < UPG[k].max && P.coins >= upgCost(k))) return true;
  return LINES.some((_, i) => !P.helpers[i] && helperOk(i) && P.coins >= HELPER_COST[i]);
}
function drawHUD(t) {
  const L = hudL, R = hudR, T = hudT, B = hudB;
  pill(L + 16, T + 18, 220, 54);
  const cs = 1 + bump.coins * 0.3;
  g.save(); g.translate(L + 46, T + 45); g.scale(cs, cs); g.drawImage(coinIcon(px(54)), -27, -27, 54, 54); g.restore();
  text(g, fmt(dispCoins), L + 145, T + 47, 30, '#ffe680');
  if (P.stars > 0) {
    pill(L + 16, T + 80, 120, 44);
    g.drawImage(starIcon(px(40)), L + 24, T + 82, 40, 40);
    text(g, String(P.stars), L + 92, T + 103, 24, '#ffe680');
  }
  if (G.rush > 0) {
    pill(L + 250, T + 20, 190, 50);
    const rs = Math.ceil(G.rush);
    text(g, `2x  ${Math.floor(rs / 60)}:${String(rs % 60).padStart(2, '0')}`, L + 345, T + 46, 26, '#9dff8a');
  }
  const down = press.id === 'mute';
  circle(g, R - 44, T + 47, 28); g.fillStyle = '#4a2c8a'; g.fill(); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke();
  circle(g, R - 44, T + 43 + (down ? 3 : 0), 28); g.fillStyle = lg(g, 0, T + 15, 0, T + 71, [[0, '#9a7cf0'], [1, '#6b4cc6']]); g.fill(); g.stroke();
  speaker(R - 44, T + 43 + (down ? 3 : 0), 26, P.muted);
  reg('mute', R - 72, T + 15, 56, 60, () => { P.muted = !P.muted; setMuted(P.muted); saveProfile(); });
  // goal strip
  if (goal) {
    g.font = `800 22px "Arial Rounded MT Bold",system-ui`;
    const w = Math.min(680, g.measureText(goal.text).width + 60);
    // wide screens: goal sits in the top bar, clear of the shop sign, between the coin/rush pills and the mute button;
    // on barely-wide windows where it does not fit there it drops below them as in portrait
    let gx = (L + R) / 2, gy = T + 92;
    if (land) {
      const a = L + (G.rush > 0 ? 452 : 248), b = R - 84;
      if (b - a >= w) { gx = Math.max(a + w / 2, Math.min(b - w / 2, (L + R) / 2)); gy = T + 22; }
    }
    rrect(g, gx - w / 2, gy, w, 44, 22); g.fillStyle = 'rgba(255,248,238,0.94)'; g.fill(); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke();
    text(g, goal.text, gx, gy + 23, 22, '#5a2f8a', { stroke: false });
    // edge pointer when the target is off screen
    const p = toStage(goal.x, goal.y);
    const m = 60, lx = view.vx + m, rx = view.vx + view.vw - m, ty = land ? gy + 88 : gy + 78, by = B - 160;
    if (p.x < lx || p.x > rx || p.y < ty || p.y > by) {
      const cx = Math.max(lx, Math.min(rx, p.x)), cy = Math.max(ty, Math.min(by, p.y));
      const a = Math.atan2(p.y - cy, p.x - cx) || Math.atan2(p.y - SH / 2, p.x - 360);
      g.save(); g.translate(cx, cy); g.rotate(a);
      g.beginPath(); g.moveTo(30, 0); g.lineTo(-14, -24); g.lineTo(-6, 0); g.lineTo(-14, 24); g.closePath(); fillInk(g, '#ffe14a', 4);
      g.restore();
    }
  }
  // bottom buttons
  const rushReady = G.rush <= 0;
  button('rush', L + 20, B - 118, 210, 88, rushReady ? '2x Coins' : 'Rush on!', () => {
    if (G.rush > 0) return;
    rewardedThen(() => startRush());
  }, { color: '#3aa8d8', disabled: !rushReady, icon: coinIcon(px(54)), size: 26, pulse: rushReady && Math.floor(t / 8) % 4 === 0 });
  if (rushReady && portal.hasAds) text(g, '▶ ad', L + 125, B - 40, 16, '#e8fbff', { stroke: false });
  const glow = canAffordSomething();
  button('upg', R - 230, B - 118, 210, 88, 'Upgrades', () => { popup = { type: 'upg', t0: performance.now() }; }, { color: '#e8a33c', pulse: glow, size: 26, icon: sprite('book', px(54), (g2, s) => bookIcon(s / 2, s / 2, s * 0.5, g2)) });
  if (glow) { circle(g, R - 30, B - 114, 15); fillInk(g, '#ff4d7a', 3); text(g, '!', R - 30, B - 113, 20, '#fff', { stroke: false }); }
}

function drawJoystick() {
  if (!joy.active) return;
  g.save(); g.globalAlpha = 0.55;
  circle(g, joy.ox, joy.oy, 80); g.fillStyle = 'rgba(43,26,61,0.35)'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#fff'; g.stroke();
  g.globalAlpha = 0.85;
  circle(g, joy.ox + joy.dx, joy.oy + joy.dy, 38); g.fillStyle = lg(g, 0, joy.oy + joy.dy - 38, 0, joy.oy + joy.dy + 38, [[0, '#c8a8ff'], [1, '#7a4ae0']]); g.fill(); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke();
  g.restore();
}

function drawBanner(t) {
  if (!banner) return;
  const a = t - banner.t0;
  if (a > 2.2) { banner = null; return; }
  const inK = Math.min(1, a / 0.35), outK = a > 1.8 ? (a - 1.8) / 0.4 : 0;
  g.save(); g.globalAlpha = 1 - outK;
  const s = E.outBack(inK);
  g.translate(360, SH * 0.26); g.scale(s, s);
  rrect(g, -280, -66, 560, 132, 40); g.fillStyle = 'rgba(43,26,61,0.94)'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#ffe14a'; g.stroke();
  text(g, banner.s, 0, -14, 44, '#ffe14a');
  text(g, banner.sub, 0, 32, 22, '#e6dcff', { stroke: false, weight: 700 });
  g.restore();
}

// ---------- popups ----------
function panel(x, y, w, h, title, color) {
  rrect(g, x, y + 8, w, h, 34); g.fillStyle = 'rgba(30,15,50,0.5)'; g.fill();
  rrect(g, x, y, w, h, 34); g.fillStyle = lg(g, 0, y, 0, y + h, [[0, '#fff8ee'], [1, '#f6e3c8']]); g.fill(); g.lineWidth = 6; g.strokeStyle = OUT; g.stroke();
  const rw = Math.min(w - 40, 460), rx = x + (w - rw) / 2;
  rrect(g, rx, y - 34, rw, 72, 30); g.fillStyle = lg(g, 0, y - 34, 0, y + 38, [[0, shade(color, 0.25)], [1, color]]); g.fill(); g.stroke();
  text(g, title, x + w / 2, y + 2, 40, '#fff');
}
const pause = () => { paused = true; duck(true); keys.clear(); Object.assign(joy, { active: false, dx: 0, dy: 0 }); press.id = null; press.b = null; };   // ad overlays swallow key/finger releases
const resume = () => { paused = false; duck(false); };
function rewardedThen(fn) {
  portal.rewarded(pause, resume).then(ok => { if (ok) fn(); else toast = { s: 'No reward this time', t0: nowS() }; });
}
const adLabel = portal.hasAds ? 'Watch ad' : 'Free';
const UPG_ICON = {
  carry: (x, y) => { const l = LINES[0]; for (let k = 0; k < 3; k++) g.drawImage(itemSprite(l.chain, l.tier, px(36)), x - 18, y - 4 - k * 14, 36, 36); },
  speed: (x, y) => { g.save(); g.translate(x, y); rrect(g, -14, -24, 22, 36, 8); fillInk(g, '#9a6cff', 3); rrect(g, -20, 6, 40, 16, 8); fillInk(g, '#7a4ae0', 3); g.strokeStyle = '#3aa8d8'; g.lineWidth = 4; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-26 - k * 4, -14 + k * 10); g.lineTo(-38 - k * 4, -14 + k * 10); g.stroke(); } g.restore(); },
  grow: (x, y) => g.drawImage(generatorSprite('basket', px(56)), x - 28, y - 30, 56, 56),
  price: (x, y) => { g.save(); g.translate(x, y); g.rotate(-0.3); rrect(g, -22, -14, 44, 28, 6); fillInk(g, '#ffe14a', 3); circle(g, -14, 0, 4); g.fillStyle = OUT; g.fill(); text(g, '$', 6, 1, 20, '#7a3aa8', { stroke: false }); g.restore(); },
};
function drawPopup(t) {
  if (!popup) return;
  layer = 1;
  const age = (performance.now() - popup.t0) / 1000;
  g.fillStyle = `rgba(14,6,28,${0.66 * Math.min(1, age / 0.2)})`;
  g.fillRect(view.vx - 2, view.vy - 2, view.vw + 4, view.vh + 4);
  reg('blocker', view.vx, view.vy, view.vw, view.vh, () => {});
  const s = E.outBack(Math.min(1, age / 0.35));
  // popups are laid out on the 720x1280 stage; in landscape shrink tall ones to fit
  const fitK = popup.type === 'upg' ? Math.min(1, (SH / 2 - 16) / 548) : Math.min(1, (SH / 2 - 16) / 300);
  g.save(); g.translate(360, SH / 2); g.scale(s * fitK, s * fitK); g.translate(-360, -640);
  const p = popup;
  if (p.type === 'upg') {
    const y = 130, h = 1040;
    panel(30, y, 660, h, 'Upgrades', '#e8a33c');
    let ry = y + 64;
    for (const k of Object.keys(UPG)) {
      const u = UPG[k], lv = P.upg[k], maxed = lv >= u.max, c = upgCost(k);
      rrect(g, 54, ry, 612, 96, 20); g.fillStyle = 'rgba(122,58,168,0.08)'; g.fill();
      UPG_ICON[k](104, ry + 50);
      text(g, u.name, 150, ry + 30, 26, '#5a2f8a', { stroke: false, align: 'left' });
      text(g, maxed ? 'Fully upgraded!' : u.desc(lv), 150, ry + 64, 18, '#8a6aa0', { stroke: false, weight: 700, align: 'left' });
      for (let q = 0; q < u.max; q++) { circle(g, 152 + q * 16, ry + 86, 5); g.fillStyle = q < lv ? '#4cc35a' : 'rgba(90,47,138,0.2)'; g.fill(); }
      if (!maxed) button('u-' + k, 470, ry + 16, 180, 64, fmt(c), () => { if (buyUpgrade(k)) sfx.serve(); else sfx.error(); }, { color: '#43b94f', icon: coinIcon(px(48)), disabled: P.coins < c, size: 26 });
      ry += 108;
    }
    text(g, 'Bat Helpers  —  they carry stock for you', 360, ry + 20, 22, '#5a2f8a', { stroke: false });
    ry += 46;
    LINES.forEach((l, i) => {
      const ok = helperOk(i), hired = P.helpers[i], c = HELPER_COST[i];
      rrect(g, 54, ry, 612, 84, 20); g.fillStyle = ok ? 'rgba(122,58,168,0.08)' : 'rgba(90,80,100,0.08)'; g.fill();
      g.globalAlpha = ok ? 1 : 0.45;
      batDraw(g, 100, ry + 40, t * 14 + i, 0.85);
      g.drawImage(itemSprite(l.chain, l.tier, px(34)), 126, ry + 34, 34, 34);
      text(g, `${l.name} Bat`, 176, ry + 30, 24, '#5a2f8a', { stroke: false, align: 'left' });
      text(g, hired ? 'Working hard!' : ok ? 'Fills the stand by itself' : `Build the ${l.name} stand first`, 176, ry + 60, 17, '#8a6aa0', { stroke: false, weight: 700, align: 'left' });
      g.globalAlpha = 1;
      if (hired) text(g, '✓ Hired', 560, ry + 42, 24, '#43b94f', { stroke: false });
      else if (ok) button('h-' + i, 470, ry + 10, 180, 62, fmt(c), () => { if (hireHelper(i)) sfx.serve(); else sfx.error(); }, { color: '#9a6cff', icon: coinIcon(px(46)), disabled: P.coins < c, size: 26 });
      ry += 94;
    });
    button('u-x', 260, y + h - 76, 200, 56, 'Close', () => { popup = null; }, { color: '#9a7cf0', size: 26 });
  } else if (p.type === 'offline') {
    const y = 380, h = 520;
    panel(110, y, 500, h, 'Welcome back!', '#ff7ac0');
    customerSprite('owl', px(120));
    g.drawImage(customerSprite('owl', px(120)), 300, y + 60, 120, 120);
    text(g, 'Your owl kept the shop open', 360, y + 210, 24, '#5a2f8a', { stroke: false });
    g.drawImage(coinIcon(px(60)), 250, y + 240, 60, 60);
    text(g, `+${fmt(p.n)}`, 320, y + 271, 44, '#e69a00', { align: 'left' });
    button('o-2x', 160, y + 330, 400, 70, `${adLabel}  x2`, () => rewardedThen(() => { if (popup !== p) return; P.pendingOff = 0; gain(p.n * 2); popup = null; }), { color: '#3aa8d8' });
    button('o-1x', 210, y + 420, 300, 62, 'Collect', () => { if (popup !== p) return; P.pendingOff = 0; gain(p.n); popup = null; }, { color: '#43b94f' });
  }
  g.restore();
}
let toast = null;
function drawToast(t) {
  if (!toast) return;
  const a = t - toast.t0;
  if (a > 2) { toast = null; return; }
  g.save(); g.globalAlpha = Math.min(1, (2 - a) / 0.4);
  g.font = `800 24px "Arial Rounded MT Bold",system-ui`;
  const w = g.measureText(toast.s).width + 56, y = hudB - 190;
  rrect(g, 360 - w / 2, y, w, 48, 24); g.fillStyle = 'rgba(43,26,61,0.94)'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#ffb3b3'; g.stroke();
  text(g, toast.s, 360, y + 25, 24, '#ffd6d6', { stroke: false });
  g.restore();
}
function gain(n) {
  holdCoins += n; addCoins(n); saveProfile();
  flyCoins(360, SH / 2, n, 8);
}
function flyCoins(x, y, amount, n = 5) {
  n = Math.max(1, Math.min(n, amount));
  let left = amount;
  for (let k = 0; k < n; k++) {
    const share = k === n - 1 ? left : Math.floor(amount / n); left -= share;
    fly(x, y, hudL + 46, hudT + 45, (g2, fx, fy) => g2.drawImage(coinIcon(px(40)), fx - 20, fy - 20, 40, 40), 0.55, () => {
      holdCoins -= share; bump.coins = 1; sfx.coin();
    }, k * 0.05);
  }
}

// ---------- events ----------
on((type, d) => {
  const t = nowS();
  switch (type) {
    case 'pick': sfx.pick(); break;
    case 'stock': sfx.drop(); break;
    case 'take': if (!quietFx) burst(d.st.x, d.st.y - 30, ['#fff', LINES[d.st.i].color], 5, 160, { size: 6, gravity: 300 }); break;
    case 'pay': {
      sfx.serve();
      floatText(REG.x, REG.y - 120, `+${d.pay}`, d.c.vip ? '#ffe14a' : '#9dff8a', d.c.vip ? 40 : 32);
      if (d.c.vip) burst(REG.x, REG.y - 80, ['#ffe14a', '#fff', '#ff9de0'], 22, 380, { up: 120 });
      break;
    }
    case 'collect': {
      const p = toStage(PILE.x, PILE.y);
      holdCoins += d.n; flyCoins(p.x, p.y, d.n, Math.min(8, Math.ceil(d.n / 6)));
      break;
    }
    case 'angry': floatText(d.c.x, d.c.y - 140, 'Out of stock!', '#ff8a8a', 24); sfx.error(); break;
    case 'padTick': sfx.tick(); break;
    case 'build': {
      const b = d.b;
      sfx.open(); addShake(8);
      burst(b.x, b.y - 40, ['#ffe66d', '#ff9de0', '#9dff8a', '#8ad8ff', '#fff'], 46, 560, { up: 200 });
      ring(b.x, b.y, '#fff', 120);
      banner = { s: 'New: ' + b.name + '!', sub: b.kind === 'star' ? 'Every price +25%, forever' : b.kind === 'decor' ? 'More customers, better prices' : b.kind === 'cashier' ? 'The owl runs the register now' : b.kind === 'gen' ? 'Now build its stand to sell them' : 'Customers will want these', t0: t };
      portal.happy();
      // natural break after the build celebration; skipped if the player has left or opened a menu meanwhile
      setTimeout(() => { if (!document.hidden && !paused && !popup) portal.midgame(pause, resume); }, 2400);
      break;
    }
    case 'upgrade': case 'hire': sfx.energy(); break;
    case 'rush': sfx.lucky(); banner = { s: 'Coin Rush!', sub: `All prices x2 for ${RUSH_TIME / 60} minutes`, t0: t }; break;
    case 'rushEnd': floatText(G.player.x, G.player.y - 160, 'Rush over', '#e6dcff', 26); break;
    case 'batDrop': break;
  }
});

// ---------- input ----------
function toV(e) { return { x: (e.clientX - view.ox) / view.sc, y: (e.clientY - view.oy) / view.sc }; }
let firstInput = true;
const joy = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
const keys = new Set();
cv.addEventListener('pointerdown', e => {
  unlockAudio();
  if (firstInput) { firstInput = false; setMuted(P.muted); }
  if (paused) return;
  const p = toV(e);
  const b = hitButton(p.x, p.y);
  if (b) { press.id = b.id; press.b = b; press.pid = e.pointerId; return; }
  if (popup || joy.active) return;
  Object.assign(joy, { active: true, id: e.pointerId, ox: p.x, oy: p.y, dx: 0, dy: 0 });
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
});
cv.addEventListener('pointermove', e => {
  if (!joy.active || e.pointerId !== joy.id) return;
  const p = toV(e);
  let dx = p.x - joy.ox, dy = p.y - joy.oy;
  const d = Math.hypot(dx, dy), R = 80;
  if (d > R) {   // drag the base along so direction changes stay snappy
    joy.ox += dx / d * (d - R); joy.oy += dy / d * (d - R);
    dx = dx / d * R; dy = dy / d * R;
  }
  joy.dx = dx; joy.dy = dy;
});
function endPointer(e, cancel) {
  const p = toV(e);
  if (press.id && e.pointerId === press.pid) {   // only the finger that pressed the button releases it
    const b = buttons.find(x => x.id === press.id && x.layer === press.b.layer) || press.b; press.id = null; press.b = null;
    if (!cancel && b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { if (b.id !== 'blocker') sfx.tap(); b.onTap(); }
    return;
  }
  if (joy.active && e.pointerId === joy.id) Object.assign(joy, { active: false, dx: 0, dy: 0 });
}
cv.addEventListener('pointerup', e => endPointer(e, false));
cv.addEventListener('pointercancel', e => endPointer(e, true));
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerup', () => unlockAudio());   // iOS Safari only unlocks audio on touchend/click
const KEYMAP = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd' };
const NOSCROLL = new Set(['Space', 'PageUp', 'PageDown', 'Home', 'End']);   // keep the portal page around the game still
window.addEventListener('keydown', e => {
  if (NOSCROLL.has(e.code)) e.preventDefault();
  if (paused) return;   // ad on screen: keyboard is disabled
  if (KEYMAP[e.code]) { keys.add(KEYMAP[e.code]); e.preventDefault(); unlockAudio(); if (firstInput) { firstInput = false; setMuted(P.muted); } }
  if (e.code === 'Escape' && popup && popup.type === 'upg') popup = null;
  if (e.code === 'KeyU' && !popup) popup = { type: 'upg', t0: performance.now() };
});
window.addEventListener('wheel', e => e.preventDefault(), { passive: false });
window.addEventListener('keyup', e => { if (KEYMAP[e.code]) keys.delete(KEYMAP[e.code]); });
window.addEventListener('blur', () => { keys.clear(); joy.active = false; });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { suspendAudio(true); portal.gameplayStop(); paused = true; saveProfile(); }
  else { suspendAudio(false); if (!portal.busy) paused = false; checkOffline(); }
});
window.addEventListener('pagehide', () => saveProfile());
function readInput() {
  if (window.__bot) return window.__bot();
  let x = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0), y = (keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0);
  if (x || y) { const d = Math.hypot(x, y); return { x: x / d, y: y / d }; }
  if (joy.active) return { x: joy.dx / 80, y: joy.dy / 80 };
  return { x: 0, y: 0 };
}

// ---------- loop ----------
let last = performance.now();
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
  const t = ts / 1000;
  requestAnimationFrame(frame);
  // portal gameplay = shop running with no popup, ad or hidden tab
  if (!paused && !popup && !document.hidden && !firstInput) portal.gameplayStart(); else portal.gameplayStop();
  G.input = popup ? { x: 0, y: 0 } : readInput();
  if (!paused && !popup) tick(dt);
  updateFx(dt);
  bump.coins = Math.max(0, bump.coins - dt * 4);
  dispCoins += (P.coins - holdCoins - dispCoins) * (1 - Math.exp(-dt * 10));
  if (Math.abs(P.coins - holdCoins - dispCoins) < 0.5) dispCoins = P.coins - holdCoins;
  if (dispCoins < 0) dispCoins = 0;
  const ct = camTarget(), k = 1 - Math.exp(-dt * 8);
  cam.x += (ct.x - cam.x) * k; cam.y += (ct.y - cam.y) * k;
  buttons.length = 0; layer = 0;
  g.setTransform(view.res, 0, 0, view.res, (view.ox + shake.x * view.sc) * dpr, (view.oy + shake.y * view.sc) * dpr);
  baseInv = g.getTransform().inverse();
  g.save(); g.translate(-cam.x, -cam.y);
  drawWorld(t);
  g.restore();
  drawHUD(t);
  drawJoystick();
  drawFlyers(g);
  drawBanner(t);
  drawPopup(t);
  drawToast(t);
}

// Earnings while the page was closed, or hidden in a background tab (the sim does not run there).
// Unclaimed earnings from a closed popup carry over in P.pendingOff.
let booted = false;
function checkOffline() {
  if (!booted) return;   // tab switched while the portal SDK is still loading
  const off = offlineEarnings() + (P.pendingOff || 0);
  P.pendingOff = off >= 10 ? off : 0; saveProfile();
  if (off < 10) return;
  if (popup && popup.type === 'offline') popup.n = off;
  else popup = { type: 'offline', n: off, t0: performance.now() };
}
async function boot() {
  resize();
  await portal.init();
  loadProfile();
  const q = new URLSearchParams(location.search);
  startGame();
  booted = true;
  checkOffline();
  dispCoins = P.coins;
  setMuted(P.muted);
  Object.assign(cam, camTarget());
  portal.loadingDone();
  document.getElementById('loading')?.remove();
  requestAnimationFrame(ts => { last = ts; frame(ts); });
  window.__mm = {
    G, P, tick, startGame, saveProfile, cam,
    get popup() { return popup; }, set popup(v) { popup = v; },
    openUpgrades() { popup = { type: 'upg', t0: performance.now() - 2000 }; },
    settle() { quietFx = true; banner = null; clearFx(); holdCoins = 0; dispCoins = P.coins; Object.assign(cam, camTarget()); },
  };
}
boot();
