// One adapter for the web portals. Pick with ?portal=crazygames|poki|gd|playgama|gamemonetize (or window.PORTAL).
// 'none' = standalone build: rewards are granted without ads.
const qs = new URLSearchParams(location.search);
const NAME = (qs.get('portal') || window.PORTAL || 'none').toLowerCase();
// CrazyGames/Poki: no midgame ad in the first 3 minutes, then at most one per 3 minutes.
// GameDistribution caps the ad rate inside its SDK and wants a pre-roll on the first Play tap, so no own gap there.
// Playgama's Bridge times interstitials itself (its rules forbid own timers); GameMonetize gets a 2-minute gap.
const MID_GAP_MS = NAME === 'gd' || NAME === 'playgama' ? 0 : NAME === 'gamemonetize' ? 2 * 60 * 1000 : 3 * 60 * 1000;
let lastMid = Date.now();
let gmPreroll = NAME === 'gamemonetize';   // GameMonetize: one ad when play first starts (their activation check needs a full ad view)
let started = false;

function loadScript(src, id) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    if (id) s.id = id;
    s.src = src; s.async = true; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}
const timeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);
// CrazyGames ad request: resolves true on adFinished, false on adError, and false if the ad never even starts
// within 20 s (so a silent SDK can't leave the game paused forever).
function cgAd(type, pause) {
  return new Promise(res => {
    let begun = false, done = false;
    const end = v => { if (!done) { done = true; res(v); } };
    setTimeout(() => { if (!begun) end(false); }, 20000);
    window.CrazyGames.SDK.ad.requestAd(type, {
      adStarted: () => { begun = true; pause(true); },
      adFinished: () => end(true),
      adError: () => end(false),
    });
  });
}

let gdResolve = null, gdRewarded = false;
let hooks = { pause() {}, resume() {} };   // game pause/mute + resume, for ads the SDK starts on its own (setHooks)
let adPause = null;                        // pause fn of the ad call in flight (used by GD SDK_GAME_PAUSE)
const gdPreload = () => { try { window.gdsdk?.preloadAd?.('rewarded')?.catch?.(() => {}); } catch (e) {} };
let cgReady = false;           // CrazyGames SDK finished init (its Data module is usable)
let pokiReady = false, pokiLoaded = false;   // Poki SDK booted (init can finish after our 6 s timeout); game said loading done
let busy = false;              // an ad request is in flight (blocks double taps and early resumes)

const cg = () => window.CrazyGames?.SDK;
const pg = () => (NAME === 'playgama' && pgReady ? window.bridge : null);
let pgReady = false;           // Playgama Bridge initialized
let pgAudio = true;            // Playgama platform audio state (false = keep the game silent)
let settingsFns = [];          // callbacks for portal-driven mute changes
const pgCache = new Map();     // Playgama saves: read once at start (preload), written through to bridge.storage
const pgStore = {
  getItem: k => (pgCache.has(k) ? pgCache.get(k) : null),
  setItem(k, v) { v = String(v); if (pgCache.get(k) === v) return; pgCache.set(k, v); try { window.bridge.storage.set([k], [v]).catch(() => {}); } catch (e) {} },
  removeItem(k) { pgCache.delete(k); try { window.bridge.storage.delete([k]).catch(() => {}); } catch (e) {} },
};
// Playgama ad: resolves with the last state seen ('closed', 'rewarded', 'failed' ...). If the Bridge skips the ad
// (too soon after the last one) it may never leave the idle state, so give up after 2 s without 'loading'/'opened'.
function pgAd(kind, pause) {
  const b = window.bridge, A = b.advertisement;
  const ev = kind === 'rewarded' ? b.EVENT_NAME.REWARDED_STATE_CHANGED : b.EVENT_NAME.INTERSTITIAL_STATE_CHANGED;
  return new Promise(res => {
    let begun = false, done = false, rewarded = false;
    const end = () => { if (done) return; done = true; try { A.off(ev, h); } catch (e) {} res(rewarded); };
    const h = st => {
      if (st === 'loading' || st === 'opened') begun = true;
      if (st === 'opened') pause(true);
      if (st === 'rewarded') rewarded = true;
      if (st === 'closed' || st === 'failed') setTimeout(end, 100);
    };
    A.on(ev, h);
    setTimeout(() => { if (!begun) end(); }, 2000);
    setTimeout(end, 90000);
    try { kind === 'rewarded' ? A.showRewarded() : A.showInterstitial(); } catch (e) { end(); }
  });
}
const gmShow = () => new Promise(res => {   // GameMonetize: SDK_GAME_START (or a silent no-fill) ends the ad
  gmDone = res;
  setTimeout(() => { if (!gmBegun) { gmDone = null; res(); } }, 3000);
  setTimeout(() => { if (gmDone === res) { gmDone = null; res(); } }, 60000);
  try { window.sdk.showBanner(); } catch (e) { gmDone = null; res(); }
});
let gmDone = null, gmBegun = false;

