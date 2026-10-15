// Reads the info panel ("infobox") at the top of a Wikipedia car article and turns its
// raw wikitext into plain readable values. Used by scripts/fetch-car.mjs (Car of the Day)
// and by the Explore page in the browser, so it must not use any Node-only features.

export function readInfobox(wikitext) {
  const start = wikitext.search(/\{\{\s*Infobox[ _]automobile/i);
  if (start < 0) return {};
  // find the matching closing braces
  let depth = 0, end = start;
  for (; end < wikitext.length - 1; end++) {
    if (wikitext.startsWith('{{', end)) { depth++; end++; }
    else if (wikitext.startsWith('}}', end)) { depth--; end++; if (depth === 0) break; }
  }
  const body = wikitext.slice(start + 2, end - 1);
  // split on | that are not inside {{ }} or [[ ]]
  const parts = []; let d = 0, cur = '';
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === '{{' || two === '[[') { d++; cur += two; i++; continue; }
    if (two === '}}' || two === ']]') { d--; cur += two; i++; continue; }
    if (body[i] === '|' && d === 0) { parts.push(cur); cur = ''; continue; }
    cur += body[i];
  }
  parts.push(cur);
  const fields = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=');
    if (eq > 0) fields[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim();
  }
  return fields;
}

const UNITS = { hp: 'hp', bhp: 'bhp', PS: 'PS', kW: 'kW', lbft: 'lb-ft', 'lb.ft': 'lb-ft', 'lbf.ft': 'lb-ft', Nm: 'N·m', 'N.m': 'N·m',
  mph: 'mph', 'km/h': 'km/h', kph: 'km/h', kg: 'kg', lb: 'lb', L: 'L', cc: 'cc', mm: 'mm', in: 'in' };
const LIST_TEMPLATES = /^(plainlist|plain list|ubl|unbulleted list|hlist|flatlist|bulleted list|ublist)$/i;
const KEEP_TEMPLATES = /^(nowrap|nobr|small|lang|circa|start date|end date)$/i;

export function cleanValue(v, maxLength = 160) {
  let s = v
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<ref[\s\S]*?<\/ref>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1');
  // unwrap remaining templates from the inside out
  for (let i = 0; i < 10 && /\{\{/.test(s); i++) {
    s = s.replace(/\{\{([^{}]*)\}\}/g, (_, inner) => {
      const [name, ...args] = inner.split('|').map(x => x.trim());
      const values = args.filter(a => !/^\w+\s*=/.test(a));
      // {{convert|1220|kg}}, {{cvt|...}}, and ranges like {{convert|1220|-|1300|kg}}
      if (/^(convert|cvt)$/i.test(name)) {
        const [n, second, n2, unit] = values;
        if (/^(-|–|to|and)$/.test(second ?? '')) return `${n}–${n2} ${UNITS[unit] ?? unit ?? ''}`.trim();
        return `${n} ${UNITS[second] ?? second ?? ''}`.trim();
      }
      if (LIST_TEMPLATES.test(name)) return values.join('\n');
      if (KEEP_TEMPLATES.test(name)) return values.join(' ');
      return '';
    });
  }
  s = s
    .replace(/<[^>]+>/g, '')
    .replace(/'{2,}/g, '')
    .replace(/&nbsp;/g, ' ')
    .split('\n').map(l => l.replace(/^\s*[*#]\s*/, '').trim()).filter(Boolean).join(', ')
    .replace(/\s+/g, ' ').replace(/\s+,/g, ',').replace(/,\s*,/g, ',').trim();
  return s.length > maxLength ? s.slice(0, maxLength).replace(/[,\s]+\S*$/, '') + '…' : s;
}
