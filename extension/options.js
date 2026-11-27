// Settings tab: edits the rules (rules.json format) and stores them in chrome.storage.local as "config".
const $ = s => document.querySelector(s);
const TYPES = {
  year: [['greenBefore', 'Green if created before (year)'], ['redAfter', 'Red if created after (year)']],
  number: [['greenAtLeast', 'Green from (count)'], ['redBelow', 'Red below (count)']],
  present: []
};
let defaults, config, dirty = false;

function el(tag, props = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) if (k in e) e[k] = v; else e.setAttribute(k, v);
  e.append(...children);
  return e;
}
function status(text, kind = '') { const s = $('#status'); s.textContent = text; s.className = kind; }
function changed() { $('#json').value = JSON.stringify(config, null, 2); dirty = true; shareState(); status('Unsaved changes'); }
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
  $('#automatic').checked = config.collection.automatic !== false;
  $('#cacheOn').checked = config.cache.enabled !== false;
  $('#cacheDays').value = config.cache.days ?? 90;
  $('#rules').replaceChildren(...config.rules.map(ruleCard));
  $('#json').value = JSON.stringify(config, null, 2);
}

const S = globalThis.ProfileSignalsShare, problems = S.problems;

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
  dirty = false; shareState();
  status('Saved. Open LinkedIn tabs use it now.', 'ok');
};
$('#reset').onclick = async () => {
  if (!confirm('Discard your settings and go back to rules.json?')) return;
  await chrome.storage.local.remove('config');
  config = structuredClone(defaults); render(); dirty = false; shareState(); status('Back to the defaults in rules.json.', 'ok');
};
// Share with your team (ADR-011): the saved verdict and rules as a file or text, and a teammate's loaded
// into the form, to review and save.
const VERSION = chrome.runtime.getManifest().version;
function shareState() {
  $('#shareDownload').disabled = $('#shareCopy').disabled = dirty;
  $('#shareNote').textContent = dirty ? 'Save your changes first: sharing sends your saved settings.' : '';
}
function toggle(open, closed) { $(open).hidden = !$(open).hidden; $(closed).hidden = true; }
$('#shareOpen').onclick = () => toggle('#shareBox', '#loadBox');
$('#loadOpen').onclick = () => toggle('#loadBox', '#shareBox');
$('#shareDownload').onclick = () => {
  const url = URL.createObjectURL(new Blob([S.text(config, VERSION)], {type: 'application/json'}));
  const a = el('a', {href: url, download: S.FILE}); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status(`Downloaded ${S.FILE}. Send it to your team.`, 'ok');
};
$('#shareCopy').onclick = async () => {
  try { await navigator.clipboard.writeText(S.text(config, VERSION)); status('Copied. Paste it in a message to your team.', 'ok'); }
  catch { status('Copy did not work here: use Download file.', 'error'); }
};
function load(raw) {
  const r = S.importSettings(raw, config);
  if (r.error) return status(r.error, 'error');
  config = r.config; render(); changed(); $('#loadBox').hidden = true; $('#loadText').value = ''; $('#loadFile').value = '';
  status('Loaded. Review the settings below and click Save to use them.', 'ok');
}
$('#loadFile').onchange = async e => { const f = e.target.files?.[0]; if (f) load(await f.text()); };
$('#loadApply').onclick = () => load($('#loadText').value);

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
  render(); countCache(); shareState(); status(saved ? 'Using your saved settings.' : 'Using the defaults from rules.json.');
})();
