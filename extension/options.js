// Settings tab: edits the rules (rules.json format) and stores them in chrome.storage.local as "config".
const $ = s => document.querySelector(s);
const TYPES = {
  year: [['greenBefore', 'Green if created before (year)'], ['redAfter', 'Red if created after (year)']],
  number: [['greenAtLeast', 'Green from (count)'], ['redBelow', 'Red below (count)']],
  present: []
};
let defaults, config;

function el(tag, props = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) if (k in e) e[k] = v; else e.setAttribute(k, v);
  e.append(...children);
  return e;
}
function status(text, kind = '') { const s = $('#status'); s.textContent = text; s.className = kind; }
function changed() { $('#json').value = JSON.stringify(config, null, 2); status('Unsaved changes'); }
const num = v => (v === '' ? undefined : Number(v));

function ruleCard(rule, i) {
  const card = el('div', {className: 'rule' + (rule.enabled === false ? ' off' : '')});
  const enabled = el('input', {type: 'checkbox', checked: rule.enabled !== false});
  enabled.onchange = () => { rule.enabled = enabled.checked; card.classList.toggle('off', !enabled.checked); changed(); };
  const up = el('button', {type: 'button', textContent: '↑', title: 'Higher priority', disabled: i === 0});
  const down = el('button', {type: 'button', textContent: '↓', title: 'Lower priority', disabled: i === config.rules.length - 1});
  const move = d => { const r = config.rules; [r[i], r[i + d]] = [r[i + d], r[i]]; render(); changed(); };
  up.onclick = () => move(-1); down.onclick = () => move(1);
  card.append(el('div', {className: 'head'},
    el('label', {className: 'check'}, enabled), el('strong', {textContent: `${i + 1}. ${rule.label || rule.id}`}),
    el('span', {className: 'tag', textContent: `field: ${rule.field} · ${rule.type}`}), el('span', {className: 'order'}, up, down)));

  const grid = el('div', {className: 'grid'});
  const weight = el('input', {type: 'number', min: 0, step: 1, value: rule.weight ?? 0});
  weight.oninput = () => { rule.weight = num(weight.value); changed(); };
  const gate = el('input', {type: 'checkbox', checked: !!rule.hardGate});
  gate.onchange = () => { rule.hardGate = gate.checked; changed(); };
  grid.append(el('label', {}, 'Weight', weight), el('label', {className: 'check', title: 'Lets this rule alone cap the result'}, gate, 'Hard gate'));
  for (const [key, text] of TYPES[rule.type] || []) {
    const input = el('input', {type: 'number', step: 1, value: rule[key] ?? ''});
    input.oninput = () => { rule[key] = num(input.value); changed(); };
    grid.append(el('label', {}, text, input));
  }
  if (rule.type === 'present') {
    const select = el('select', {}, ...['yellow', 'red', 'green'].map(c => el('option', {value: c, textContent: c, selected: (rule.ifMissing || 'yellow') === c})));
    select.onchange = () => { rule.ifMissing = select.value; changed(); };
    grid.append(el('label', {}, 'When none is shown', select));
  }
  card.append(grid);
  if (rule._comment) card.append(el('p', {className: 'help', textContent: rule._comment}));
  return card;
}

function render() {
  config.verdict ??= {}; config.cache ??= {}; config.collection ??= {};
  $('#greenAt').value = Math.round((config.verdict.greenAtLeast ?? 0.8) * 100);
  $('#yellowAt').value = Math.round((config.verdict.yellowAtLeast ?? 0.5) * 100);
  $('#automatic').checked = config.collection.automatic === true;
  $('#cacheOn').checked = config.cache.enabled !== false;
  $('#cacheDays').value = config.cache.days ?? 90;
  $('#rules').replaceChildren(...config.rules.map(ruleCard));
  $('#json').value = JSON.stringify(config, null, 2);
}

// Returns a list of problems; empty means the settings can be saved.
function problems(c) {
  const out = [];
  if (!Array.isArray(c?.rules)) return ['"rules" must be a list'];
  const g = c.verdict?.greenAtLeast, y = c.verdict?.yellowAtLeast;
  if (!(g >= 0 && g <= 1 && y >= 0 && y <= 1)) out.push('Verdict thresholds must be between 0% and 100%');
  else if (y > g) out.push('Yellow must start at or below green');
  if (c.cache?.enabled !== false && !(c.cache?.days >= 1)) out.push('Cache days must be at least 1');
  for (const r of c.rules) {
    const name = r.label || r.id || 'a rule';
    if (!TYPES[r.type]) out.push(`${name}: unknown type "${r.type}"`);
    if (!(r.weight >= 0)) out.push(`${name}: weight must be 0 or more`);
    if (r.type === 'year' && r.greenBefore > r.redAfter + 1) out.push(`${name}: "green before" must not be later than "red after" + 1`);
    if (r.type === 'number' && r.redBelow > r.greenAtLeast) out.push(`${name}: "red below" must not be above "green from"`);
  }
  return out;
}

async function countCache() {
  const all = await chrome.storage.local.get(null);
  const n = Object.keys(all).filter(k => k.startsWith('profile:')).length;
  $('#cacheCount').textContent = `${n} profile${n === 1 ? '' : 's'} cached.`;
  $('#clearCache').disabled = n === 0;
}

$('#greenAt').oninput = e => { config.verdict.greenAtLeast = num(e.target.value) / 100; changed(); };
$('#yellowAt').oninput = e => { config.verdict.yellowAtLeast = num(e.target.value) / 100; changed(); };
$('#automatic').onchange = e => { config.collection.automatic = e.target.checked; changed(); };
$('#cacheOn').onchange = e => { config.cache.enabled = e.target.checked; changed(); };
$('#cacheDays').oninput = e => { config.cache.days = num(e.target.value); changed(); };
$('#applyJson').onclick = () => {
  let parsed;
  try { parsed = JSON.parse($('#json').value); } catch (e) { return status('JSON error: ' + e.message, 'error'); }
  const p = problems(parsed);
  if (p.length) return status(p.join('. '), 'error');
  config = parsed; render(); status('JSON applied to the form. Save to keep it.');
};
$('#save').onclick = async () => {
  const p = problems(config);
  if (p.length) return status(p.join('. '), 'error');
  await chrome.storage.local.set({config});
  status('Saved. Open LinkedIn tabs use it now.', 'ok');
};
$('#reset').onclick = async () => {
  if (!confirm('Discard your settings and go back to rules.json?')) return;
  await chrome.storage.local.remove('config');
  config = structuredClone(defaults); render(); status('Back to the defaults in rules.json.', 'ok');
};
$('#clearCache').onclick = async () => {
  const keys = Object.keys(await chrome.storage.local.get(null)).filter(k => k.startsWith('profile:'));
  if (!confirm(`Delete ${keys.length} cached profile${keys.length === 1 ? '' : 's'}? They will be collected again on the next visit.`)) return;
  await chrome.storage.local.remove(keys);
  countCache(); status('Cache cleared.', 'ok');
};

(async () => {
  defaults = await (await fetch('rules.json')).json();
  const {config: saved} = await chrome.storage.local.get('config');
  config = structuredClone(saved || defaults);
  render(); countCache(); status(saved ? 'Using your saved settings.' : 'Using the defaults from rules.json.');
})();
