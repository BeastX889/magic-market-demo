// Magic Market Tycoon: simulation (no drawing). World units, y grows downward.
export const WW = 1000, WH = 1560;
export const PROD_Y = 250, STAND_Y = 640;
export const REG = { x: 360, y: 1010 };        // counter centre
export const CASH = { x: 360, y: 905 };        // where the cashier stands
export const PILE = { x: 205, y: 1010 };       // coins pile up here
export const DOOR = { x: 540, y: WH - 40 };
export const QUEUE_Y = 1128;
// rows of 9 that snake back, so a long line (no owl yet) stays on the shop floor
export const queuePos = i => {
  const row = Math.floor(i / 9), col = row % 2 ? 8 - i % 9 : i % 9;
  return { x: REG.x + col * 64, y: QUEUE_Y + row * 72 + (i % 2) * 6 };
};

export const LINES = [
  { id: 'herb', chain: 'herb', tier: 3, name: 'Lucky Clover', gen: 'basket', genName: 'Clover Basket', price: 3, every: 1.3, x: 200, color: '#4cc35a' },
  { id: 'mush', chain: 'mush', tier: 3, name: 'Toadstool', gen: 'log', genName: 'Mushroom Log', price: 7, every: 1.8, x: 420, color: '#ff7a5c' },
  { id: 'potion', chain: 'potion', tier: 4, name: 'Fizzy Elixir', gen: 'cauldron', genName: 'Bubbling Cauldron', price: 15, every: 2.5, x: 640, color: '#9a6cff' },
  { id: 'crys', chain: 'crys', tier: 3, name: 'Crystal', gen: 'geode', genName: 'Crystal Geode', price: 32, every: 3.4, x: 860, color: '#3aa8d8' },
];
export const HELPER_COST = [60, 260, 900, 2600];
export const DECOR = { lanterns: { x: 880, y: 880, name: 'Fairy Lanterns' }, fountain: { x: 790, y: 1330, name: 'Wishing Fountain' }, garden: { x: 200, y: 1330, name: 'Flower Garden' }, statue: { x: 110, y: 1170, name: 'Star Statue' } };
export const BUILDS = [
  { id: 'mush-gen', kind: 'gen', line: 1, cost: 30, after: null },
  { id: 'mush-stand', kind: 'stand', line: 1, cost: 50, after: 'mush-gen' },
  { id: 'cashier', kind: 'cashier', cost: 140, after: 'mush-stand', x: 205, y: 880, name: 'Owl Cashier' },
  { id: 'potion-gen', kind: 'gen', line: 2, cost: 240, after: 'mush-stand' },
  { id: 'potion-stand', kind: 'stand', line: 2, cost: 340, after: 'potion-gen' },
  { id: 'crys-gen', kind: 'gen', line: 3, cost: 1100, after: 'potion-stand' },
  { id: 'crys-stand', kind: 'stand', line: 3, cost: 1500, after: 'crys-gen' },
  { id: 'lanterns', kind: 'decor', cost: 2500, after: 'crys-stand' },
  { id: 'fountain', kind: 'decor', cost: 5000, after: 'lanterns' },
  { id: 'garden', kind: 'decor', cost: 9000, after: 'fountain' },
  { id: 'statue', kind: 'decor', cost: 15000, after: 'garden' },
];
for (const b of BUILDS) {
  if (b.kind === 'gen') Object.assign(b, { x: LINES[b.line].x, y: PROD_Y, name: LINES[b.line].genName });
  if (b.kind === 'stand') Object.assign(b, { x: LINES[b.line].x, y: STAND_Y, name: LINES[b.line].name + ' Stand' });
  if (b.kind === 'decor') Object.assign(b, DECOR[b.id]);
}
export const UPG = {
  carry: { name: 'Bigger Bag', desc: lv => `Carry ${carryCap(lv)} → ${carryCap(lv + 1)}`, max: 8, base: 20, mult: 1.8 },
  speed: { name: 'Swift Boots', desc: lv => `Speed +${lv * 12}% → +${(lv + 1) * 12}%`, max: 6, base: 35, mult: 1.95 },
  grow: { name: 'Fertile Magic', desc: lv => `Grow ${Math.round(lv * 25)}% → ${Math.round((lv + 1) * 25)}% faster`, max: 8, base: 45, mult: 1.85 },
  price: { name: 'Fancy Labels', desc: lv => `Prices x${(1 + lv * 0.15).toFixed(2)} → x${(1 + (lv + 1) * 0.15).toFixed(2)}`, max: 10, base: 70, mult: 1.75 },
};
const carryCap = lv => 4 + lv * 2;
export const upgCost = k => Math.round(UPG[k].base * Math.pow(UPG[k].mult, P.upg[k]));
export const STAND_CAP = 12;
export const RUSH_TIME = 120;
const KEY = 'lumio-magic-market-v1';
const LOOKS = ['cat', 'frog', 'ghost', 'knight', 'owl', 'slime', 'pumpkin', 'fox'];

