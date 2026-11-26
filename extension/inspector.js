(() => {
  const fields = [
    ['created','Account created'], ['age','Account age'], ['connections','Connections'],
    ['degree','Connection degree'], ['followers','Followers'], ['mutual','Mutual connections'],
    ['photo','Profile photo updated'], ['contact','Contact info updated'], ['verification','Verifications']
  ];
  // Rule colors are the verdict. Blue is only the loading ring and grey means "no verdict".
  const COLORS = {green:'#18864b', yellow:'#e1ab00', red:'#c83232', grey:'#80868b', blue:'#0a66c2'};
  const NAMES = {green:'Green', yellow:'Yellow', red:'Red'};
  const css = `:host{font-family:Arial,sans-serif;color:#202124;font-size:13px;line-height:1.45} *{box-sizing:border-box}
  .panel{background:#fff;color:#202124;border:1px solid #d8dce1;border-radius:12px;padding:14px;width:min(350px,calc(100vw - 24px));box-shadow:0 4px 16px #0002}
  h2{font-size:16px;margin:0 0 5px} h3{font-size:12px;margin:12px 0 2px;color:#555;text-transform:uppercase;letter-spacing:.04em}
  p{margin:5px 0 10px;color:#555;font-size:12px} dl{margin:0}
  .line{display:flex;justify-content:space-between;gap:12px;border-top:1px solid #eee;padding:7px 0} dt{color:#555;flex:1;display:flex;align-items:center;gap:6px} dd{margin:0;text-align:right;max-width:57%;overflow-wrap:anywhere;font-weight:600}
  .verdict{display:flex;align-items:center;gap:8px;font-weight:700;margin:6px 0 2px} .verdict small{font-weight:400;color:#555}
  .mini{width:9px;height:9px;border-radius:50%;flex:none;background:var(--c)}
  .gate{font-size:10px;border:1px solid #c83232;color:#c83232;border-radius:4px;padding:0 3px}
  button{font:inherit;cursor:pointer;border:1px solid #ccc;background:white;color:#222;border-radius:6px;padding:6px 10px} button:disabled{opacity:.5;cursor:default}
  .dot{position:relative;display:flex;align-items:center;justify-content:center;border:0;padding:3px;background:transparent;border-radius:50%}
  .dot:focus-visible{outline:2px solid #0a66c2;outline-offset:1px}
  .circle{position:relative;width:14px;height:14px;border-radius:50%;display:block;background:var(--c)}
  .circle.loading{background:conic-gradient(var(--c) calc(var(--p) * 1%),#d8dce1 0)}
  .circle.loading::after{content:'';position:absolute;inset:3px;border-radius:50%;background:#fff}
  .cachemark{position:absolute;right:0;bottom:0;width:8px;height:8px;border-radius:50%;background:#fff;border:2px solid #202124}
  .cache{background:#f3f6f8;border-radius:6px;padding:6px 8px}
  .floating{position:absolute;top:100%;left:0;margin-top:4px}
  .progress{height:6px;background:#eceff1;border-radius:3px;overflow:hidden;margin:8px 0 4px}
  .progress span{display:block;height:100%;background:#0a66c2;transition:width .25s}
  .actions{display:flex;gap:6px;margin-top:8px}
  .credit{margin:10px 0 0;font-size:11px;color:#80868b} .credit a{color:#0a66c2;text-decoration:none} .credit a:hover{text-decoration:underline}`;
  function el(tag,text,cls){const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;}
  function mini(color){const m=el('span',null,'mini');m.style.setProperty('--c',COLORS[color]||COLORS.grey);return m;}
  const AUTHOR='https://github.com/jotafeldmann';
  function credit(){const p=el('p',null,'credit');const a=el('a','github.com/jotafeldmann');a.href=AUTHOR;a.target='_blank';a.rel='noopener noreferrer';p.append('Made by ',a);return p;}
  function style(root){root.append(el('style',css));}
  const loading=state=>state?.status==='loading'&&state?.progress;
  // Share of the work done: halfway through the current step, never 100% until finished.
  function percent(state){const p=state?.progress;return p?Math.round(100*(p.step-0.5)/p.total):0;}
  function cacheText(state){const d=new Date(state.collectedAt);const days=Math.floor((Date.now()-state.collectedAt)/864e5);return `From cache, collected ${d.toLocaleDateString()} (${days===0?'today':days===1?'1 day ago':days+' days ago'}). Refresh collects again.`;}
  function summary(state){
    const p=loading(state);if(p)return `Collecting: step ${p.step} of ${p.total}, ${p.label}`;
    if(state?.status==='error')return 'Collection failed';
    if(state?.status==='idle')return 'Not collected yet: click to collect';
    const v=state?.verdict;return v?.color?`${NAMES[v.color]}: ${v.reason}`:'No verdict: '+(state?.rulesError||v?.reason||'rules not loaded');
  }
  // The status dot: a blue ring that fills while collecting, then the verdict color.
  function dot(state){
    const p=loading(state);
    const b=el('button',null,'dot');b.type='button';b.title=summary(state);b.setAttribute('aria-label','Profile Signals: '+b.title);
    const c=el('span',null,p?'circle loading':'circle');
    c.style.setProperty('--c',p?COLORS.blue:COLORS[state?.verdict?.color]||COLORS.grey);if(p)c.style.setProperty('--p',String(percent(state)));
    b.append(c);if(state?.fromCache&&!p){b.append(el('span',null,'cachemark'));b.title='[cached] '+b.title;b.setAttribute('aria-label','Profile Signals: '+b.title);}return b;
  }
  function render(state,{refresh,settings,close}={}){
    const p=el('section',null,'panel');p.append(el('h2','Profile Signals'));
    const step=loading(state);const v=state?.verdict;
    if(step){const bar=el('div',null,'progress');const fill=el('span');fill.style.width=percent(state)+'%';bar.append(fill);p.append(bar);p.append(el('p',`Step ${step.step} of ${step.total}: ${step.label}…`));}
    else if(state?.status==='idle'){const line=el('div',null,'verdict');line.append(mini(null),el('span','Not collected yet'));p.append(line);}
    else{const line=el('div',null,'verdict');line.append(mini(v?.color),el('span',v?.color?NAMES[v.color]:'No verdict'),el('small',v?.color?v.reason:(state?.rulesError||v?.reason||'')));p.append(line);}
    if(state?.name)p.append(el('p',state.name));
    if(state?.fromCache&&!step)p.append(el('p',cacheText(state),'cache'));
    if(!step&&v?.results?.length){
      p.append(el('h3','Rules'));const dl=el('dl');
      for(const r of v.results){const row=el('div',null,'line');const dt=el('dt');dt.append(mini(r.color),el('span',r.label));if(r.hardGate)dt.append(el('span','gate','gate'));row.append(dt,el('dd',r.reason));dl.append(row);}
      p.append(dl);
    }
    p.append(el('h3','Collected'));
    const dl=el('dl');for(const [key,label] of fields){const row=el('div',null,'line');row.append(el('dt',label),el('dd',state?.data?.[key]||(step?'…':state?.status==='idle'?'Not read yet':'Unavailable')));dl.append(row);}p.append(dl);
    if(state?.note)p.append(el('p',state.note));
    p.append(el('p','Colors follow your rules (Settings). They are signals to look closer, not proof that a profile is fake or genuine.'));
    const a=el('div',null,'actions');if(refresh){const b=el('button',state?.status==='idle'?'Collect now':state?.fromCache?'Refresh now':'Refresh');b.onclick=refresh;b.disabled=!!step;a.append(b);}if(settings){const b=el('button','Settings');b.onclick=settings;a.append(b);}if(close){const b=el('button','Close');b.onclick=close;a.append(b);}p.append(a);p.append(credit());return p;
  }
  globalThis.ProfileSignalsUI={el,style,render,dot};
})();
