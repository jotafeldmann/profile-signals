// Tells whether a newer release exists on GitHub, asking at most once a day and not at all once one is known
// (ADR-010). Loaded by background.js with importScripts, and by the unit tests.
(() => {
  const LATEST = 'https://api.github.com/repos/jotafeldmann/profile-signals/releases/latest';
  const HOW_TO_UPDATE = 'https://github.com/jotafeldmann/profile-signals#install';
  const DAY = 24 * 60 * 60 * 1000, RETRY = 60 * 60 * 1000;

  const parts = v => String(v || '').replace(/^v/, '').split('.').map(n => Number.parseInt(n, 10) || 0);
  // True when version a is newer than version b: 0.10.0 is newer than 0.9.0.
  function newer(a, b) {
    const x = parts(a), y = parts(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
    return false;
  }
  const available = (saved, installed) => !!saved?.latest && newer(saved.latest, installed);
  // Ask GitHub only when no newer version is known yet, the last answer is over a day old,
  // and the last failure is over an hour old.
  function due(saved, installed, now) {
    if (available(saved, installed)) return false;
    if (saved?.failedAt && now - saved.failedAt < RETRY) return false;
    return !(saved?.checkedAt && now - saved.checkedAt < DAY);
  }

  // Returns what to store after asking GitHub (or not), given what was stored before.
  async function check(saved, installed, now = Date.now(), get = fetch) {
    if (!due(saved, installed, now)) return saved;
    try {
      const response = await get(LATEST, {headers: {Accept: 'application/vnd.github+json'}, cache: 'no-store'});
      if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
      const tag = (await response.json())?.tag_name;
      if (!/^v?\d+(\.\d+)*$/.test(String(tag))) throw new Error('no version in the answer');
      return {checkedAt: now, latest: String(tag).replace(/^v/, '')};
    } catch {
      return {...saved, failedAt: now};
    }
  }

  globalThis.ProfileSignalsUpdate = {LATEST, HOW_TO_UPDATE, newer, available, due, check};
})();