export const P = {};
function freshProfile() {
  return { coins: 0, built: {}, paid: {}, upg: { carry: 0, speed: 0, grow: 0, price: 0 }, helpers: [false, false, false, false], muted: false, t: Date.now(), earned: 0, stars: 0, served: 0, stock: {} };
}
export function loadProfile() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (!d || typeof d !== 'object') d = {};
  const f = freshProfile();
  Object.assign(P, f, d);
  // a damaged or old save must never crash startup: re-type every field
  for (const k of ['built', 'paid', 'stock']) if (!P[k] || typeof P[k] !== 'object') P[k] = {};
  P.upg = Object.assign(f.upg, P.upg && typeof P.upg === 'object' ? P.upg : {});
  if (!Array.isArray(P.helpers)) P.helpers = f.helpers;
  for (const k of ['coins', 'earned', 'stars', 'served', 'pile', 'pendingOff', 'rush']) P[k] = num(P[k]);
  P.stars = Math.floor(P.stars); P.rush = Math.min(RUSH_TIME, P.rush);
  for (const k of Object.keys(UPG)) P.upg[k] = Math.min(UPG[k].max, Math.floor(num(P.upg[k])));
  P.helpers = [0, 1, 2, 3].map(i => P.helpers[i] === true);
  for (const k of Object.keys(P.stock)) if (k !== 'c') P.stock[k] = Math.floor(num(P.stock[k]));
  // a pad can never hold more than its price (that would pay coins back out)
  for (const k of Object.keys(P.paid)) {
    const b = k === 'star' ? starPad() : BUILDS.find(x => x.id === k);
    P.paid[k] = b ? Math.min(b.cost - 1, Math.floor(num(P.paid[k]))) : 0;
    if (!P.paid[k]) delete P.paid[k];
  }
  loaded = true;
}
const num = v => typeof v === 'number' && isFinite(v) && v > 0 ? v : 0;
let loaded = false;   // never write before the save was read (a tab switch while the SDK loads would wipe it)
export function saveProfile() {
  if (!loaded) return;
  P.t = Date.now();
  P.pile = G.pile;   // coins lying on the counter pile survive a reload
  P.rush = G.rush;   // so does a Coin Rush the player watched an ad for
  P.stock = { c: G.player.stack.slice() };   // and whatever the witch and the bats are carrying
  G.stands.forEach((s, i) => { P.stock['s' + i] = s.stock; });
  G.prods.forEach((s, i) => { P.stock['p' + i] = s.stock; });
  G.bats.forEach(b => { P.stock['b' + b.line] = b.carry; });
  try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {}
}
export function resetProfile() { try { localStorage.removeItem(KEY); } catch (e) {} }

let listeners = [];
export const on = fn => listeners.push(fn);
const emit = (type, d = {}) => listeners.forEach(fn => fn(type, d));

