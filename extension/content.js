// Runs on LinkedIn: finds the profile, collects (on request, or automatically when enabled), caches and draws the dot.
(() => {
  const UI = globalThis.ProfileSignalsUI, V = globalThis.ProfileSignalsVerdict, X = globalThis.ProfileSignalsExtract;
  const {clean, heading, extractNetwork, dialogs, aboutDialog, extractAbout, findMenu, findItem} = X;
  let rules = null, rulesError = '', cacheChecked = false;
  let route = '', state = {status: 'loading', data: {}}, host, shadow, opened = false, generation = 0, busy = false, lastAttempt = 0;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // Poll every 50 ms until f() returns something, the time runs out, or ok() turns false.
  async function until(f, max, ok) { for (let t = 0; t < max && ok(); t += 50) { const v = f(); if (v) return v; await wait(50); } return null; }
  const profile = () => /^\/in\/[^/]+\/?$/.test(location.pathname);
  const current = () => location.pathname.replace(/\/$/, '');
  // Automatic collection opens LinkedIn's menus by itself on every profile. It is off by default (ADR-002).
  const automatic = () => rules?.collection?.automatic === true;

  // Long-lived cache per profile, keyed by the profile URL path (/in/<slug>), in chrome.storage.local.
  // A fresh entry is shown at once and LinkedIn is not touched; Refresh collects again and overwrites it.
  const cacheKey = () => 'profile:' + decodeURIComponent(current()).toLowerCase();
  const cacheOn = () => rules?.cache?.enabled !== false;
  const cacheDays = () => Number(rules?.cache?.days ?? 90);
  async function readCache(token) {
    try {
      if (!cacheOn()) return;
      const key = cacheKey(); const got = (await chrome.storage.local.get(key))[key];
      if (token !== generation || busy) return;
      if (got?.data?.created && Date.now() - got.collectedAt < cacheDays() * 864e5) {
        state = {status: 'done', data: {...got.data}, name: got.name, fromCache: true, collectedAt: got.collectedAt, note: ''};
        lastAttempt = Date.now(); judge(); draw();
      }
    } catch { /* no cache: go on as usual */ } finally { if (token === generation) cacheChecked = true; }
  }
  function saveCache() {
    if (!cacheOn() || !state.data.created) return;
    state.fromCache = false; state.collectedAt = Date.now();
    chrome.storage.local.set({[cacheKey()]: {name: state.name, data: state.data, collectedAt: state.collectedAt}}).catch(() => {});
  }

  function merge(data) { for (const [k, v] of Object.entries(data)) if (v) state.data[k] = v; }
  function judge() { state.verdict = rules ? V.evaluate(rules, state.data) : null; state.rulesError = rulesError; }
  function updateStatus() { state.status = 'done'; judge(); }
  const STEPS = ['Reading the profile card', 'Waiting for LinkedIn to finish loading', 'Opening the More menu', 'Opening About this member', 'Reading the About panel'];
  function progress(i) { state.progress = {step: i + 1, total: STEPS.length, label: STEPS[i]}; draw(); }
  // Manual mode: nothing is opened until the person asks. The network line of the card is read, but no
  // verdict is shown before the About panel was read, since the account date is the hard gate.
  function idle() {
    lastAttempt = Date.now(); merge(extractNetwork());
    state.name = clean(heading()?.textContent); state.status = 'idle';
    state.note = 'Not collected yet. Click Collect now, or open More → About this member yourself.';
    draw();
  }

  // One host on <body>, floating left of the name: it never shifts the profile text,
  // is not inside the name's link, and sits above LinkedIn's card (its own stacking context).
  function ensureHost() {
    if (host?.isConnected) return true;
    if (!document.body) return false;
    host = document.createElement('div'); host.id = 'profile-signals-host';
    host.style.cssText = 'position:absolute;top:0;left:0;z-index:2147483647;display:none';
    shadow = host.attachShadow({mode: 'open'}); document.body.append(host); return true;
  }
  function place() {
    if (!host) return;
    const r = heading()?.getBoundingClientRect();
    // Hide under LinkedIn's fixed top bar (about 52 px) unless the panel is open.
    if (!r || !r.width || (!opened && r.bottom < 56)) { host.style.display = 'none'; return; }
    host.style.display = 'block';
    host.style.top = Math.round(r.top + scrollY + r.height / 2 - 10) + 'px';
    host.style.left = Math.round(r.left + scrollX - 24) + 'px';
  }
  function draw() {
    if (!ensureHost()) return;
    shadow.replaceChildren(); UI.style(shadow);
    const b = UI.dot(state); b.setAttribute('aria-expanded', String(opened)); b.onclick = () => { opened = !opened; draw(); }; shadow.append(b);
    if (opened) {
      const f = UI.el('div', null, 'floating');
      f.append(UI.render(state, {
        refresh: () => collect(true),
        settings: () => chrome.runtime.sendMessage({type: 'profile-signals:options'}),
        close: () => { opened = false; draw(); }
      }));
      shadow.append(f);
    }
    place();
  }
  function removeHost() { host?.remove(); host = null; opened = false; state = {status: 'loading', data: {}}; }

  async function collect(force = false) {
    if (!profile() || busy || !heading()) return;
    busy = true; const token = generation; const valid = () => token === generation && profile() && route === current();
    lastAttempt = Date.now(); if (force) { state.data = {}; state.fromCache = false; }
    state.name = clean(heading().textContent); state.status = 'loading'; state.note = '';
    progress(0); merge(extractNetwork());
    let menu = null, autoDialog = null, d = aboutDialog();
    try {
      if (!d && !dialogs().length) {
        // LinkedIn ignores clicks made before its scripts finish starting the page, so wait, then retry.
        progress(1); await until(() => document.readyState === 'complete', 8000, valid);
        for (let attempt = 1; attempt <= 3 && !d && valid(); attempt++) {
          progress(2); menu = findMenu(); let item = findItem();
          if (!item && menu) { if (menu.getAttribute('aria-expanded') !== 'true') menu.click(); item = await until(findItem, 700, valid); }
          if (item && valid()) { progress(3); item.click(); d = autoDialog = await until(aboutDialog, 2500, valid); }
          if (!d && valid()) { if (menu?.getAttribute('aria-expanded') === 'true') menu.click(); await wait(300); }
        }
      }
      if (!valid()) return;
      if (d) {
        // The dialog opens empty and LinkedIn fills it about half a second later: wait for the text, not a fixed delay.
        progress(4);
        await until(() => { const a = extractAbout(d); return a.created || a.photo || a.contact; }, 4000, valid);
        if (!valid()) return;
        merge(extractAbout(d));
      }
      merge(extractNetwork());
      state.progress = null; updateStatus(); saveCache();
      state.note = state.data.created ? 'Unavailable fields were not detected.'
        : 'Open More → About this member manually; the extension will read the visible panel. Diagnostic: ' + (menu ? 'menu found' : 'menu not found') + '; ' + (d ? 'dialog found' : 'dialog not found') + '.';
      if (autoDialog && valid()) {
        const close = [...autoDialog.querySelectorAll('button')].find(b => /^(?:dismiss|close|done|fechar|dispensar|concluído)$/i.test(clean(b.getAttribute('aria-label') || b.getAttribute('title') || b.innerText)));
        if (close) close.click();
      } else if (menu && menu.getAttribute('aria-expanded') === 'true' && !d && valid()) menu.click();
    } catch (e) {
      if (valid()) { state.status = 'error'; state.note = 'Collection failed: ' + String(e.message || e) + '. Open About this member manually.'; }
    } finally { busy = false; if (valid()) { state.progress = null; draw(); } }
  }

  function tick() {
    if (!profile()) { if (route) { generation++; route = ''; removeHost(); } return; }
    if (route !== current()) { generation++; route = current(); removeHost(); lastAttempt = 0; cacheChecked = false; readCache(generation); }
    if (!heading()) { state.note = 'Profile heading not detected. Reload the LinkedIn page. Diagnostic: ' + location.pathname + '; h1 count: ' + document.querySelectorAll('h1').length; return; }
    if (!host?.isConnected) draw(); else place();
    if (busy) return;
    const d = aboutDialog();
    if (d) {
      // The person opened About this member: read the visible panel, in either mode.
      const a = extractAbout(d);
      if (!(a.created || a.photo || a.contact)) return; // still empty: LinkedIn is filling it
      const previous = JSON.stringify(state.data); const wasIdle = state.status !== 'done';
      merge(a); merge(extractNetwork()); updateStatus();
      if (wasIdle || previous !== JSON.stringify(state.data)) { state.note = 'Account panel detected manually.'; saveCache(); draw(); }
    } else if (!lastAttempt && cacheChecked) {
      if (automatic()) collect(); else idle();
    } else {
      const previous = JSON.stringify(state.data); merge(extractNetwork());
      if (previous !== JSON.stringify(state.data) && state.status === 'done') { judge(); draw(); }
    }
  }

  // Close the panel on a click anywhere outside it, or on Esc.
  document.addEventListener('pointerdown', e => { if (opened && host && !e.composedPath().includes(host)) { opened = false; draw(); } }, true);
  document.addEventListener('keydown', e => { if (opened && e.key === 'Escape') { opened = false; draw(); } });
  addEventListener('resize', place); addEventListener('scroll', place, {passive: true});
  chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
    if (msg.type === 'profile-signals:get') respond(profile() ? state : {status: 'partial', data: {}, note: 'Open a LinkedIn member profile first.'});
    else if (msg.type === 'profile-signals:refresh') { collect(true); respond(state); }
  });
  // Rules come through the background worker: the settings tab's saved copy, else rules.json.
  function loadRules() {
    return chrome.runtime.sendMessage({type: 'profile-signals:rules'})
      .then(r => { if (!r?.ok) throw new Error(r?.error || 'no answer'); rules = JSON.parse(r.text); rulesError = ''; })
      .catch(e => { rules = null; rulesError = 'Rules could not be read: ' + String(e?.message || e); });
  }
  // Settings saved in the options tab apply at once to the open profile.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.config) loadRules().then(() => { if (state.status === 'done') { judge(); draw(); } });
  });
  // Start only once the rules are known: the cache switch, its lifetime and the collection mode live there.
  loadRules().finally(() => { setInterval(tick, 250); tick(); });
})();
