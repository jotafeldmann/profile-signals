// Turns collected profile data into a green / yellow / red verdict using rules.json.
// Plain script (no imports) so Chrome can load it as a content script and node --test can require it.
(() => {
  const RANK = {red: 0, yellow: 1, green: 2};
  const POINTS = {red: 0, yellow: 0.5, green: 1};
  const NEGATIVE = /^(?:no verifications|not verified|nenhuma verificaç|não verificado)/i;
  const year = s => { const m = String(s || '').match(/\b(?:19|20)\d{2}\b/); return m ? Number(m[0]) : null; };
  // "500+" -> 500, "1,234" and "1.234" -> 1234.
  const number = s => { const m = String(s || '').match(/\d[\d.,]*/); return m ? Number(m[0].replace(/[.,]/g, '')) : null; };

  function check(rule, data) {
    const raw = data?.[rule.field];
    switch (rule.type) {
      case 'year': {
        const y = year(raw);
        if (y == null) return {color: null, reason: 'Not available'};
        if (rule.redAfter != null && y > rule.redAfter) return {color: 'red', reason: `${y}, after ${rule.redAfter}`};
        if (rule.greenBefore != null && y < rule.greenBefore) return {color: 'green', reason: `${y}, before ${rule.greenBefore}`};
        return {color: 'yellow', reason: `${y}, from ${rule.greenBefore} to ${rule.redAfter}`};
      }
      case 'number': {
        const n = number(raw);
        if (n == null) return {color: null, reason: 'Not available'};
        if (rule.redBelow != null && n < rule.redBelow) return {color: 'red', reason: `${raw}, below ${rule.redBelow}`};
        if (rule.greenAtLeast == null || n >= rule.greenAtLeast) return {color: 'green', reason: `${raw}`};
        return {color: 'yellow', reason: `${raw}, below ${rule.greenAtLeast}`};
      }
      case 'present':
        return raw && !NEGATIVE.test(raw) ? {color: 'green', reason: raw} : {color: rule.ifMissing || 'yellow', reason: raw || 'None shown'};
      default:
        return {color: null, reason: `Unknown rule type "${rule.type}"`};
    }
  }

  function evaluate(config, data) {
    const results = (config?.rules || []).filter(r => r.enabled !== false).map(r => ({
      id: r.id, label: r.label || r.id, weight: Number(r.weight) || 0, hardGate: !!r.hardGate, ...check(r, data)
    }));
    const known = results.filter(r => r.color);
    const total = known.reduce((s, r) => s + r.weight, 0);
    const score = total ? known.reduce((s, r) => s + r.weight * POINTS[r.color], 0) / total : null;
    const v = config?.verdict || {};
    let rank = score == null ? null : score >= (v.greenAtLeast ?? 0.8) ? RANK.green : score >= (v.yellowAtLeast ?? 0.5) ? RANK.yellow : RANK.red;
    let reason = score == null ? 'No rule could be checked' : `Weighted score ${Math.round(score * 100)}%`;
    // A hard gate caps the result at its own color; an unchecked gate caps it at yellow.
    for (const r of results.filter(r => r.hardGate)) {
      const cap = r.color ? RANK[r.color] : RANK.yellow;
      // On a tie below green the gate is still named, since it alone would give this color.
      if (rank == null || cap < rank || (cap === rank && cap < RANK.green)) { rank = cap; reason = r.color ? `Hard gate, ${r.label}: ${r.reason}` : `Hard gate not checked: ${r.label}`; }
    }
    const color = rank == null ? null : Object.keys(RANK).find(k => RANK[k] === rank);
    return {color, score, reason, results};
  }

  globalThis.ProfileSignalsVerdict = {evaluate, check};
})();