export const G = {
  player: { x: 360, y: 800, vx: 0, vy: 0, face: 1, stack: [], moving: false, pickT: 0 },
  prods: [], stands: [], customers: [], bats: [], pile: 0, rush: 0, time: 0,
  spawnT: 2, served: 0, checkT: 0, padT: 0, nextId: 1, spawnCount: 0, input: { x: 0, y: 0 },
};

// ---------- derived values ----------
export const isBuilt = id => !!P.built[id];
export const genBuilt = i => i === 0 || isBuilt(LINES[i].id + '-gen');
export const standBuilt = i => i === 0 || isBuilt(LINES[i].id + '-stand');
export const cap = () => carryCap(P.upg.carry);
export const speed = () => 300 * (1 + P.upg.speed * 0.12);
export const growEvery = i => LINES[i].every / (1 + P.upg.grow * 0.25);
export const prodMax = () => 6 + P.upg.grow;
const decorCount = () => ['lanterns', 'fountain', 'garden', 'statue'].filter(isBuilt).length;
export const priceMult = () => (1 + P.upg.price * 0.15) * (1 + decorCount() * 0.1) * (1 + (P.stars || 0) * 0.25) * (G.rush > 0 ? 2 : 1);
export const priceOf = i => Math.round(LINES[i].price * priceMult());
export const openStands = () => LINES.map((_, i) => i).filter(standBuilt);
// After the statue, an endless "Market Star" pad: each one raises every price by 25%.
export const STAR_PAD = { x: 390, y: 1330 };
const starPad = () => ({ id: 'star', kind: 'star', cost: 25000 * Math.pow(2, P.stars || 0), x: STAR_PAD.x, y: STAR_PAD.y, name: `Market Star ${(P.stars || 0) + 1}` });
export const activePads = () => {
  const list = BUILDS.filter(b => !isBuilt(b.id) && (!b.after || isBuilt(b.after)));
  if (isBuilt('statue')) list.push(starPad());
  return list;
};
export const helperOk = i => standBuilt(i) && genBuilt(i);
export const hasCashier = () => isBuilt('cashier');

export function startGame() {
  G.prods = LINES.map((l, i) => ({ i, x: l.x, y: PROD_Y, stock: Math.min(prodMax(), P.stock['p' + i] ?? (i === 0 ? 3 : 0)), t: 0 }));
  G.stands = LINES.map((l, i) => ({ i, x: l.x, y: STAND_Y, stock: Math.min(STAND_CAP, P.stock['s' + i] ?? 0) }));
  G.bats = [];
  P.helpers.forEach((h, i) => { if (h) addBat(i); });
  for (const b of G.bats) b.carry = Math.min(3 + Math.floor(P.upg.carry / 2), P.stock['b' + b.line] || 0);
  G.customers = []; G.pile = P.pile || 0; G.rush = P.rush || 0;
  const stack = (Array.isArray(P.stock.c) ? P.stock.c : []).filter(i => Number.isInteger(i) && i >= 0 && i < LINES.length && standBuilt(i)).slice(0, cap());
  Object.assign(G.player, { x: 360, y: 520, stack });
}
function addBat(i) {
  const l = LINES[i];
  G.bats.push({ line: i, x: l.x + 60, y: PROD_Y + 120, carry: 0, state: 'toProd', t: 0, ph: Math.random() * 6 });
}

// Coins the shop makes while closed (needs the owl and at least one bat).
export function offlineEarnings() {
  if (!hasCashier()) return 0;
  const secs = Math.min(7200, Math.max(0, (Date.now() - (P.t || Date.now())) / 1000));
  if (secs < 60) return 0;
  let rate = 0;
  P.helpers.forEach((h, i) => { if (h) rate += LINES[i].price * (1 + P.upg.price * 0.15) / Math.max(growEvery(i), 2.2); });
  return Math.floor(rate * secs * 0.12);
}

