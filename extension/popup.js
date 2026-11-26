const root=document.getElementById('app').attachShadow({mode:'open'});
const UI=globalThis.ProfileSignalsUI;let previous='';
async function load(refresh=false){let state;try{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});state=await chrome.tabs.sendMessage(tab.id,{type:refresh?'profile-signals:refresh':'profile-signals:get'});}catch{state={status:'partial',data:{},note:'Open a LinkedIn member profile, or reload the page after installing the extension.'};}const key=JSON.stringify(state);if(key!==previous){previous=key;root.replaceChildren();UI.style(root);root.append(UI.render(state,{refresh:()=>load(true),settings:()=>chrome.runtime.openOptionsPage()}));}}
load();setInterval(load,300);