export const portal = {
  name: NAME,
  hasAds: NAME !== 'none',
  get busy() { return busy; },
  setHooks(pause, resume) { hooks = { pause, resume }; },
  // false when the portal SDK never loaded (ad blocker, offline): ad buttons are shown disabled instead of doing nothing
  get adsOk() {
    if (NAME === 'crazygames') return !!cg()?.ad;
    if (NAME === 'poki') return !!window.PokiSDK;
    if (NAME === 'gd') return !!window.gdsdk;
    if (NAME === 'playgama') return !!pg();
    if (NAME === 'gamemonetize') return !!window.sdk?.showBanner;
    return true;
  },
  // CrazyGames "muteAudio" setting: overrides the in-game sound toggle
  // where saves go: CrazyGames asks for its Data module (synced to the player's CrazyGames account); browser storage elsewhere
  get store() {
    try { if (NAME === 'crazygames' && cgReady && cg()?.data) return cg().data; } catch (e) {}
    if (pg()) return pgStore;
    return window.localStorage;
  },
  // Playgama: read every save key in one call before the game reads them through portal.store
  async preload(keys) {
    if (!pg()) return;
    try {
      const vals = await timeout(window.bridge.storage.get(keys), 5000) || [];
      keys.forEach((k, i) => { const v = vals[i]; if (v !== null && v !== undefined) pgCache.set(k, typeof v === 'string' ? v : JSON.stringify(v)); });
    } catch (e) {}
  },
  // rewarded buttons: hidden where the portal has no rewarded ads (Playgama rule; GameMonetize has none)
  get rewardedOk() {
    if (NAME === 'playgama') { try { return !!pg()?.advertisement?.isRewardedSupported; } catch (e) { return false; } }
    if (NAME === 'gamemonetize') return false;
    return true;
  },
  get muted() {
    try {
      if (NAME === 'crazygames') return !!cg()?.game?.settings?.muteAudio;
      if (NAME === 'playgama') return !pgAudio;
    } catch (e) {}
    return false;
  },
  onSettings(fn) {
    settingsFns.push(fn);
    try { if (NAME === 'crazygames') cg()?.game?.addSettingsChangeListener?.(() => fn()); } catch (e) {}
  },

  async init() {
    try {
      if (NAME === 'crazygames') {
        let ready = false;
        await timeout(loadScript('https://sdk.crazygames.com/crazygames-sdk-v3.js').then(() => window.CrazyGames.SDK.init()).then(() => { ready = cgReady = true; }), 6000);
        if (ready) cg().game.loadingStart();   // only when init finished in time (never after loadingStop)
      } else if (NAME === 'poki') {
        // calls made before PokiSDK.init() resolves are dropped by the SDK, so replay them if it boots late
        await timeout(loadScript('https://game-cdn.poki.com/scripts/v2/poki-sdk.js').then(() => window.PokiSDK.init()).then(() => {
          pokiReady = true;
          try { if (pokiLoaded) window.PokiSDK.gameLoadingFinished(); if (started) window.PokiSDK.gameplayStart(); } catch (e) {}
        }), 6000);
      } else if (NAME === 'playgama' && window.bridge) {
        // the Bridge script is the first <script> in <head> (build.py); initialize it before the game loads
        await timeout(window.bridge.initialize().then(() => { pgReady = true; }), 8000);
        if (pgReady) {
          const b = window.bridge, P = b.platform;
          pgAudio = P.isAudioEnabled !== false;
          P.on(b.EVENT_NAME.AUDIO_STATE_CHANGED, on => { pgAudio = !!on; settingsFns.forEach(f => f()); });
          P.on(b.EVENT_NAME.PAUSE_STATE_CHANGED, p => { if (p) hooks.pause(true); else if (!busy) hooks.resume(); });
        }
      } else if (NAME === 'gamemonetize') {
        window.SDK_OPTIONS = {
          gameId: qs.get('gmid') || window.GM_GAME_ID || '',
          onEvent: ev => {
            switch (ev.name) {
              case 'SDK_GAME_PAUSE': gmBegun = true; (adPause || hooks.pause)(true); break;
              case 'SDK_GAME_START':
                gmBegun = false;
                if (gmDone) { const r = gmDone; gmDone = null; r(); }
                if (!busy) hooks.resume();
                break;
            }
          },
        };
        if (!document.getElementById('gamemonetize-sdk')) await timeout(loadScript('https://api.gamemonetize.com/sdk.js', 'gamemonetize-sdk'), 6000);
      } else if (NAME === 'gd') {
        window.GD_OPTIONS = {
          gameId: qs.get('gdid') || window.GD_GAME_ID || '',
          onEvent: ev => {
            switch (ev.name) {
              case 'SDK_READY': gdPreload(); break;
              case 'SDK_GAME_PAUSE': (adPause || hooks.pause)(true); break;   // pause + mute for every ad, ours or the SDK's
              case 'SDK_REWARDED_WATCH_COMPLETE': gdRewarded = true; break;
              case 'SDK_GAME_START':
                if (gdResolve) { const r = gdResolve; gdResolve = null; setTimeout(() => r(gdRewarded), 150); }
                if (!busy) hooks.resume();   // our own ad calls resume once their promise settles
                break;
            }
          },
        };
        if (!document.getElementById('gamedistribution-jssdk')) {
          await timeout(loadScript('https://html5.api.gamedistribution.com/main.min.js', 'gamedistribution-jssdk'), 6000);
          gdPreload();
        }
      }
    } catch (e) { console.warn('portal sdk failed', e); }
  },

  loadingDone() {
    try {
      if (NAME === 'crazygames') window.CrazyGames?.SDK?.game?.loadingStop?.();
      if (NAME === 'poki') { pokiLoaded = true; if (pokiReady) window.PokiSDK?.gameLoadingFinished?.(); }
      if (pg()) window.bridge.platform.sendMessage('game_ready');
    } catch (e) {}
  },

  gameplayStart() {
    if (gmPreroll && !busy && window.sdk?.showBanner) { gmPreroll = false; lastMid = 0; this.midgame(hooks.pause, hooks.resume); return; }
    if (started) return; started = true;
    try {
      if (NAME === 'crazygames') window.CrazyGames?.SDK?.game?.gameplayStart?.();
      if (NAME === 'poki' && pokiReady) window.PokiSDK?.gameplayStart?.();
    } catch (e) {}
  },
  gameplayStop() {
    if (!started) return; started = false;
    try {
      if (NAME === 'crazygames') window.CrazyGames?.SDK?.game?.gameplayStop?.();
      if (NAME === 'poki' && pokiReady) window.PokiSDK?.gameplayStop?.();
    } catch (e) {}
  },
  happy() { try { if (NAME === 'crazygames') window.CrazyGames?.SDK?.game?.happytime?.(); } catch (e) {} },

  // Interstitial at a natural break. pause/resume mute audio + block input.
  async midgame(pause, resume) {
    if (!this.hasAds || busy || Date.now() - lastMid < MID_GAP_MS) return;
    lastMid = Date.now();
    busy = true;
    const wasStarted = started;
    this.gameplayStop();
    // pause + block input right away; CrazyGames wants the sound cut only once the ad really starts
    pause(NAME !== 'crazygames');
    try {
      if (NAME === 'crazygames') {
        await cgAd('midgame', pause);
      } else if (NAME === 'poki' && pokiReady) {
        await window.PokiSDK.commercialBreak(pause);
      } else if (NAME === 'gd' && window.gdsdk) {
        adPause = pause; await timeout(window.gdsdk.showAd(), 60000);
      } else if (pg()) {
        await pgAd('interstitial', pause);
      } else if (NAME === 'gamemonetize' && window.sdk?.showBanner) {
        adPause = pause; gmBegun = false; await gmShow();
      }
    } catch (e) {}
    adPause = null;
    busy = false;
    resume();
    if (wasStarted) this.gameplayStart();
  },

  // Resolves true only when the reward should be granted.
  async rewarded(pause, resume) {
    if (!this.hasAds) return true;
    if (busy) return false;
    busy = true;
    const wasStarted = started;
    this.gameplayStop();
    pause(NAME !== 'crazygames');
    let ok = false;
    try {
      if (NAME === 'crazygames') {
        ok = await cgAd('rewarded', pause);
      } else if (NAME === 'poki' && pokiReady) {
        ok = !!(await window.PokiSDK.rewardedBreak(pause));
      } else if (NAME === 'gd' && window.gdsdk) {
        // reward only when SDK_REWARDED_WATCH_COMPLETE fired; settle on SDK_GAME_START or when showAd settles,
        // whichever comes first, so a no-fill that never fires SDK_GAME_START does not freeze the game
        gdRewarded = false; adPause = pause;
        ok = !!(await timeout(new Promise(res => {
          gdResolve = res;
          Promise.resolve(window.gdsdk.showAd('rewarded')).then(() => setTimeout(() => res(gdRewarded), 150), () => res(false));
        }), 90000));
        gdResolve = null;
        gdPreload();
      } else if (pg() && this.rewardedOk) {
        ok = await pgAd('rewarded', pause);   // reward only on the 'rewarded' state (Playgama rule)
      }
    } catch (e) { ok = false; }
    adPause = null;
    busy = false;
    resume();
    if (wasStarted) this.gameplayStart();
    lastMid = Date.now();
    return ok;
  },
};
