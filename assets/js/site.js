/* Gallery for index.html (images) and videos.html (videos).
   You normally never need to edit this file: change content in data/site-data.js or via admin.html. */
(() => {
  const D = window.SITE_DATA || { config: {}, styles: [], images: [], videos: [] };
  const C = D.config || {};
  const PAGE = document.body.dataset.page === 'videos' ? 'videos' : 'images';
  const ITEMS = (D[PAGE] || []).slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const styleOf = id => (D.styles || []).find(s => s.id === id);
  const isVideo = src => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(src || '');
  const ytId = src => { const m = (src || '').match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/); return m ? m[1] : null; };
  const state = { style: 'all', q: '', view: 'gallery' };
  let favs = store.get('dp-favs', []);

  /* ---------- Site settings ---------- */
  function applyConfig() {
    if (C.accent) document.documentElement.style.setProperty('--accent', C.accent);
    $('#brandMark').textContent = C.logoEmoji || '✦';
    $('#brandName').textContent = C.siteName || 'Design Prompts';
    document.title = (PAGE === 'videos' ? 'Videos | ' : '') + (C.siteName || 'Design Prompts');
    $('#heroTitle').textContent = PAGE === 'videos' ? (C.videosHeading || 'Video prompts') : (C.imagesHeading || C.tagline || '');
    $('#heroText').textContent = PAGE === 'videos' ? (C.videosIntro || '') : (C.imagesIntro || '');
    $('#footer').textContent = C.footerText || '';
    $('#sideFoot').innerHTML = C.showAdminLink === false ? '' : 'Have a new design? <a href="admin.html">Add it here</a>';
  }

  /* ---------- Theme ---------- */
  const savedTheme = store.get('dp-theme', null);
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  $('#themeBtn').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store.set('dp-theme', next);
  });
  $('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

  /* ---------- Routing via URL hash: #style=cyberpunk  #guide  #fav ---------- */
  function readHash() {
    const h = decodeURIComponent(location.hash.slice(1));
    state.view = h === 'guide' && PAGE === 'images' ? 'guide' : h === 'fav' ? 'fav' : 'gallery';
    state.style = h.startsWith('style=') ? h.slice(6) : 'all';
    render();
  }
  window.addEventListener('hashchange', readHash);

  /* ---------- Sidebar ---------- */
  function renderNav() {
    const links = [
      ['index.html', 'Images', PAGE === 'images' && state.view === 'gallery' && state.style === 'all'],
      ['videos.html', 'Videos', PAGE === 'videos' && state.view === 'gallery' && state.style === 'all'],
      ['index.html#guide', 'Style guide', state.view === 'guide'],
      [(PAGE === 'videos' ? 'videos.html' : 'index.html') + '#fav', 'Favorites', state.view === 'fav']
    ];
    $('#mainNav').innerHTML = links.map(([h, t, a]) => `<a href="${h}" class="${a ? 'active' : ''}">${t}</a>`).join('');
    $('#styleNav').innerHTML = (D.styles || []).map(s => {
      const n = ITEMS.filter(i => i.style === s.id).length;
      return `<a href="#style=${esc(s.id)}" class="${state.style === s.id ? 'active' : ''}">${esc(s.name)}<span class="count">${n}</span></a>`;
    }).join('');
  }

  function renderChips() {
    const used = PAGE === 'videos' ? (D.styles || []).filter(s => ITEMS.some(i => i.style === s.id)) : (D.styles || []);
    const chips = [{ id: 'all', name: 'All' }, ...used];
    $('#chips').innerHTML = chips.map(s =>
      `<button class="chip" data-style="${esc(s.id)}" aria-pressed="${state.view === 'gallery' && state.style === s.id}">${esc(s.name)}</button>`).join('');
    $('#chips').hidden = state.view === 'guide';
    const on = $('#chips [aria-pressed="true"]');
    if (on) $('#chips').scrollLeft = on.offsetLeft - $('#chips').offsetLeft - 16;
  }
  $('#chips').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    location.hash = b.dataset.style === 'all' ? '' : 'style=' + b.dataset.style;
    if (b.dataset.style === 'all') readHash();
  });

  /* ---------- Style theory panel ---------- */
  function panel(s, headingTag = 'h2') {
    if (!s) return '';
    const sw = (s.palette || []).map(c => `<button class="swatch" style="background:${esc(c)}" data-copy="${esc(c)}" title="Copy ${esc(c)}"><span>${esc(c)}</span></button>`).join('');
    return `<section class="style-panel">
      <div>
        <${headingTag}>${esc(s.name)}</${headingTag}>
        <p>${esc(s.theory)}</p>
        <div class="facts">${s.fonts ? `<span><b>Fonts:</b> ${esc(s.fonts)}</span>` : ''}${s.bestFor ? `<span><b>Best for:</b> ${esc(s.bestFor)}</span>` : ''}</div>
      </div>
      <div class="swatches">${sw}</div>
    </section>`;
  }

  /* ---------- Cards ---------- */
  function media(it, forModal) {
    const src = it.src || '';
    const yt = ytId(src);
    if (yt) return forModal
      ? `<iframe src="https://www.youtube.com/embed/${yt}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen title="${esc(it.title)}"></iframe>`
      : `<img class="yt" src="https://i.ytimg.com/vi/${yt}/hqdefault.jpg" alt="${esc(it.title)}" loading="lazy">`;
    if (isVideo(src)) {
      const poster = it.poster ? ` poster="${esc(it.poster)}"` : '';
      const s = it.poster ? src : src + '#t=0.1';
      return forModal
        ? `<video src="${esc(src)}"${poster} controls autoplay playsinline></video>`
        : `<video src="${esc(s)}"${poster} muted loop playsinline preload="metadata"></video>`;
    }
    return `<img src="${esc(src)}" alt="${esc(it.title)}" loading="lazy">`;
  }
  function card(it) {
    const s = styleOf(it.style);
    const moving = PAGE === 'videos';
    return `<article class="card" tabindex="0" data-id="${esc(it.id)}" aria-label="${esc(it.title)}">
      <div class="media">${media(it, false)}</div>
      ${moving ? '<span class="play">▶ Video</span>' : ''}
      ${favs.includes(it.id) ? '<span class="fav-mark">♥</span>' : ''}
      <div class="card-meta"><span class="card-title">${esc(it.title)}</span>${s ? `<span class="card-style">${esc(s.name)}</span>` : ''}</div>
    </article>`;
  }
  function grid(list, emptyMsg) {
    if (!list.length) return `<div class="empty">${emptyMsg}</div>`;
    return `<div class="grid">${list.map(card).join('')}</div>`;
  }
  function matches(it) {
    if (!state.q) return true;
    const s = styleOf(it.style);
    return [it.title, it.prompt, it.model, (it.tags || []).join(' '), s && s.name].join(' ').toLowerCase().includes(state.q);
  }

  /* ---------- Main render ---------- */
  function render() {
    renderNav(); renderChips();
    const addLink = C.showAdminLink === false ? '' : ' <a href="admin.html">Add one from the admin page.</a>';
    if (state.view === 'guide') {
      $('#stylePanel').innerHTML = '';
      $('#content').innerHTML = (D.styles || []).map(s => {
        const list = (D.images || []).filter(i => i.style === s.id && matches(i));
        return `<div class="guide-section" id="g-${esc(s.id)}">${panel(s)}${grid(list, 'No images for this style yet.' + addLink)}</div>`;
      }).join('');
      return;
    }
    let list = ITEMS.filter(matches);
    if (state.view === 'fav') list = list.filter(i => favs.includes(i.id));
    if (state.style !== 'all') list = list.filter(i => i.style === state.style);
    $('#stylePanel').innerHTML = state.view === 'gallery' && state.style !== 'all' ? panel(styleOf(state.style)) : '';
    const empty = state.view === 'fav' ? 'Tap the heart on any design to save it here.'
      : state.q ? `Nothing matches “${esc(state.q)}”. Try a style name like Retro or Aurora.`
      : 'Nothing here yet.' + addLink;
    $('#content').innerHTML = grid(list, empty);
  }

  /* ---------- Search ---------- */
  let t;
  $('#q').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); render(); }, 120); });

  /* ---------- Video hover preview ---------- */
  document.addEventListener('mouseover', e => { const v = e.target.closest('.card')?.querySelector('video'); if (v) v.play().catch(() => {}); });
  document.addEventListener('mouseout', e => { const c = e.target.closest('.card'); if (c && !c.contains(e.relatedTarget)) c.querySelector('video')?.pause(); });

  /* ---------- Modal ---------- */
  let current = null, tab = 'text';
  const all = () => [...(D.images || []), ...(D.videos || [])];
  function jsonPrompt(it) {
    if (it.jsonPrompt) return typeof it.jsonPrompt === 'string' ? it.jsonPrompt : JSON.stringify(it.jsonPrompt, null, 2);
    const s = styleOf(it.style);
    return JSON.stringify({ type: PAGE === 'videos' ? 'video' : 'image', prompt: it.prompt, style: s ? s.name : undefined, model: it.model || undefined, aspect_ratio: it.ratio || undefined }, null, 2);
  }
  function openModal(id) {
    current = all().find(i => i.id === id); if (!current) return;
    tab = 'text';
    $('#mMedia').innerHTML = media(current, true);
    drawInfo();
    $('#modal').hidden = false; document.body.style.overflow = 'hidden';
    $('#mClose').focus();
  }
  function drawInfo() {
    const it = current, s = styleOf(it.style), fav = favs.includes(it.id);
    const rows = [['Model', it.model], ['Ratio', it.ratio], ['Credit', it.credit]].filter(r => r[1]);
    $('#mInfo').innerHTML = `
      ${s ? `<a class="m-style" href="${PAGE === 'videos' ? 'videos.html' : 'index.html'}#style=${esc(s.id)}">${esc(s.name)}</a>` : ''}
      <h2 id="mTitle">${esc(it.title)}</h2>
      <div class="tabs" role="tablist">
        <button role="tab" data-tab="text" aria-selected="${tab === 'text'}">Prompt</button>
        <button role="tab" data-tab="json" aria-selected="${tab === 'json'}">JSON</button>
      </div>
      <pre class="prompt">${esc(tab === 'json' ? jsonPrompt(it) : it.prompt)}</pre>
      <div class="actions">
        <button class="btn btn-primary" data-act="copy">Copy prompt</button>
        <button class="btn" data-act="fav" aria-pressed="${fav}">${fav ? '♥ Saved' : '♡ Save'}</button>
        ${it.src && !ytId(it.src) ? `<a class="btn" href="${esc(it.src)}" target="_blank" rel="noopener">Open file</a>` : ''}
      </div>
      ${rows.length ? `<dl class="meta-list">${rows.map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join('')}</dl>` : ''}
      ${(it.tags || []).length ? `<div class="tags">${it.tags.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>` : ''}
      ${s ? `<p style="margin:0;color:var(--muted);font-size:14px">${esc(s.theory)}</p>` : ''}`;
  }
  function closeModal() { $('#modal').hidden = true; $('#mMedia').innerHTML = ''; document.body.style.overflow = ''; }
  $('#mClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
    if (e.key === 'Enter' && e.target.classList?.contains('card')) openModal(e.target.dataset.id);
  });
  $('#mInfo').addEventListener('click', e => {
    const tb = e.target.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; drawInfo(); return; }
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'copy') copy(tab === 'json' ? jsonPrompt(current) : current.prompt, tab === 'json' ? 'JSON prompt copied' : 'Prompt copied');
    if (a.dataset.act === 'fav') {
      favs = favs.includes(current.id) ? favs.filter(x => x !== current.id) : [...favs, current.id];
      store.set('dp-favs', favs); drawInfo(); render();
    }
  });
  document.addEventListener('click', e => {
    const c = e.target.closest('.card'); if (c) return openModal(c.dataset.id);
    const sw = e.target.closest('[data-copy]'); if (sw) copy(sw.dataset.copy, sw.dataset.copy + ' copied');
    if (e.target.closest('#styleNav a, #mainNav a')) $('#sidebar').classList.remove('open');
  });

  /* ---------- Copy + toast ---------- */
  function copy(text, msg) {
    const done = () => toast(msg);
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} ta.remove(); }
  }
  let tt;
  function toast(m) { const el = $('#toast'); el.textContent = m; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 1600); }

  applyConfig();
  readHash();
})();
