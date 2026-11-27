// Reads what a LinkedIn profile page shows: the name heading, the top card and the "About this member" panel.
// Plain script (no imports) so Chrome loads it as a content script; the browser tests load it into
// synthetic pages. It only reads the page; content.js decides when to open menus.
(() => {
  const clean = s => (s || '').replace(/\s+/g, ' ').trim();
  const visible = e => !!(e && e.getClientRects().length);

  // LinkedIn's 2026 profile shows the name as an <h2> inside a link, not an <h1>.
  // Prefer the heading whose text matches the tab title ("Name | LinkedIn").
  const pageName = () => clean(document.title.replace(/^\(\d+\+?\)\s*/, '').split(/\s+\|\s+/)[0]);
  function heading() {
    const all = [...document.querySelectorAll('main h1,main h2,[role=main] h1,[role=main] h2,main [role=heading][aria-level="1"]')]
      .filter(e => visible(e) && clean(e.innerText) && !e.closest('[role=dialog],dialog'));
    const name = pageName();
    return all.find(e => name && clean(e.innerText) === name) || all.find(e => e.tagName === 'H1') || all[0];
  }
  function topCard() {
    const h = heading();
    return h?.closest('section') || h?.closest('main,[role=main]') || h?.parentElement?.parentElement?.parentElement || null;
  }

  function extractNetwork() {
    const h = heading(), card = topCard();
    if (!h || !card) return {};
    const t = card.innerText || '';
    const match = regex => clean(t.match(regex)?.[1]);
    return {
      connections: match(/([\d.,]+\s*\+?)\s+(?:connections|conexões|conexoes)(?=\s|$|[·,.])/i),
      followers: match(/([\d.,]+\s*\+?)\s+(?:followers|seguidores)\b/i),
      mutual: match(/([\d.,]+)\s+(?:other\s+|outras?\s+)?(?:mutual connections?|conex(?:ões|oes|ão) em comum)/i),
      degree: match(/(?:^|\s|·)(1st|2nd|3rd\+?|[123]º)(?=\s|$|·)/im)
    };
  }

  const ABOUT = /^(?:about this (?:member|profile)|sobre (?:este|esse) (?:usuário|perfil|usu[aá]rio|membro)|sobre esta pessoa)$/i;
  const dialogs = () => [...document.querySelectorAll('[role="dialog"],dialog')].filter(visible);
  function aboutDialog() {
    return dialogs().find(d => [...d.querySelectorAll('h1,h2,h3,[role="heading"]')].some(h => ABOUT.test(clean(h.innerText))) || ABOUT.test(clean(d.getAttribute('aria-label'))));
  }

  function ageFrom(s, now = new Date()) {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const pt = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const y = String(s || '').match(/\b(20\d{2})\b/);
    if (!y) return '';
    const lower = s.toLowerCase();
    let m = months.findIndex(x => lower.includes(x));
    if (m < 0) m = pt.findIndex(x => lower.includes(x));
    if (m < 0) return '';
    const n = (now.getFullYear() - Number(y[1])) * 12 + now.getMonth() - m;
    if (n < 0) return '';
    // Always a number, so a rule on the account age can read it: "This month" left a new account unchecked.
    return `~${n} month${n === 1 ? '' : 's'}`;
  }

  function extractAbout(d, now = new Date()) {
    const lines = (d.innerText || '').split(/\n+/).map(clean).filter(Boolean);
    function value(pattern) {
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(pattern);
        if (m) { const suffix = clean(lines[i].slice(m[0].length).replace(/^[:\s-]+/, '')); return suffix || lines[i + 1] || ''; }
      }
      return '';
    }
    const created = value(/^(?:date (?:joined|created)|joined(?: linkedin)?|account (?:created|creation date)|member since|data de (?:criação|entrada|cadastro)|entrou (?:no linkedin|em)|membro desde|criado em)/i);
    const photo = value(/^(?:profile (?:photo|picture)(?: last)?(?: (?:updated|changed))?|last (?:profile )?(?:photo|picture) update|foto (?:do perfil|de perfil)(?: atualizada)?|última atualização da foto)/i);
    const contact = value(/^(?:contact (?:information|info)(?: last)?(?: (?:updated|changed))?|last contact (?:info|information) update|informações de contato(?: atualizadas)?|dados de contato(?: atualizados)?|última atualização d[eo] contato)/i);
    // The panel lists each verification as a type line followed by a "Verified by…" line.
    const start = lines.findIndex(l => /^(?:verifications?|verificaç(?:ão|ões))\s*:?$/i.test(l));
    const block = [];
    if (start >= 0) {
      for (const l of lines.slice(start + 1)) {
        if (/^(?:learn more|saiba mais|add (?:an? )?\w*\s*verification|adicione|verify now|verificar agora|done|concluído|account history|histórico da conta)/i.test(l)) break;
        if (/^(?:verified|verificad)/i.test(l) && block.length) block[block.length - 1] += ': ' + l; else block.push(l);
      }
    }
    let verification = block.join('; ') || value(/^(?:verifications?|verificaç(?:ão|ões))\s*:?/i);
    // Only report what the panel says. Never treat missing text as zero.
    if (!verification) { const found = lines.find(l => /^(?:no verifications|not verified|nenhuma verificaç|não verificado)/i.test(l)); if (found) verification = found; }
    const types = lines.filter(l => !/^(?:add|adicione)\b/i.test(l) && /(?:identity|workplace|education|identidade|local de trabalho|formação acadêmica).*(?:verified|verification|verificad|verificaç)|(?:verified|verification|verificad|verificaç).*(?:identity|workplace|education|identidade|local de trabalho|formação acadêmica)/i.test(l));
    if (!block.length && types.length) verification = [verification, ...types].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join('; ');
    return {created, age: ageFrom(created, now), photo, contact, verification};
  }

  const findMenu = () => [...(topCard()?.querySelectorAll('button,[role="button"]') || [])].filter(visible)
    .find(b => /^(?:more|more actions|more options|more actions for [^\n]+|mais|mais ações|mais opções)(?:\s*…)?$/i.test(clean(b.getAttribute('aria-label') || b.getAttribute('title') || b.innerText)));
  const findItem = () => [...document.querySelectorAll('button,a,[role="menuitem"]')]
    .find(e => visible(e) && ABOUT.test(clean(e.innerText || e.getAttribute('aria-label'))));

  globalThis.ProfileSignalsExtract = {clean, visible, pageName, heading, topCard, extractNetwork, dialogs, aboutDialog, extractAbout, ageFrom, findMenu, findItem};
})();
