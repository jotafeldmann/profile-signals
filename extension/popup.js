const root=document.getElementById('app').attachShadow({mode:'open'});
const UI=globalThis.ProfileSignalsUI;let previous='',update=null;
chrome.runtime.sendMessage({type:'profile-signals:update'}).then(r=>{update=r?.available?r.url:null;previous='';load();}).catch(()=>{});
async function load(refresh=false){let state;try{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});state=await chrome.tabs.sendMessage(tab.id,{type:refresh?'profile-signals:refresh':'profile-signals:get'});}catch{state={status:'partial',data:{},note:'Open a LinkedIn member profile, or reload the page after installing the extension.'};}const key=JSON.stringify(state)+update;if(key!==previous){previous=key;root.replaceChildren();UI.style(root);root.append(UI.render(state,{refresh:()=>load(true),settings:()=>chrome.runtime.openOptionsPage(),update}));}}
load();setInterval(load,300);
