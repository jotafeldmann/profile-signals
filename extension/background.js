// Serves the rules to the content script and opens the settings tab for it.
// Reading rules.json here keeps it out of web_accessible_resources, where LinkedIn's pages
// could probe for it and detect the extension.
async function rules() {
  const {config} = await chrome.storage.local.get('config');
  if (config) return JSON.stringify(config);
  return (await fetch(chrome.runtime.getURL('rules.json'))).text();
}
chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg?.type === 'profile-signals:options') { chrome.runtime.openOptionsPage(); return; }
  if (msg?.type !== 'profile-signals:rules') return;
  rules().then(text => respond({ok: true, text})).catch(e => respond({ok: false, error: String(e?.message || e)}));
  return true;
});