export function addCoins(n) { P.coins += n; P.earned += n; }
export function buyUpgrade(k) {
  const c = upgCost(k);
  if (P.upg[k] >= UPG[k].max || P.coins < c) return false;
  P.coins -= c; P.upg[k]++; saveProfile(); emit('upgrade', { k }); return true;
}
export function hireHelper(i) {
  const c = HELPER_COST[i];
  if (P.helpers[i] || !helperOk(i) || P.coins < c) return false;
  P.coins -= c; P.helpers[i] = true; addBat(i); saveProfile(); emit('hire', { i }); return true;
}
export function startRush() { G.rush = RUSH_TIME; emit('rush'); }

// ---------- customers ----------
function spawnCustomer() {
  const open = openStands();
  const n = 1 + Math.floor(Math.random() * Math.min(3, 1 + Math.floor(open.length / 1.5)));
  const want = [];
  for (let k = 0; k < n; k++) {
    // newer stands are a little more popular so every stand gets traffic
    const w = open.map((s, j) => 1 + j * 0.5), tot = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * tot, pick = open[0];
    for (let j = 0; j < open.length; j++) { r -= w[j]; if (r <= 0) { pick = open[j]; break; } }
    want.push(pick);
  }
  want.sort((a, b) => a - b);
  G.spawnCount++;
  const vip = hasCashier() && G.spawnCount % 9 === 0;
  const c = {
    id: G.nextId++, look: LOOKS[Math.floor(Math.random() * LOOKS.length)], x: DOOR.x + (Math.random() - 0.5) * 60, y: WH + 30,
    want, got: [], state: 'shop', wait: 0, takeT: 0, sp: 150 + Math.random() * 40, vip, ph: Math.random() * 6, mood: 'happy', ox: (Math.random() - 0.5) * 110, oy: Math.random() * 40,
  };
  G.customers.push(c);
}
const spawnEvery = () => 5.2 / (0.6 + 0.4 * openStands().length) / (1 + decorCount() * 0.15);
const maxCustomers = () => 3 + openStands().length * 2 + decorCount();
const queue = () => G.customers.filter(c => c.state === 'queue').sort((a, b) => a.qn - b.qn);

function moveTo(o, tx, ty, sp, dt) {
  const dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy);
  if (d < 2) { o.x = tx; o.y = ty; o.walking = false; return true; }
  const st = Math.min(d, sp * dt);
  o.x += dx / d * st; o.y += dy / d * st; o.walking = true;
  if (Math.abs(dx) > 1) o.face = dx > 0 ? 1 : -1;
  return d - st < 2;
}

let qCounter = 0;
function updateCustomers(dt) {
  for (const c of G.customers) {
    c.ph += dt * 8;
    if (c.state === 'shop') {
      if (c.got.length >= c.want.length) { c.state = 'queue'; c.qn = qCounter++; continue; }
      const st = G.stands[c.want[c.got.length]];
      const arrived = moveTo(c, st.x + c.ox, st.y + 92 + c.oy, c.sp, dt);
      if (!arrived) continue;
      c.takeT -= dt;
      if (st.stock > 0) {
        c.wait = Math.max(0, c.wait - dt * 2);
        if (c.takeT <= 0) { st.stock--; c.got.push(st.i); c.takeT = 0.45; emit('take', { c, st }); }
      } else {
        c.wait += dt;
        c.mood = c.wait > 22 ? 'sad' : 'happy';
        if (c.wait > 40) { c.state = 'leave'; c.mood = 'sad'; emit('angry', { c }); }
      }
    } else if (c.state === 'queue') {
      // position is assigned in updateRegister
    } else if (c.state === 'leave') {
      if (moveTo(c, DOOR.x + c.ox * 0.3, WH + 60, c.sp * 1.15, dt)) c.gone = true;
    }
  }
  G.customers = G.customers.filter(c => !c.gone);
}

