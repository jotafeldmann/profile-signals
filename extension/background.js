// Serves the rules to the content script, opens the settings tab for it, and keeps the update notice:
// a red badge on the toolbar icon while a newer release exists (ADR-010).
// Reading rules.json here keeps it out of web_accessible_resources, where LinkedIn's pages
// could probe for it and detect the extension.
importScripts('update.js');
const U = globalThis.ProfileSignalsUpdate;

async function rules() {
  const {config} = await chrome.storage.local.get('config');
  if (config) return JSON.stringify(config);
  return (await fetch(chrome.runtime.getURL('rules.json'))).text();
}

// Asks GitHub only when update.js says it is due; otherwise answers from storage. Returns whether a newer
// version exists, and sets the badge to match.
async function update() {
  const installed = chrome.runtime.getManifest().version;
  const saved = (await chrome.storage.local.get('update')).update;
  const next = await U.check(saved, installed);
  if (next !== saved) await chrome.storage.local.set({update: next});
  const available = U.available(next, installed);
  await chrome.action.setBadgeBackgroundColor({color: '#d93025'});
  await chrome.action.setBadgeText({text: available ? ' ' : ''});
  return available;
}

chrome.runtime.onStartup.addListener(() => { update().catch(() => {}); });
chrome.runtime.onInstalled.addListener(() => { update().catch(() => {}); });
chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg?.type === 'profile-signals:options') { chrome.runtime.openOptionsPage(); return; }
  if (msg?.type === 'profile-signals:update') {
    update().then(available => respond({available, url: U.HOW_TO_UPDATE})).catch(() => respond({available: false}));
    return true;
  }
  if (msg?.type !== 'profile-signals:rules') return;
  rules().then(text => respond({ok: true, text})).catch(e => respond({ok: false, error: String(e?.message || e)}));
  return true;
});
