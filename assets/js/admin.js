/* Admin: edits a working copy of data/site-data.js, uploads files and commits everything to GitHub. */
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const DATA_PATH = 'data/site-data.js';
  const clone = o => JSON.parse(JSON.stringify(o));
  let W = clone(window.SITE_DATA || { config: {}, styles: [], images: [], videos: [] });
  W.styles ||= []; W.images ||= []; W.videos ||= []; W.config ||= {};
  const fileInput = document.getElementById('fFile');
  const pending = {};          // repo path -> { b64, url }
  let dirty = false, tab = 'images', editId = null, editStyle = null;
  const theme = store.get('dp-theme', null); if (theme) document.documentElement.dataset.theme = theme;
  if (W.config.accent) document.documentElement.style.setProperty('--accent', W.config.accent);

  const slug = s => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';
  const today = () => new Date().toISOString().slice(0, 10) + 'T' + new Date().toTimeString().slice(0, 8);
  const isVideo = src => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(src || '');
  const thumb = src => pending[src]?.url || src;
  const styleName = id => W.styles.find(s => s.id === id)?.name || 'No style';

  function setDirty(v) {
    dirty = v;
    const n = Object.keys(pending).length;
    $('#status').textContent = v ? `Unpublished changes${n ? ` (${n} file${n > 1 ? 's' : ''} to upload)` : ''}` : 'No changes';
    $('#status').classList.toggle('dirty', v);
  }
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  let tt;
  function toast(m) { const el = $('#toast'); el.textContent = m; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 1800); }
  function log(m) { const el = $('#log'); el.textContent += '\n' + m; el.scrollTop = el.scrollHeight; }

  /* ---------- Tabs ---------- */
  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    tab = b.dataset.tab;
    document.querySelectorAll('#tabs .chip').forEach(c => c.setAttribute('aria-pressed', c === b));
    $('#tab-items').hidden = !(tab === 'images' || tab === 'videos');
    $('#tab-styles').hidden = tab !== 'styles';
    $('#tab-site').hidden = tab !== 'site';
    $('#tab-github').hidden = tab !== 'github';
    if (tab === 'images' || tab === 'videos') { resetItem(); renderItems(); }
  });

  /* ---------- Items (images / videos) ---------- */
  const kindLabel = () => tab === 'videos' ? 'video' : 'image';
  function fillStyleSelect() {
    $('#fStyle').innerHTML = '<option value="">No style</option>' + W.styles.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
  }
  function resetItem() {
    editId = null; $('#itemForm').reset(); fileInput.value = '';
    $('#drop').innerHTML = 'Drop a file here or click to choose';
    $('#drop').appendChild(fileInput);
    $('#itemFormTitle').textContent = `Add ${kindLabel()}`;
    $('#itemSubmit').textContent = 'Add to timeline';
    $('#posterField').hidden = tab !== 'videos';
    fileInput.accept = tab === 'videos' ? 'video/mp4,video/webm' : 'image/*';
    $('#fileHint').textContent = tab === 'videos' ? 'MP4 or WEBM, ideally under 20 MB (5–15 sec, compressed). Bigger? Paste a YouTube or cloud link.' : 'JPG, PNG, WEBP, GIF or SVG. Keep images under 5 MB.';
    $('#listTitle').textContent = tab === 'videos' ? 'Videos' : 'Images';
    fillStyleSelect();
  }
  function previewFile(file) {
    const url = URL.createObjectURL(file);
    $('#drop').innerHTML = `${esc(file.name)} (${(file.size / 1e6).toFixed(1)} MB)` + (file.type.startsWith('video') ? `<video src="${url}" muted autoplay loop playsinline></video>` : `<img src="${url}" alt="">`);
    $('#drop').appendChild(fileInput);
  }
  $('#drop').addEventListener('click', e => { if (e.target.id !== 'fFile') fileInput.click(); });
  $('#drop').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
  $('#drop').addEventListener('dragover', e => { e.preventDefault(); $('#drop').classList.add('over'); });
  $('#drop').addEventListener('dragleave', () => $('#drop').classList.remove('over'));
  $('#drop').addEventListener('drop', e => {
    e.preventDefault(); $('#drop').classList.remove('over');
    const f = e.dataTransfer.files[0]; if (!f) return;
    const dt = new DataTransfer(); dt.items.add(f); fileInput.files = dt.files; previewFile(f);
  });
  fileInput.addEventListener('change', () => { const f = fileInput.files[0]; if (f) previewFile(f); });

  const fileToB64 = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(r.error); r.readAsDataURL(f); });

  $('#itemForm').addEventListener('submit', async e => {
    e.preventDefault();
    const list = W[tab];
    const old = editId ? list.find(i => i.id === editId) : null;
    const file = fileInput.files[0];
    let src = $('#fUrl').value.trim() || (old ? old.src : '');
    const title = $('#fTitle').value.trim();
    if (file) {
      const max = tab === 'videos' ? 50e6 : 10e6;
      if (file.size > max) { alert(`This file is ${(file.size / 1e6).toFixed(1)} MB. The limit here is ${max / 1e6} MB. Compress it, or paste a link instead.`); return; }
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      src = `assets/uploads/${tab}/${Date.now()}-${slug(title)}.${ext}`;
      pending[src] = { b64: await fileToB64(file), url: URL.createObjectURL(file) };
    }
    if (!src) { alert('Add a file or paste a link first.'); return; }
    let json = $('#fJson').value.trim();
    if (json) { try { json = JSON.parse(json); } catch (err) { /* keep as plain text */ } }
    const item = {
      id: old ? old.id : `${tab === 'videos' ? 'vid' : 'img'}-${Date.now().toString(36)}`,
      title, style: $('#fStyle').value, model: $('#fModel').value.trim(), ratio: $('#fRatio').value.trim(),
      prompt: $('#fPrompt').value.trim(), tags: $('#fTags').value.split(',').map(t => t.trim()).filter(Boolean),
      src, credit: $('#fCredit').value.trim(), date: old ? old.date : today()
    };
    if (json) item.jsonPrompt = json;
    if (tab === 'videos' && $('#fPoster').value.trim()) item.poster = $('#fPoster').value.trim();
    Object.keys(item).forEach(k => { if (item[k] === '' || (Array.isArray(item[k]) && !item[k].length)) delete item[k]; });
    item.title = title; item.prompt = item.prompt || '';
    if (old) { if (old.src !== src && pending[old.src]) delete pending[old.src]; list[list.indexOf(old)] = item; }
    else list.unshift(item);
    setDirty(true); toast(old ? 'Changes saved. Publish to make them live.' : 'Added. Publish to make it live.');
    resetItem(); renderItems();
  });
  $('#itemReset').addEventListener('click', resetItem);

  function renderItems() {
    const q = $('#listSearch').value.trim().toLowerCase();
    const list = W[tab].slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .filter(i => !q || [i.title, i.prompt, styleName(i.style)].join(' ').toLowerCase().includes(q));
    $('#itemList').innerHTML = list.length ? list.map(i => {
      const t = thumb(i.poster || i.src);
      const vis = isVideo(t) ? `<video class="thumb" src="${esc(t)}#t=0.1" muted preload="metadata"></video>` : `<img class="thumb" src="${esc(t)}" alt="" loading="lazy">`;
      return `<div class="item-row">${vis}<div><div class="t">${esc(i.title)}</div><div class="s">${esc(styleName(i.style))}${pending[i.src] ? ' (not uploaded yet)' : ''}</div></div>
        <div class="btns"><button class="btn" data-edit="${esc(i.id)}">Edit</button><button class="btn btn-danger" data-del="${esc(i.id)}">Delete</button></div></div>`;
    }).join('') : '<div class="empty">Nothing here yet. Add your first one with the form.</div>';
  }
  $('#listSearch').addEventListener('input', renderItems);
  $('#itemList').addEventListener('click', e => {
    const ed = e.target.closest('[data-edit]'), de = e.target.closest('[data-del]');
    if (ed) {
      const i = W[tab].find(x => x.id === ed.dataset.edit); if (!i) return;
      resetItem(); editId = i.id;
      $('#itemFormTitle').textContent = `Edit ${kindLabel()}`; $('#itemSubmit').textContent = 'Save changes';
      $('#fUrl').value = pending[i.src] ? '' : i.src; $('#fTitle').value = i.title || ''; $('#fStyle').value = i.style || '';
      $('#fModel').value = i.model || ''; $('#fPrompt').value = i.prompt || ''; $('#fRatio').value = i.ratio || '';
      $('#fTags').value = (i.tags || []).join(', '); $('#fCredit').value = i.credit || ''; $('#fPoster').value = i.poster || '';
      $('#fJson').value = i.jsonPrompt ? (typeof i.jsonPrompt === 'string' ? i.jsonPrompt : JSON.stringify(i.jsonPrompt, null, 2)) : '';
      $('#drop').innerHTML = 'Current file kept. Drop a new file to replace it.'; $('#drop').appendChild(fileInput);
      $('#itemForm').scrollIntoView({ behavior: 'smooth' });
    }
    if (de) {
      const i = W[tab].find(x => x.id === de.dataset.del); if (!i) return;
      if (!confirm(`Delete “${i.title}”? It disappears from the site after you publish.`)) return;
      if (pending[i.src]) delete pending[i.src];
      W[tab] = W[tab].filter(x => x !== i); setDirty(true); renderItems(); toast('Deleted. Publish to update the site.');
    }
  });

  /* ---------- Styles ---------- */
  function resetStyle() { editStyle = null; $('#styleForm').reset(); $('#styleFormTitle').textContent = 'Add design style'; $('#styleSubmit').textContent = 'Add style'; }
  function renderStyles() {
    $('#styleList').innerHTML = W.styles.map((s, idx) => {
      const n = W.images.filter(i => i.style === s.id).length + W.videos.filter(i => i.style === s.id).length;
      const sw = (s.palette || []).slice(0, 5).map(c => `<span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:${esc(c)};margin-right:3px;border:1px solid var(--line)"></span>`).join('');
      return `<div class="item-row" style="grid-template-columns:1fr auto"><div><div class="t">${esc(s.name)}</div><div class="s">${sw} ${n} item${n === 1 ? '' : 's'}</div></div>
        <div class="btns"><button class="btn" data-up="${idx}" title="Move up" ${idx ? '' : 'disabled'}>↑</button><button class="btn" data-sedit="${esc(s.id)}">Edit</button><button class="btn btn-danger" data-sdel="${esc(s.id)}">Delete</button></div></div>`;
    }).join('') || '<div class="empty">No styles yet.</div>';
  }
  $('#styleForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#sName').value.trim(); if (!name) return;
    const s = {
      id: editStyle || (() => { let id = slug(name), n = 2; while (W.styles.some(x => x.id === id)) id = slug(name) + '-' + n++; return id; })(),
      name, theory: $('#sTheory').value.trim(), palette: $('#sPalette').value.split(',').map(c => c.trim()).filter(Boolean),
      fonts: $('#sFonts').value.trim(), bestFor: $('#sBest').value.trim()
    };
    if (editStyle) W.styles[W.styles.findIndex(x => x.id === editStyle)] = s; else W.styles.push(s);
    setDirty(true); toast(editStyle ? 'Style updated' : 'Style added'); resetStyle(); renderStyles(); fillStyleSelect();
  });
  $('#styleReset').addEventListener('click', resetStyle);
  $('#styleList').addEventListener('click', e => {
    const ed = e.target.closest('[data-sedit]'), de = e.target.closest('[data-sdel]'), up = e.target.closest('[data-up]');
    if (up) { const i = +up.dataset.up; [W.styles[i - 1], W.styles[i]] = [W.styles[i], W.styles[i - 1]]; setDirty(true); renderStyles(); }
    if (ed) {
      const s = W.styles.find(x => x.id === ed.dataset.sedit); editStyle = s.id;
      $('#sName').value = s.name; $('#sTheory').value = s.theory || ''; $('#sPalette').value = (s.palette || []).join(', ');
      $('#sFonts').value = s.fonts || ''; $('#sBest').value = s.bestFor || '';
      $('#styleFormTitle').textContent = 'Edit design style'; $('#styleSubmit').textContent = 'Save changes';
      $('#styleForm').scrollIntoView({ behavior: 'smooth' });
    }
    if (de) {
      const s = W.styles.find(x => x.id === de.dataset.sdel);
      const n = W.images.filter(i => i.style === s.id).length + W.videos.filter(i => i.style === s.id).length;
      if (!confirm(`Delete the “${s.name}” style?` + (n ? ` Its ${n} item(s) stay on the site without a style.` : ''))) return;
      W.styles = W.styles.filter(x => x !== s); setDirty(true); renderStyles(); fillStyleSelect();
    }
  });

  /* ---------- Site settings ---------- */
  function fillSite() {
    const c = W.config;
    $('#cName').value = c.siteName || ''; $('#cEmoji').value = c.logoEmoji || ''; $('#cAccent').value = c.accent || '#5B3DF5';
    $('#cImgH').value = c.imagesHeading || ''; $('#cImgP').value = c.imagesIntro || '';
    $('#cVidH').value = c.videosHeading || ''; $('#cVidP').value = c.videosIntro || '';
    $('#cFoot').value = c.footerText || ''; $('#cAdmin').checked = c.showAdminLink !== false;
  }
  $('#siteForm').addEventListener('submit', e => {
    e.preventDefault();
    Object.assign(W.config, {
      siteName: $('#cName').value.trim(), logoEmoji: $('#cEmoji').value.trim(), accent: $('#cAccent').value,
      imagesHeading: $('#cImgH').value.trim(), imagesIntro: $('#cImgP').value.trim(),
      videosHeading: $('#cVidH').value.trim(), videosIntro: $('#cVidP').value.trim(),
      footerText: $('#cFoot').value.trim(), showAdminLink: $('#cAdmin').checked
    });
    document.documentElement.style.setProperty('--accent', W.config.accent);
    setDirty(true); toast('Settings saved. Publish to make them live.');
  });

  /* ---------- GitHub ---------- */
  let gh = store.get('dp-gh', { owner: '', repo: '', branch: 'main', token: '' });
  $('#gOwner').value = gh.owner; $('#gRepo').value = gh.repo; $('#gBranch').value = gh.branch || 'main'; $('#gToken').value = gh.token;
  const u8b64 = str => { const b = new TextEncoder().encode(str); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  const b64u8 = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)));
  const ready = () => gh.owner && gh.repo && gh.token;
  async function api(path, opts = {}) {
    const r = await fetch(`https://api.github.com/repos/${gh.owner}/${gh.repo}${path}`, {
      ...opts, headers: { Authorization: `Bearer ${gh.token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }
    });
    if (!r.ok) { const j = await r.json().catch(() => ({})); const err = new Error(`${r.status} ${j.message || r.statusText}`); err.status = r.status; throw err; }
    return r.json();
  }
  const enc = p => p.split('/').map(encodeURIComponent).join('/');
  async function getFile(path) {
    try { return await api(`/contents/${enc(path)}?ref=${encodeURIComponent(gh.branch)}&t=${Date.now()}`); }
    catch (e) { if (e.status === 404) return null; throw e; }
  }
  async function putFile(path, b64, message) {
    const cur = await getFile(path);
    return api(`/contents/${enc(path)}`, { method: 'PUT', body: JSON.stringify({ message, content: b64, branch: gh.branch, ...(cur ? { sha: cur.sha } : {}) }) });
  }
  $('#gSave').addEventListener('click', async () => {
    gh = { owner: $('#gOwner').value.trim(), repo: $('#gRepo').value.trim(), branch: $('#gBranch').value.trim() || 'main', token: $('#gToken').value.trim() };
    store.set('dp-gh', gh);
    if (!ready()) { log('Fill in username, repository and token.'); return; }
    try { const r = await api(''); log(`Connected to ${r.full_name}. Write access: ${r.permissions?.push ? 'yes' : 'no'}.`); toast('Connected to GitHub'); }
    catch (e) { log('Connection failed: ' + e.message + '. Check the username, repository name and token permissions.'); }
  });
  $('#gForget').addEventListener('click', () => { store.del('dp-gh'); gh = { owner: '', repo: '', branch: 'main', token: '' }; $('#gToken').value = ''; log('Token removed from this browser.'); });
  $('#gLoad').addEventListener('click', async () => {
    if (!ready()) return log('Connect GitHub first.');
    if (dirty && !confirm('Loading replaces your unpublished changes. Continue?')) return;
    try {
      const f = await getFile(DATA_PATH); if (!f) return log(`${DATA_PATH} not found in the repository.`);
      const text = b64u8(f.content);
      W = JSON.parse(text.slice(text.indexOf('=') + 1).trim().replace(/;\s*$/, ''));
      Object.keys(pending).forEach(k => delete pending[k]);
      setDirty(false); resetItem(); renderItems(); renderStyles(); fillSite(); log('Loaded the latest content from GitHub.');
    } catch (e) { log('Load failed: ' + e.message); }
  });

  const serialize = () => 'window.SITE_DATA = ' + JSON.stringify(W, null, 2) + ';\n';
  $('#pubBtn').addEventListener('click', async () => {
    if (!ready()) { $('#tabs [data-tab="github"]').click(); log('Connect GitHub first, then press Publish again.'); return; }
    if (!dirty) { toast('Nothing new to publish'); return; }
    $('#pubBtn').disabled = true; $('#tabs [data-tab="github"]').click();
    try {
      for (const path of Object.keys(pending)) {
        log('Uploading ' + path + ' …');
        await putFile(path, pending[path].b64, 'Upload ' + path.split('/').pop());
        delete pending[path];
      }
      log('Saving content …');
      await putFile(DATA_PATH, u8b64(serialize()), 'Update site content');
      setDirty(false); log('Published. The live site updates in about 1–2 minutes.'); toast('Published');
    } catch (e) { log('Publish failed: ' + e.message); setDirty(true); }
    $('#pubBtn').disabled = false;
  });
  $('#dlBtn').addEventListener('click', () => {
    if (Object.keys(pending).length) alert('Heads up: uploaded files are not inside this data file. Upload them by hand to the same paths (assets/uploads/…) or use Publish to GitHub.');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([serialize()], { type: 'text/javascript' }));
    a.download = 'site-data.js'; a.click();
  });

  resetItem(); renderItems(); renderStyles(); fillSite(); setDirty(false);
})();
