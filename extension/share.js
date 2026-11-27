// Settings shared within a team as a file or as text (ADR-011): what decides the color (the verdict
// thresholds and the rules), never the collection mode or the cache, which stay each person's choice.
// Also the checks every setting must pass before it is saved. Loaded by options.html and the unit tests.
(() => {
  const KIND = 'profile-signals-settings', FORMAT = 1, FILE = 'profile-signals-config.json';
  const TYPES = ['year', 'number', 'present'];

  // Returns a list of problems; empty means the settings can be saved.
  function problems(c) {
    const out = [];
    if (!Array.isArray(c?.rules)) return ['"rules" must be a list'];
    const g = c.verdict?.greenAtLeast, y = c.verdict?.yellowAtLeast;
    if (!(g >= 0 && g <= 1 && y >= 0 && y <= 1)) out.push('Verdict thresholds must be between 0% and 100%');
    else if (y > g) out.push('Yellow must start at or below green');
    if (c.cache?.enabled !== false && !(c.cache?.days >= 1)) out.push('Cache days must be at least 1');
    for (const r of c.rules) {
      const name = r?.label || r?.id || 'a rule';
      if (!r || typeof r.field !== 'string') { out.push(`${name}: no field to read`); continue; }
      if (!TYPES.includes(r.type)) out.push(`${name}: unknown type "${r.type}"`);
      if (!(r.weight >= 0)) out.push(`${name}: weight must be 0 or more`);
      if (r.type === 'year' && r.greenBefore > r.redAfter + 1) out.push(`${name}: "green before" must not be later than "red after" + 1`);
      if (r.type === 'number' && r.redBelow > r.greenAtLeast) out.push(`${name}: "red below" must not be above "green from"`);
    }
    return out;
  }

  // The shared document: a header that names the format, then the verdict and the rules.
  function exportSettings(config, version) {
    return {profileSignals: KIND, format: FORMAT, exportedFrom: version, verdict: config.verdict, rules: config.rules};
  }
  const text = (config, version) => JSON.stringify(exportSettings(config, version), null, 2) + '\n';

  // Reads a shared file or pasted text and returns {config} (the current settings with the shared verdict
  // and rules) or {error}. A plain rules.json, as the Advanced section shows it, is accepted too.
  function importSettings(raw, current) {
    let doc;
    try { doc = JSON.parse(String(raw).trim()); } catch { return {error: 'This is not a settings file: the text is not valid JSON.'}; }
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return {error: 'This is not a settings file.'};
    if (doc.profileSignals !== undefined && doc.profileSignals !== KIND) return {error: 'This is not a Profile Signals settings file.'};
    if (doc.format > FORMAT) return {error: 'These settings come from a newer version of the extension. Update it first.'};
    if (!Array.isArray(doc.rules)) return {error: 'This is not a settings file: it has no rules.'};
    const config = {...current, verdict: doc.verdict ?? current.verdict, rules: doc.rules};
    const p = problems(config);
    return p.length ? {error: 'These settings cannot be used: ' + p.join('. ') + '.'} : {config};
  }

  globalThis.ProfileSignalsShare = {FILE, problems, exportSettings, text, importSettings};
})();
