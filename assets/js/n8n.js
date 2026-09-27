/* Turns an n8n workflow JSON into an SVG diagram (nodes + connections), like the n8n canvas.
   window.N8N.render(workflowObject, { compact: true }) -> SVG string
   window.N8N.summary(workflowObject) -> { nodes, trigger, apps: [] } */
(() => {
  const W = 100, H = 100; // n8n node box size in canvas units
  const KINDS = [
    { test: /trigger$|\.webhook$|cron$/i, color: '#2EBD85', glyph: 'bolt' },
    { test: /langchain|openai|anthropic|gemini|mistral|ollama|agent/i, color: '#9B6BFF', glyph: 'spark' },
    { test: /email|gmail|smtp|imap|mailchimp/i, color: '#FF8A3D', glyph: 'mail' },
    { test: /googlesheets|googledrive|googledocs|gmail|google/i, color: '#34A853', glyph: 'grid' },
    { test: /httprequest|graphql|respondtowebhook/i, color: '#3B8BFF', glyph: 'globe' },
    { test: /whatsapp|telegram|slack|discord|twilio|sms/i, color: '#25C2A0', glyph: 'chat' },
    { test: /\.if$|switch|filter|merge|splitinbatches|wait/i, color: '#F2A93B', glyph: 'branch' },
    { test: /code|function|set$|\.set|noop|itemlists|aggregate/i, color: '#8A8F98', glyph: 'code' }
  ];
  const GLYPHS = {
    bolt: 'M3 -14 L-7 3 L0 3 L-3 14 L7 -3 L0 -3 Z',
    spark: 'M0 -14 L3 -3 L14 0 L3 3 L0 14 L-3 3 L-14 0 L-3 -3 Z',
    grid: 'M-11 -11 H11 V11 H-11 Z M-11 -3.7 H11 M-11 3.7 H11 M-3.7 -11 V11',
    globe: 'M0 -12 A12 12 0 1 0 0.01 -12 Z M-12 0 H12 M0 -12 C-7 -5 -7 5 0 12 C7 5 7 -5 0 -12',
    chat: 'M-12 -9 H12 V6 H-3 L-9 12 V6 H-12 Z',
    mail: 'M-12 -8 H12 V8 H-12 Z M-12 -8 L0 2 L12 -8',
    branch: 'M-10 0 H-2 M-2 0 L8 -9 M-2 0 L8 9',
    code: 'M-5 -9 L-12 0 L-5 9 M5 -9 L12 0 L5 9'
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const kind = type => KINDS.find(k => k.test.test(type || '')) || { color: '#6F7580', glyph: 'code' };
  const isTrigger = type => /trigger$|\.webhook$|cron$/i.test(type || '');
  const NAMES = { openAi: 'OpenAI', whatsApp: 'WhatsApp', httpRequest: 'HTTP Request', googleSheets: 'Google Sheets', googleDrive: 'Google Drive', gmail: 'Gmail', noOp: 'No Op', set: 'Set', if: 'If', respondToWebhook: 'Respond to Webhook', scheduleTrigger: 'Schedule', googleSheetsTrigger: 'Google Sheets' };
  const appName = type => {
    const raw = String(type || '').split('.').pop();
    if (NAMES[raw]) return NAMES[raw];
    const t = String(type || '').split('.').pop().replace(/Trigger$/, '');
    return t.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
  };

  function parse(wf) {
    if (typeof wf === 'string') wf = JSON.parse(wf);
    const nodes = (wf.nodes || []).filter(n => !/stickyNote/i.test(n.type));
    return { wf, nodes };
  }

  function render(input, opts = {}) {
    const { wf, nodes } = parse(input);
    if (!nodes.length) return '<svg viewBox="0 0 200 80"><text x="100" y="45" text-anchor="middle" fill="#888" font-size="12">Empty workflow</text></svg>';
    const byName = Object.fromEntries(nodes.map(n => [n.name, n]));
    const xs = nodes.map(n => n.position[0]), ys = nodes.map(n => n.position[1]);
    const pad = opts.compact ? 70 : 60, labelSpace = opts.compact ? 10 : 46;
    const minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad;
    const w = Math.max(...xs) + W + pad - minX, h = Math.max(...ys) + H + pad + labelSpace - minY;

    let edges = '';
    for (const [from, outs] of Object.entries(wf.connections || {})) {
      const a = byName[from]; if (!a) continue;
      const mains = outs.main || [];
      mains.forEach((targets, outIdx) => {
        (targets || []).forEach(t => {
          const b = byName[t.node]; if (!b) return;
          const outs = mains.length;
          const y1 = a.position[1] + H * (outs > 1 ? (outIdx + 1) / (outs + 1) : 0.5);
          const x1 = a.position[0] + W, x2 = b.position[0], y2 = b.position[1] + H / 2;
          const dx = Math.max(40, Math.abs(x2 - x1) / 2);
          edges += `<path class="n8n-edge" d="M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}"/>`;
          edges += `<circle class="n8n-port" cx="${x2}" cy="${y2}" r="5"/>`;
        });
      });
    }
    let boxes = '';
    nodes.forEach(n => {
      const k = kind(n.type);
      const [x, y] = n.position;
      const trig = isTrigger(n.type);
      const shape = trig
        ? `<path d="M${x + 40} ${y} H${x + W - 12} Q${x + W} ${y} ${x + W} ${y + 12} V${y + H - 12} Q${x + W} ${y + H} ${x + W - 12} ${y + H} H${x + 40} A40 50 0 0 1 ${x + 40} ${y} Z" class="n8n-box" style="--c:${k.color}"/>`
        : `<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="12" class="n8n-box" style="--c:${k.color}"/>`;
      const label = opts.compact ? '' : `<text class="n8n-label" x="${x + W / 2}" y="${y + H + 22}" text-anchor="middle">${esc(n.name.length > 24 ? n.name.slice(0, 23) + '…' : n.name)}</text>`;
      boxes += `<g class="n8n-node"><title>${esc(n.name)} (${esc(appName(n.type))})</title>${shape}
        <g transform="translate(${x + W / 2} ${y + H / 2}) scale(1.35)"><path d="${GLYPHS[k.glyph]}" fill="none" stroke="${k.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></g>
        <circle cx="${x + W}" cy="${y + H / 2}" r="5" class="n8n-port"/>${label}</g>`;
    });
    return `<svg class="n8n-svg" viewBox="${minX} ${minY} ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(wf.name || 'n8n workflow')} diagram">${edges}${boxes}</svg>`;
  }

  function summary(input) {
    const { wf, nodes } = parse(input);
    const trig = nodes.find(n => isTrigger(n.type));
    const apps = [...new Set(nodes.map(n => appName(n.type)).filter(a => !/^(No Op|Set|If|Switch|Merge|Respond To Webhook)$/i.test(a)))];
    return { name: wf.name || '', nodes: nodes.length, trigger: trig ? appName(trig.type) : '', apps, list: nodes.map(n => ({ name: n.name, app: appName(n.type), color: kind(n.type).color })) };
  }

  window.N8N = { render, summary };
})();
