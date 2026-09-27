/* Portfolio front end. Content comes from data/portfolio-data.js (edit it by hand or from admin.html). */
(() => {
  const D = window.PORTFOLIO || { config: {}, profile: {}, sections: [], items: [] };
  const C = D.config || {}, P = D.profile || {};
  const SECTIONS = D.sections || [];
  const ITEMS = D.items || [];
  const HERE = (document.currentScript && document.currentScript.src) || location.href;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Icons ---------- */
  const I = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3z"/></svg>',
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    be: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.2 11.3c.9-.4 1.4-1.1 1.4-2.1C9.6 7.1 8 6.5 6.1 6.5H1v11h5.3c2 0 3.9-.9 3.9-3.2 0-1.4-.7-2.5-2-3zM3.4 8.4h2.3c.9 0 1.6.2 1.6 1.2s-.6 1.2-1.4 1.2H3.4V8.4zm2.5 7.1H3.4v-3h2.6c1 0 1.7.4 1.7 1.5s-.8 1.5-1.8 1.5zM20.2 8.6h-5V7.2h5v1.4zM23 13.9c0-2.4-1.4-4.4-3.9-4.4s-4.1 1.8-4.1 4.2c0 2.5 1.6 4.2 4.1 4.2 1.9 0 3.1-.8 3.7-2.6h-1.9c-.2.7-1 1-1.7 1-1.3 0-2-.8-2-2.1H23v-.3zm-5.8-1c.1-1.1.8-1.8 1.9-1.8s1.7.7 1.8 1.8h-3.7z"/></svg>',
    in: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4v11H3v-11zm7 0h3.8v1.6h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6v5.4h-4v-4.8c0-1.2 0-2.6-1.6-2.6s-1.8 1.2-1.8 2.5v4.9h-4v-11z"/></svg>',
    yt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.7 15V9l5.9 3-5.9 3z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>',
    cube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="m3 7 9 5 9-5M12 12v10"/></svg>',
    flow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="9" width="6" height="6" rx="1.5"/><rect x="16" y="3" width="6" height="6" rx="1.5"/><rect x="16" y="15" width="6" height="6" rx="1.5"/><path d="M8 12h4m0 0V6h4m-4 6v6h4"/></svg>',
    compare: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/></svg>',
    images: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
    arrows: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m9 7-5 5 5 5M15 7l5 5-5 5"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0-5-5m5 5 5-5M4 21h16"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'
  };
  const TYPE_ICON = { image: I.images, video: I.play, model: I.cube, automation: I.flow };

  /* ---------- Helpers ---------- */
  const sectionOf = it => SECTIONS.find(s => s.id === it.section) || { id: it.section, type: 'image', title: it.section || '' };
  const typeOf = it => sectionOf(it).type;
  const ytId = u => { const m = String(u || '').match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/); return m ? m[1] : null; };
  const vimeoId = u => { const m = String(u || '').match(/vimeo\.com\/(?:video\/)?(\d+)/); return m ? m[1] : null; };
  const fmtDate = d => { if (!d) return ''; const t = new Date(d); return isNaN(t) ? d : t.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); };
  const waLink = (msg) => P.whatsapp ? `https://wa.me/${String(P.whatsapp).replace(/\D/g, '')}${msg ? '?text=' + encodeURIComponent(msg) : ''}` : '';
  const hireHref = () => P.whatsapp ? waLink(`Hi ${P.name || ''}, I saw your portfolio and want to discuss a project.`) : P.email ? `mailto:${P.email}` : '#/about';
  const sorted = list => list.slice().sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || String(b.date || '').localeCompare(String(a.date || '')));
  const wfCache = {};
  const getWorkflow = src => (wfCache[src] ||= fetch(src).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }));

  /* ---------- Shell ---------- */
  function applyShell() {
    if (C.accent) document.documentElement.style.setProperty('--accent', C.accent);
    document.title = C.siteTitle || P.name || 'Portfolio';
    $('#logo').innerHTML = `${P.avatar ? `<img src="${esc(P.avatar)}" alt="">` : ''}<span>${esc(P.name || 'Portfolio')}</span>`;
    $('#banner').style.backgroundImage = P.banner ? `url("${P.banner}")` : '';
    $('#hireTop').textContent = P.hireText || 'Hire me';
    $('#hireTop').href = hireHref();
    if (/^https?:/.test($('#hireTop').href)) $('#hireTop').target = '_blank';
    const socials = [
      ['instagram', I.ig, 'Instagram'], ['behance', I.be, 'Behance'], ['linkedin', I.in, 'LinkedIn'], ['youtube', I.yt, 'YouTube']
    ].filter(([k]) => P[k]).map(([k, ic, n]) => `<a class="icon-btn" href="${esc(P[k])}" target="_blank" rel="noopener" aria-label="${n}">${ic}</a>`).join('');
    $('#profile').innerHTML = `
      ${P.avatar ? `<img class="avatar" src="${esc(P.avatar)}" alt="${esc(P.name)}">` : ''}
      <div>
        <h1>${esc(P.name || '')}</h1>
        <p class="headline">${esc(P.headline || '')}</p>
        <div class="meta-row">
          ${P.location ? `<span>${I.pin}${esc(P.location)}</span>` : ''}
          ${P.availability ? `<span class="avail">${esc(P.availability)}</span>` : ''}
        </div>
      </div>
      <div class="profile-actions">
        ${socials ? `<div class="socials">${socials}</div>` : ''}
        ${P.email ? `<a class="btn" href="mailto:${esc(P.email)}">${I.mail}Email</a>` : ''}
        ${P.whatsapp ? `<a class="btn" href="${esc(waLink())}" target="_blank" rel="noopener">${I.wa}WhatsApp</a>` : ''}
        <a class="btn btn-primary" href="${esc(hireHref())}" ${/^https?:/.test(hireHref()) ? 'target="_blank" rel="noopener"' : ''}>${esc(P.hireText || 'Hire me')}</a>
      </div>`;
    $('#footText').textContent = C.footerText || '';
    $('#footLinks').innerHTML = C.showAdminLink ? '<a href="admin.html">Manage portfolio</a>' : '';
  }

  function renderNav(active) {
    const count = id => ITEMS.filter(i => i.section === id).length;
    const tabs = [['#/', 'All', ITEMS.length, active === 'all'],
      ...SECTIONS.map(s => [`#/s/${s.id}`, s.title, count(s.id), active === s.id]),
      ['#/about', 'About', null, active === 'about']];
    $('#tabs').innerHTML = tabs.map(([h, t, n, a]) => `<a href="${h}" class="${a ? 'active' : ''}">${esc(t)}${n != null ? `<span class="n">${n}</span>` : ''}</a>`).join('');
    $('#topNav').innerHTML = SECTIONS.map(s => `<a href="#/s/${s.id}" class="${active === s.id ? 'active' : ''}">${esc(s.title)}</a>`).join('');
    const on = $('#tabs .active'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /* ---------- Tiles ---------- */
  function tileMedia(it) {
    const t = typeOf(it);
    const cover = it.cover || (t === 'image' && (it.images || [])[0]) || (t === 'video' && ytId(it.video) && `https://i.ytimg.com/vi/${ytId(it.video)}/hqdefault.jpg`);
    if (cover) return `<img src="${esc(cover)}" alt="" loading="lazy">`;
    if (t === 'video' && it.video) return `<video src="${esc(it.video)}#t=0.5" muted playsinline preload="metadata"></video>`;
    if (t === 'automation' && it.workflow) return `<div class="tile-svg" data-wf="${esc(it.workflow)}"></div>`;
    if (t === 'model') return `<div class="tile-svg" style="color:var(--muted)">${I.cube}</div>`;
    if ((it.images || [])[0]) return `<img src="${esc(it.images[0])}" alt="" loading="lazy">`;
    return `<div class="tile-svg"></div>`;
  }
  function tile(it) {
    const t = typeOf(it);
    const badge = t === 'image' ? (it.before ? I.compare : (it.images || []).length > 1 ? I.images : '') : TYPE_ICON[t];
    return `<a class="tile" href="#/p/${esc(it.id)}" aria-label="${esc(it.title)}">
      ${tileMedia(it)}
      ${it.featured ? '<span class="star">Featured</span>' : ''}
      ${badge ? `<span class="badge">${badge}</span>` : ''}
      <span class="tile-info"><b>${esc(it.title)}</b><span>${esc(sectionOf(it).title)}</span></span>
    </a>`;
  }
  function hydrateTiles(root) {
    root.querySelectorAll('[data-wf]').forEach(el => {
      getWorkflow(el.dataset.wf).then(wf => { el.innerHTML = window.N8N.render(wf, { compact: true }); }).catch(() => { el.innerHTML = I.flow; });
    });
  }

  /* ---------- Views ---------- */
  let q = '';
  let lastList = '#/';
  function renderList(sectionId) {
    renderNav(sectionId || 'all');
    const s = SECTIONS.find(x => x.id === sectionId);
    let list = sectionId ? ITEMS.filter(i => i.section === sectionId) : ITEMS;
    if (q) list = ITEMS.filter(i => [i.title, i.description, (i.tags || []).join(' '), (i.tools || []).join(' '), sectionOf(i).title].join(' ').toLowerCase().includes(q));
    list = sorted(list);
    const head = q ? `<div class="section-head"><div><h2>Results for “${esc(q)}”</h2><p>${list.length} project${list.length === 1 ? '' : 's'}</p></div></div>`
      : s ? `<div class="section-head"><div><h2>${esc(s.title)}</h2>${s.blurb ? `<p>${esc(s.blurb)}</p>` : ''}</div></div>`
      : `<div class="section-head"><div><h2>All work</h2></div></div>`;
    const empty = q ? `No project matches “${esc(q)}”.` : 'No projects here yet.';
    $('#main').innerHTML = head + `<div class="grid">${list.length ? list.map(tile).join('') : `<div class="empty">${empty}</div>`}</div>`;
    hydrateTiles($('#main'));
  }

  function renderAbout() {
    renderNav('about');
    const exp = (P.experience || []).map(e => `<li><b>${esc(e.role)}</b><span>${esc(e.company)}${e.period ? ` · ${esc(e.period)}` : ''}</span></li>`).join('');
    const contacts = [
      P.email && [`mailto:${P.email}`, I.mail, P.email],
      P.whatsapp && [waLink(), I.wa, 'WhatsApp +' + String(P.whatsapp).replace(/\D/g, '')],
      P.instagram && [P.instagram, I.ig, 'Instagram'], P.behance && [P.behance, I.be, 'Behance'],
      P.linkedin && [P.linkedin, I.in, 'LinkedIn'], P.youtube && [P.youtube, I.yt, 'YouTube']
    ].filter(Boolean).map(([h, ic, t]) => `<a href="${esc(h)}" ${/^https?:/.test(h) ? 'target="_blank" rel="noopener"' : ''}>${ic}${esc(t)}</a>`).join('');
    $('#main').innerHTML = `<div class="about">
      <div>
        <div class="card"><h2>About me</h2>${String(P.bio || '').split(/\n{2,}/).map(p => `<p>${esc(p)}</p>`).join('')}</div>
        ${(P.skills || []).length ? `<div class="card"><h2>What I do</h2><div class="chips">${P.skills.map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div></div>` : ''}
        ${exp ? `<div class="card"><h2>Experience</h2><ul class="exp">${exp}</ul></div>` : ''}
      </div>
      <div>
        <div class="card"><h2>Let's work together</h2><p style="color:var(--muted)">Tell me about your project and I'll reply within a day.</p><div class="contact-list">${contacts}</div></div>
        ${(P.software || []).length ? `<div class="card"><h2>Software</h2><div class="chips">${P.software.map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div></div>` : ''}
      </div>
    </div>`;
  }

  /* ---------- Project viewer ---------- */
  let v3d = null;
  function closeViewer() {
    if (v3d) { v3d.dispose(); v3d = null; }
    const v = $('#viewer'); v.hidden = true; v.innerHTML = ''; document.body.style.overflow = '';
  }
  function baSlider(after, before) {
    return `<div class="ba" style="--pos:50%">
      <img src="${esc(after)}" alt="After">
      <div class="ba-before"><img src="${esc(before)}" alt="Before"></div>
      <span class="ba-line"></span><span class="ba-knob">${I.arrows}</span>
      <span class="ba-tag l">Before</span><span class="ba-tag r">After</span>
      <input type="range" min="0" max="100" value="50" aria-label="Compare before and after">
    </div>`;
  }
  function videoEmbed(src, poster) {
    const y = ytId(src), vm = vimeoId(src);
    if (y) return `<iframe src="https://www.youtube.com/embed/${y}?rel=0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen title="Video"></iframe>`;
    if (vm) return `<iframe src="https://player.vimeo.com/video/${vm}" allow="autoplay; fullscreen" allowfullscreen title="Video"></iframe>`;
    return `<video src="${esc(src)}" ${poster ? `poster="${esc(poster)}"` : ''} controls playsinline preload="metadata"></video>`;
  }

  function openProject(id) {
    const it = ITEMS.find(i => i.id === id);
    if (!it) { location.hash = '#/'; return; }
    const s = sectionOf(it), t = s.type;
    const siblings = sorted(ITEMS.filter(i => i.section === it.section));
    const idx = siblings.indexOf(it);
    const prev = siblings[(idx - 1 + siblings.length) % siblings.length], next = siblings[(idx + 1) % siblings.length];
    const imgs = it.images || [];
    let media = '';
    if (t === 'image') {
      if (it.before && imgs[0]) media += baSlider(imgs[0], it.before);
      media += (it.before ? imgs.slice(1) : imgs).map(src => `<img src="${esc(src)}" alt="${esc(it.title)}" loading="lazy">`).join('');
    } else if (t === 'video') {
      media += it.video ? videoEmbed(it.video, it.cover) : '';
    } else if (t === 'model') {
      media += `<div class="v3d-wrap"><div class="v3d" id="v3d"></div>
        <div class="v3d-bar">
          <button class="btn" data-3d="rotate" aria-pressed="true">Auto-rotate</button>
          <button class="btn" data-3d="wire" aria-pressed="false">Wireframe</button>
          <button class="btn" data-3d="bg">Background</button>
          <button class="btn" data-3d="reset">Reset view</button>
          <button class="btn" data-3d="full">${I.full}Fullscreen</button>
          <span class="hint">Drag to rotate, scroll to zoom, right-drag to move</span>
        </div></div>`;
    } else if (t === 'automation') {
      media += `<div class="flow" id="flow"><div class="v3d-status" style="position:static;min-height:200px">Loading workflow…</div></div>`;
    }
    if (t !== 'image') media += imgs.map(src => `<img src="${esc(src)}" alt="${esc(it.title)}" loading="lazy">`).join('');

    const kv = [['Category', s.title], ['Date', fmtDate(it.date)], ['Client', it.client], ['Credit', it.credit]].filter(r => r[1]);
    const more = siblings.filter(x => x !== it).slice(0, 6);
    const v = $('#viewer');
    v.innerHTML = `
      <div class="viewer-top">
        <button class="icon-btn" data-act="close" aria-label="Close">${I.close}</button>
        <span class="title">${esc(it.title)}</span>
        <button class="icon-btn" data-act="copy-link" aria-label="Copy link">${I.link}</button>
        ${siblings.length > 1 ? `<a class="icon-btn" href="#/p/${esc(prev.id)}" aria-label="Previous project">${I.left}</a><a class="icon-btn" href="#/p/${esc(next.id)}" aria-label="Next project">${I.right}</a>` : ''}
      </div>
      <div class="viewer-body">
        <div class="viewer-media">${media || '<div class="empty">No media added yet.</div>'}</div>
        <aside class="viewer-side">
          <div class="artist">${P.avatar ? `<img src="${esc(P.avatar)}" alt="">` : ''}<div><b>${esc(P.name || '')}</b><span>${esc(P.headline || '')}</span></div></div>
          <a class="btn btn-primary" href="${esc(hireHref())}" ${/^https?:/.test(hireHref()) ? 'target="_blank" rel="noopener"' : ''}>${esc(P.hireText || 'Hire me')}</a>
          <h1 id="vTitle">${esc(it.title)}</h1>
          ${it.description ? `<p>${esc(it.description)}</p>` : ''}
          <div id="extra"></div>
          ${kv.length ? `<dl class="kv">${kv.map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join('')}</dl>` : ''}
          ${(it.tools || []).length ? `<div><div class="label">Software</div><div class="chips">${it.tools.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div></div>` : ''}
          ${(it.tags || []).length ? `<div><div class="label">Tags</div><div class="chips">${it.tags.map(x => `<span class="chip">#${esc(x)}</span>`).join('')}</div></div>` : ''}
          ${more.length ? `<div><div class="label">More ${esc(s.title)}</div><div class="more">${more.map(tile).join('')}</div></div>` : ''}
        </aside>
      </div>`;
    v.hidden = false; v.scrollTop = 0; document.body.style.overflow = 'hidden';
    hydrateTiles(v);
    v.tabIndex = -1; v.focus({ preventScroll: true });

    if (t === 'model' && it.model) loadModel(it);
    if (t === 'automation' && it.workflow) loadFlow(it);
  }

  async function loadModel(it) {
    const el = $('#v3d');
    try {
      const mod = await import(new URL('viewer3d.js', HERE).href);
      if (!el.isConnected) return;
      v3d = await mod.mountViewer(el, it.model, { ext: it.modelFormat });
      if (!el.isConnected || !v3d.loaded) return;
      const inf = v3d.info();
      $('#extra').innerHTML = `<dl class="kv"><dt>Format</dt><dd>${esc(inf.format)}</dd><dt>Meshes</dt><dd>${inf.meshes}</dd><dt>Triangles</dt><dd>${inf.triangles.toLocaleString('en-IN')}</dd>${inf.animated ? '<dt>Animation</dt><dd>Yes</dd>' : ''}</dl>`;
    } catch (e) {
      el.innerHTML = '<div class="v3d-status err">The 3D viewer could not start. Check your internet connection and try again.</div>';
      console.error(e);
    }
  }
  const BGS = ['', 'radial-gradient(circle at 50% 35%, #FFFFFF, #D9DDE3)', '#000000', 'radial-gradient(circle at 50% 35%, #3B3F48, #16181D)'];
  let bgIdx = 0;

  async function loadFlow(it) {
    const box = $('#flow');
    try {
      const wf = await getWorkflow(it.workflow);
      if (!box.isConnected) return;
      box.innerHTML = window.N8N.render(wf);
      const sm = window.N8N.summary(wf);
      const file = it.workflow.split('/').pop();
      box.insertAdjacentHTML('afterend', `<div class="v3d-bar">
        <a class="btn btn-primary" href="${esc(it.workflow)}" download="${esc(file)}">${I.download}Download workflow</a>
        <button class="btn" data-act="copy-wf">${I.copy}Copy JSON</button>
        <span class="hint">${sm.nodes} nodes${sm.trigger ? `, starts with ${esc(sm.trigger)}` : ''}</span></div>`);
      $('#extra').innerHTML = `<div><div class="label">Workflow steps</div><ul class="node-list">${sm.list.map(n => `<li><i style="background:${n.color}"></i>${esc(n.name)}<span>${esc(n.app)}</span></li>`).join('')}</ul></div>
        <div class="import-help">To use it: open n8n, choose <b>Import from file</b> (or paste the copied JSON on the canvas), then connect your own accounts.</div>`;
    } catch (e) {
      box.innerHTML = '<div class="v3d-status err" style="position:static;min-height:160px">This workflow file could not be loaded.</div>';
    }
  }

  /* ---------- Events ---------- */
  $('#viewer').addEventListener('click', async e => {
    const a = e.target.closest('[data-act]'), b3 = e.target.closest('[data-3d]');
    if (a) {
      if (a.dataset.act === 'close') location.hash = lastList;
      if (a.dataset.act === 'copy-link') copy(location.href, 'Link copied');
      if (a.dataset.act === 'copy-wf') {
        const it = ITEMS.find(i => location.hash.endsWith('/' + i.id));
        if (it) getWorkflow(it.workflow).then(wf => copy(JSON.stringify(wf, null, 2), 'Workflow JSON copied'));
      }
    }
    if (b3 && v3d) {
      const k = b3.dataset['3d'];
      if (k === 'rotate' || k === 'wire') {
        const on = b3.getAttribute('aria-pressed') !== 'true';
        b3.setAttribute('aria-pressed', on);
        k === 'rotate' ? v3d.setAutoRotate(on) : v3d.setWireframe(on);
      }
      if (k === 'reset') v3d.reset();
      if (k === 'bg') { bgIdx = (bgIdx + 1) % BGS.length; v3d.setBackground(BGS[bgIdx]); }
      if (k === 'full') { const el = $('#v3d'); document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen && el.requestFullscreen(); }
    }
  });
  $('#viewer').addEventListener('input', e => {
    if (e.target.matches('.ba input')) e.target.closest('.ba').style.setProperty('--pos', e.target.value + '%');
  });
  document.addEventListener('keydown', e => {
    if ($('#viewer').hidden) return;
    if (e.key === 'Escape') location.hash = lastList;
    if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'range') return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (e.target.type === 'range') return;
      const l = $(`#viewer .viewer-top a[aria-label="${e.key === 'ArrowLeft' ? 'Previous' : 'Next'} project"]`);
      if (l) location.hash = l.getAttribute('href');
    }
  });
  document.addEventListener('mouseover', e => { const vd = e.target.closest('.tile')?.querySelector('video'); if (vd) vd.play().catch(() => {}); });
  document.addEventListener('mouseout', e => { const t = e.target.closest('.tile'); if (t && !t.contains(e.relatedTarget)) t.querySelector('video')?.pause(); });

  let st;
  $('#q').addEventListener('input', e => {
    clearTimeout(st);
    st = setTimeout(() => { q = e.target.value.trim().toLowerCase(); if (location.hash.startsWith('#/about') || location.hash.startsWith('#/s/')) location.hash = '#/'; else renderList(); }, 150);
  });
  $('#searchBtn').addEventListener('click', () => { const b = $('#searchBox'); b.classList.toggle('open'); if (b.classList.contains('open')) $('#q').focus(); });
  $('#q').addEventListener('blur', () => { if (!$('#q').value) $('#searchBox').classList.remove('open'); });
  $('#themeBtn').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next; store.set('pf-theme', next);
  });

  function copy(text, msg) {
    const ok = () => toast(msg);
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, fb); else fb();
    function fb() { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) {} ta.remove(); }
  }
  let tt;
  function toast(m) { const el = $('#toast'); el.textContent = m; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 1700); }

  /* ---------- Router: #/  #/s/<section>  #/about  #/p/<project> ---------- */
  let listRendered = false;
  function route() {
    const h = location.hash || '#/';
    const m = h.match(/^#\/p\/(.+)$/);
    if (m) {
      if (!listRendered) { renderList(); listRendered = true; }
      closeViewer();
      openProject(decodeURIComponent(m[1]));
      return;
    }
    closeViewer();
    lastList = h;
    listRendered = true;
    if (h === '#/about') renderAbout();
    else if (h.startsWith('#/s/')) renderList(decodeURIComponent(h.slice(4)));
    else renderList();
  }
  window.addEventListener('hashchange', route);
  applyShell();
  route();
})();