function updateRegister(dt) {
  const q = queue();
  q.forEach((c, k) => { const p = queuePos(k); moveTo(c, p.x, p.y, c.sp, dt); c.qi = k; });
  const front = q[0];
  const atCash = Math.hypot(G.player.x - CASH.x, G.player.y - CASH.y) < 72;
  G.playerCashier = atCash;
  if (!front || Math.hypot(front.x - queuePos(0).x, front.y - queuePos(0).y) > 6) { G.checkT = 0; return; }
  if (!atCash && !hasCashier()) { G.checkT = 0; return; }
  G.checkT += dt;
  const need = atCash ? 0.42 : 0.75;
  if (G.checkT >= need) {
    G.checkT = 0;
    let pay = front.got.reduce((s, i) => s + priceOf(i), 0);
    if (front.vip) pay *= 3;
    G.pile += pay; G.served++; P.served++;
    front.state = 'leave'; front.paid = pay;
    emit('pay', { c: front, pay });
  }
}

function updateProducers(dt) {
  for (const p of G.prods) {
    if (!genBuilt(p.i)) continue;
    if (p.stock >= prodMax()) { p.t = 0; continue; }
    p.t += dt;
    if (p.t >= growEvery(p.i)) { p.t = 0; p.stock++; emit('grow', { p }); }
  }
}

// [cx, cy, halfW, halfH] boxes the player can't walk through
export function solids() {
  const out = [];
  G.prods.forEach(p => { if (genBuilt(p.i)) out.push([p.x, p.y - 20, 70, 40]); });
  G.stands.forEach(s => { if (standBuilt(s.i)) out.push([s.x, s.y, 78, 30]); });
  out.push([REG.x, REG.y, 90, 30]);
  return out;
}

function updatePlayer(dt) {
  const pl = G.player, inp = G.input;
  const m = Math.min(1, Math.hypot(inp.x, inp.y));
  pl.moving = m > 0.08;
  if (pl.moving) {
    const a = Math.atan2(inp.y, inp.x), sp = speed() * m;
    pl.x += Math.cos(a) * sp * dt; pl.y += Math.sin(a) * sp * dt;
    if (Math.abs(inp.x) > 0.1) pl.face = inp.x > 0 ? 1 : -1;
  }
  pl.x = Math.max(60, Math.min(WW - 60, pl.x)); pl.y = Math.max(150, Math.min(WH - 90, pl.y));
  // solid tables: push out of producers / stands / counter
  for (const [sx, sy, hw, hh] of solids()) {
    const dx = pl.x - sx, dy = pl.y - sy;
    if (Math.abs(dx) < hw && Math.abs(dy) < hh) {
      const px = hw - Math.abs(dx), py = hh - Math.abs(dy);
      if (px < py) pl.x += Math.sign(dx || 1) * px; else pl.y += Math.sign(dy || 1) * py;
    }
  }
  pl.pickT -= dt;
  if (pl.pickT > 0) return;
  // pick up from producers
  for (const p of G.prods) {
    if (!genBuilt(p.i) || !standBuilt(p.i) || p.stock <= 0 || pl.stack.length >= cap()) continue;
    if (Math.hypot(pl.x - p.x, pl.y - (p.y + 70)) < 95) {
      p.stock--; pl.stack.push(p.i); pl.pickT = 0.11; emit('pick', { p }); return;
    }
  }
  // stock stands
  for (const s of G.stands) {
    if (!standBuilt(s.i) || s.stock >= STAND_CAP) continue;
    if (Math.hypot(pl.x - s.x, pl.y - (s.y - 70)) < 100 || Math.hypot(pl.x - s.x, pl.y - (s.y + 60)) < 80) {
      const k = pl.stack.lastIndexOf(s.i);
      if (k < 0) continue;
      pl.stack.splice(k, 1); s.stock++; pl.pickT = 0.08; emit('stock', { s, k }); return;
    }
  }
}

function updateCoinsPile() {
  if (G.pile > 0 && Math.hypot(G.player.x - PILE.x, G.player.y - PILE.y) < 85) {
    const n = G.pile; G.pile = 0; addCoins(n); emit('collect', { n });
  }
}

function updatePads(dt) {
  const pl = G.player;
  for (const b of activePads()) {
    if (Math.hypot(pl.x - b.x, pl.y - b.y) > 66) continue;
    if (P.coins <= 0) continue;
    const paid = P.paid[b.id] || 0;
    const rate = Math.max(40, b.cost * 0.7);
    const d = Math.min(P.coins, b.cost - paid, Math.max(1, Math.round(rate * dt)));
    P.paid[b.id] = paid + d; P.coins -= d;
    G.padT += dt;
    if (G.padT > 0.07) { G.padT = 0; emit('padTick', { b }); }
    if (P.paid[b.id] >= b.cost) {
      if (b.kind === 'star') P.stars = (P.stars || 0) + 1; else P.built[b.id] = true;
      delete P.paid[b.id];
      if (b.kind === 'gen') G.prods[b.line].stock = 2;
      saveProfile();
      emit('build', { b });
    }
    return;
  }
}

function updateBats(dt) {
  for (const b of G.bats) {
    b.ph += dt * 14;
    const p = G.prods[b.line], s = G.stands[b.line], bcap = 3 + Math.floor(P.upg.carry / 2);
    b.t -= dt;
    if (b.state === 'toProd') {
      if (moveTo(b, p.x + 50, p.y + 90, 190, dt)) {
        if (p.stock > 0 && b.carry < bcap && b.t <= 0) { p.stock--; b.carry++; b.t = 0.25; }
        if (b.carry >= bcap || (b.carry > 0 && p.stock === 0 && s.stock < 2)) b.state = 'toStand';
      }
    } else {
      if (moveTo(b, s.x + 55, s.y - 80, 190, dt)) {
        if (b.carry > 0 && s.stock < STAND_CAP && b.t <= 0) { b.carry--; s.stock++; b.t = 0.2; emit('batDrop', { s }); }
        if (b.carry === 0) b.state = 'toProd';
      }
    }
  }
}

let saveT = 0;
export function tick(dt) {
  G.time += dt;
  if (G.rush > 0) { G.rush = Math.max(0, G.rush - dt); if (G.rush === 0) emit('rushEnd'); }
  updatePlayer(dt);
  updateProducers(dt);
  updateBats(dt);
  G.spawnT -= dt;
  if (G.spawnT <= 0) {
    G.spawnT = spawnEvery() * (0.7 + Math.random() * 0.6);
    if (G.customers.length < maxCustomers()) spawnCustomer();
  }
  updateCustomers(dt);
  updateRegister(dt);
  updateCoinsPile();
  updatePads(dt);
  saveT += dt;
  if (saveT > 5) { saveT = 0; saveProfile(); }
}

// What the player should do next (tutorial arrow + goal text).
export function objective() {
  const pl = G.player, q = queue();
  if (P.earned === 0 && !hasCashier()) {
    if (q.length && pl.stack.length === 0) return { text: 'Serve the customer at the register', x: CASH.x, y: CASH.y };
    if (pl.stack.length === 0 && G.stands[0].stock === 0) return { text: 'Pick up clovers from the basket', x: G.prods[0].x, y: G.prods[0].y + 70 };
    if (pl.stack.length > 0) return { text: 'Put clovers on the stand', x: G.stands[0].x, y: G.stands[0].y - 70 };
  }
  if (G.pile > 0 && (P.coins < 20 || G.pile > 40)) return { text: 'Collect your coins', x: PILE.x, y: PILE.y };
  if (q.length && !hasCashier() && !G.playerCashier && q.length >= 2) return { text: 'Customers are waiting!', x: CASH.x, y: CASH.y };
  const pad = activePads().find(b => b.kind !== 'cashier') || activePads()[0];
  const cash = activePads().find(b => b.kind === 'cashier');
  if (cash && P.coins + (P.paid.cashier || 0) >= cash.cost * 0.6) return { text: 'Hire an owl to run the register', x: cash.x, y: cash.y, pad: true };
  if (pad) return { text: `Build: ${pad.name}`, x: pad.x, y: pad.y, pad: true, soft: P.coins + (P.paid[pad.id] || 0) < pad.cost * 0.4 };
  return null;
}
