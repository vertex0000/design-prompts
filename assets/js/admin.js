/* Portfolio admin: edits a working copy of data/portfolio-data.js, uploads files and publishes to GitHub. */
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const DATA_PATH = 'data/portfolio-data.js';
  const HERE = (document.currentScript && document.currentScript.src) || location.href;
  const clone = o => JSON.parse(JSON.stringify(o));
  let W = normalize(clone(window.PORTFOLIO || {}));
  function normalize(d) { d.config ||= {}; d.profile ||= {}; d.sections ||= []; d.items ||= []; return d; }
  if (W.config.accent) document.documentElement.style.setProperty('--accent', W.config.accent);

  const pending = {};            // repo path -> { b64, url, ext }
  const pendingDeletes = new Set();
  let dirty = false;
  const slug = s => String(s).toLowerCase().trim().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'file';
  const extOf = n => (String(n).split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i) || [, ''])[1].toLowerCase();
  const resolve = p => (p && pending[p] ? pending[p].url : p);
  const sectionOf = id => W.sections.find(s => s.id === id);
  const typeOf = id => (sectionOf(id) || {}).type || 'image';
  const list = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
  const isVideo = p => /\.(mp4|webm|mov|m4v)$/i.test(String(p).split(/[?#]/)[0]) || /^video\//.test(pending[p]?.mime || '');

  function setDirty(v) {
    dirty = v;
    const n = Object.keys(pending).length;
    $('#status').textContent = v ? `Unpublished changes${n ? ` (${n} file${n > 1 ? 's' : ''} to upload)` : ''}` : 'No changes';
    $('#status').classList.toggle('dirty', v);
  }
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  let tt;
  function toast(m) { const el = $('#toast'); el.textContent = m; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 2000); }
  function log(m) { const el = $('#log'); el.textContent += '\n' + m; el.scrollTop = el.scrollHeight; }

  /* ---------- Tabs ---------- */
  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    $$('#tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
    ['projects', 'sections', 'profile', 'github'].forEach(t => { $('#tab-' + t).hidden = t !== b.dataset.tab; });
    if (b.dataset.tab === 'projects') { fillSectionSelects(); renderList(); }
  });

  /* ---------- Files ---------- */
  const RULES = {
    images: { accept: 'image/*', multiple: true, max: 15e6, folder: 'images', test: f => /^image\//.test(f.type) },
    extra: { accept: 'image/*', multiple: true, max: 15e6, folder: 'images', test: f => /^image\//.test(f.type) },
    before: { accept: 'image/*', max: 15e6, folder: 'images', test: f => /^image\//.test(f.type) },
    cover: { accept: 'image/*', max: 8e6, folder: 'images', test: f => /^image\//.test(f.type) },
    avatar: { accept: 'image/*', max: 5e6, folder: 'images', test: f => /^image\//.test(f.type) },
    banner: { accept: 'image/*', max: 10e6, folder: 'images', test: f => /^image\//.test(f.type) },
    video: { accept: 'video/mp4,video/webm,video/quicktime', max: 50e6, folder: 'videos', test: f => /^video\//.test(f.type) || /\.(mp4|webm|mov)$/i.test(f.name) },
    model: { accept: '.fbx,.glb,.gltf,.obj', max: 50e6, folder: 'models', test: f => /\.(fbx|glb|gltf|obj)$/i.test(f.name) },
    workflow: { accept: '.json,application/json', max: 5e6, folder: 'workflows', test: f => /\.json$/i.test(f.name) || f.type === 'application/json' }
  };
  const fileToB64 = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
  const u8b64 = str => { const b = new TextEncoder().encode(str); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  const b64u8 = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)));

  async function stage(kind, file) {
    const r = RULES[kind];
    if (!r.test(file)) { alert(`“${file.name}” is not the right kind of file here.`); return null; }
    if (file.size > r.max) { alert(`“${file.name}” is ${(file.size / 1e6).toFixed(1)} MB. The limit here is ${r.max / 1e6} MB. Compress it, or paste a link instead.`); return null; }
    const ext = extOf(file.name) || 'bin';
    const path = `assets/uploads/${r.folder}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}-${slug(file.name)}.${ext}`;
    pending[path] = { b64: await fileToB64(file), url: URL.createObjectURL(file), ext, mime: file.type };
    return path;
  }
  function stageData(folder, name, b64, mime) {
    const path = `assets/uploads/${folder}/${Date.now().toString(36)}-${name}`;
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    pending[path] = { b64, url: URL.createObjectURL(new Blob([u], { type: mime })), ext: extOf(name), mime };
    return path;
  }

  let pickKind = null;
  const picker = $('#picker');
  picker.addEventListener('change', () => { if (picker.files.length) handleFiles(pickKind, [...picker.files]); picker.value = ''; });
  document.addEventListener('click', e => {
    const d = e.target.closest('[data-drop]'); if (!d) return;
    pickKind = d.dataset.drop; picker.accept = RULES[pickKind].accept; picker.multiple = !!RULES[pickKind].multiple; picker.click();
  });
  document.addEventListener('keydown', e => { const d = e.target.closest && e.target.closest('[data-drop]'); if (d && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); d.click(); } });
  document.addEventListener('dragover', e => { const d = e.target.closest && e.target.closest('[data-drop]'); if (d) { e.preventDefault(); d.classList.add('over'); } });
  document.addEventListener('dragleave', e => { const d = e.target.closest && e.target.closest('[data-drop]'); if (d) d.classList.remove('over'); });
  document.addEventListener('drop', e => {
    const d = e.target.closest && e.target.closest('[data-drop]');
    if (!d) { if (e.dataTransfer?.files?.length) e.preventDefault(); return; }
    e.preventDefault(); d.classList.remove('over');
    const files = [...e.dataTransfer.files]; if (files.length) handleFiles(d.dataset.drop, RULES[d.dataset.drop].multiple ? files : files.slice(0, 1));
  });

  async function handleFiles(kind, files) {
    for (const f of files) {
      if (kind === 'workflow') {
        const text = await f.text();
        try { JSON.parse(text); } catch (e) { alert('That file is not valid JSON. Export the workflow from n8n again.'); continue; }
        $('#pWorkflowText').value = text;
      }
      const path = await stage(kind, f); if (!path) continue;
      if (kind === 'avatar' || kind === 'banner') { replaceUpload(W.profile[kind]); W.profile[kind] = path; renderProfileThumbs(); setDirty(true); continue; }
      if (kind === 'images' || kind === 'extra') F.images.push(path);
      else { dropPendingIfUnused(F[kind]); F[kind] = path; }
      if (kind === 'video') $('#pVideoUrl').value = '';
      if (kind === 'model') $('#pModelUrl').value = '';
    }
    renderFormMedia(kind);
  }
  function dropPendingIfUnused(p) { if (p && pending[p] && !JSON.stringify(W).includes(p)) delete pending[p]; }
  function replaceUpload(p) { if (!p) return; if (pending[p]) delete pending[p]; else if (p.startsWith('assets/uploads/')) pendingDeletes.add(p); }

  /* ---------- Project form ---------- */
  let F = blank(), editId = null, adminViewer = null, viewerSrc = null;
  function blank() { return { images: [], before: '', video: '', model: '', workflow: '', cover: '' }; }

  function fillSectionSelects() {
    const cur = $('#pSection').value, curF = $('#fSection').value;
    $('#pSection').innerHTML = W.sections.map(s => `<option value="${esc(s.id)}">${esc(s.title)}</option>`).join('');
    $('#fSection').innerHTML = '<option value="">All sections</option>' + W.sections.map(s => `<option value="${esc(s.id)}">${esc(s.title)}</option>`).join('');
    if (W.sections.some(s => s.id === cur)) $('#pSection').value = cur;
    $('#fSection').value = curF;
    showTypeFields();
  }
  const COVER_HINT = {
    image: 'Leave empty to use the first image.',
    video: 'Leave empty to use the video itself (YouTube thumbnails are automatic).',
    model: 'Leave empty to capture the 3D view automatically when you save.',
    automation: 'Leave empty to show the workflow diagram as the thumbnail.'
  };
  function showTypeFields() {
    const t = typeOf($('#pSection').value);
    $$('[data-type]').forEach(el => { el.hidden = el.dataset.type !== t; });
    $('[data-extra]').hidden = t === 'image';
    $('#coverHint').textContent = COVER_HINT[t] || '';
    renderFormMedia();
  }
  $('#pSection').addEventListener('change', showTypeFields);

  function thumb(p, kind, idx) {
    const src = resolve(p);
    const vis = isVideo(p) ? `<video src="${esc(src)}#t=0.5" muted preload="metadata"></video>`
      : /\.(fbx|glb|gltf|obj|json)$/i.test(p) ? `<div style="display:grid;place-items:center;height:100%;font-size:11px;font-weight:700">${esc(extOf(p).toUpperCase())}</div>`
      : `<img src="${esc(src)}" alt="">`;
    return `<div class="t" title="${esc(p)}">${vis}<button type="button" data-rm="${kind}" data-idx="${idx ?? ''}" aria-label="Remove">✕</button></div>`;
  }
  function renderFormMedia(changed) {
    const t = typeOf($('#pSection').value);
    $('#imagesThumbs').innerHTML = t === 'image' ? F.images.map((p, i) => thumb(p, 'images', i)).join('') : '';
    $('#extraThumbs').innerHTML = t !== 'image' ? F.images.map((p, i) => thumb(p, 'images', i)).join('') : '';
    $('#beforeThumbs').innerHTML = F.before ? thumb(F.before, 'before') : '';
    $('#videoThumbs').innerHTML = F.video ? thumb(F.video, 'video') : '';
    $('#coverThumbs').innerHTML = F.cover ? thumb(F.cover, 'cover') : '';
    if (t === 'automation') renderFlowPreview();
    if (t === 'model' && (changed === 'model' || changed === undefined)) renderModelPreview();
  }
  $('#pForm').addEventListener('click', e => {
    const b = e.target.closest('[data-rm]'); if (!b) return;
    const k = b.dataset.rm;
    if (k === 'images') { const [p] = F.images.splice(+b.dataset.idx, 1); dropPendingIfUnused(p); }
    else { dropPendingIfUnused(F[k]); F[k] = ''; }
    if (k === 'model') renderModelPreview();
    renderFormMedia(k);
  });

  function currentWorkflowText() { return $('#pWorkflowText').value.trim(); }
  function renderFlowPreview() {
    const box = $('#flowPreview'); const txt = currentWorkflowText();
    if (!txt) {
      if (F.workflow && !pending[F.workflow]) {
        fetch(F.workflow).then(r => r.text()).then(t => { if (!currentWorkflowText()) { $('#pWorkflowText').value = t; renderFlowPreview(); } }).catch(() => {});
      }
      box.hidden = true; return;
    }
    try { box.firstElementChild.innerHTML = window.N8N.render(JSON.parse(txt)); box.hidden = false; }
    catch (e) { box.hidden = false; box.firstElementChild.innerHTML = '<p style="color:#FF5A6E;margin:0">This is not valid workflow JSON yet.</p>'; }
  }
  $('#pWorkflowText').addEventListener('input', renderFlowPreview);

  async function renderModelPreview() {
    const src = $('#pModelUrl').value.trim() || F.model;
    if (src === viewerSrc && adminViewer) return;
    if (adminViewer) { adminViewer.dispose(); adminViewer = null; }
    viewerSrc = src;
    $('#modelPreview').hidden = !src; $('#snapBtn').hidden = !src;
    if (!src) return;
    try {
      const mod = await import(new URL('viewer3d.js', HERE).href);
      const v = await mod.mountViewer($('#adminV3d'), resolve(src), { ext: pending[src]?.ext || extOf(src) });
      if (viewerSrc !== src) { v.dispose(); return; }
      adminViewer = v;
    } catch (e) { $('#adminV3d').innerHTML = '<div class="v3d-status err">The 3D preview could not start (check your internet connection).</div>'; }
  }
  let mt; $('#pModelUrl').addEventListener('input', () => { clearTimeout(mt); mt = setTimeout(renderModelPreview, 600); });
  function snapCover() {
    if (!adminViewer || !adminViewer.loaded) return null;
    const data = adminViewer.capture('image/jpeg', 0.88).split(',')[1];
    dropPendingIfUnused(F.cover);
    F.cover = stageData('images', slug($('#pTitle').value || 'model') + '-cover.jpg', data, 'image/jpeg');
    return F.cover;
  }
  $('#snapBtn').addEventListener('click', () => { if (snapCover()) { renderFormMedia('cover'); toast('Cover captured'); } else toast('Wait for the model to finish loading'); });

  function resetForm() {
    editId = null; F = blank(); $('#pForm').reset();
    $('#pDate').value = new Date().toISOString().slice(0, 10);
    $('#pFormTitle').textContent = 'Add project'; $('#pSubmit').textContent = 'Add project';
    fillSectionSelects();
    const fs = $('#fSection').value; if (fs) { $('#pSection').value = fs; showTypeFields(); }
  }
  $('#pReset').addEventListener('click', resetForm);

  $('#pForm').addEventListener('submit', async e => {
    e.preventDefault();
    const section = $('#pSection').value, t = typeOf(section), title = $('#pTitle').value.trim();
    if (!section) return alert('Add a section first (Sections tab).');
    if (!title) { $('#pTitle').focus(); return alert('Give the project a title.'); }
    const item = {
      id: editId || 'p-' + Date.now().toString(36), section, title, description: $('#pDesc').value.trim(),
      images: F.images.slice(), cover: F.cover, tools: list($('#pTools').value), ai: list($('#pAi').value), prompt: $('#pPrompt').value.trim(), tags: list($('#pTags').value),
      client: $('#pClient').value.trim(), credit: $('#pCredit').value.trim(), date: $('#pDate').value, featured: $('#pFeatured').checked
    };
    if (t === 'image') {
      if (!item.images.length) return alert('Add at least one image.');
      item.before = F.before;
    }
    if (t === 'video') {
      item.video = $('#pVideoUrl').value.trim() || F.video;
      if (!item.video) return alert('Add a video file or paste a video link.');
    }
    if (t === 'model') {
      item.model = $('#pModelUrl').value.trim() || F.model;
      if (!item.model) return alert('Add a 3D model file or paste a link.');
      item.modelFormat = pending[item.model]?.ext || extOf(item.model) || 'fbx';
      if (!item.cover) item.cover = snapCover() || '';
    }
    if (t === 'automation') {
      const txt = currentWorkflowText();
      if (!txt && !F.workflow) return alert('Add the n8n workflow JSON.');
      if (txt) {
        let wf; try { wf = JSON.parse(txt); } catch (err) { return alert('The workflow JSON is not valid. Copy it from n8n again.'); }
        const same = F.workflow && pending[F.workflow] && b64u8(pending[F.workflow].b64) === txt;
        if (!same) {
          const orig = editId && W.items.find(i => i.id === editId);
          let origText = null;
          if (orig && orig.workflow && !pending[orig.workflow]) { try { origText = await (await fetch(orig.workflow)).text(); } catch (err) {} }
          if (origText === null || JSON.stringify(JSON.parse(origText)) !== JSON.stringify(wf)) {
            dropPendingIfUnused(F.workflow);
            F.workflow = stageData('workflows', slug(wf.name || title) + '.json', u8b64(JSON.stringify(wf, null, 2)), 'application/json');
          }
        }
      }
      item.workflow = F.workflow;
    }
    Object.keys(item).forEach(k => { if (item[k] === '' || item[k] === false || (Array.isArray(item[k]) && !item[k].length)) delete item[k]; });
    item.title = title;
    if (!item.date) item.date = new Date().toISOString().slice(0, 10);

    const old = editId ? W.items.find(i => i.id === editId) : null;
    if (old) {
      W.items[W.items.indexOf(old)] = item;
      filesOf(old).forEach(p => { if (!filesOf(item).includes(p)) replaceUpload(p); });
    } else W.items.unshift(item);
    setDirty(true);
    toast(old ? 'Saved. Publish to make it live.' : 'Added. Publish to make it live.');
    resetForm(); renderList();
  });
  const filesOf = it => [it.cover, it.before, it.video, it.model, it.workflow, ...(it.images || [])].filter(Boolean);

  function renderList() {
    const fs = $('#fSection').value, q = $('#fSearch').value.trim().toLowerCase();
    const rows = W.items.filter(i => (!fs || i.section === fs) && (!q || [i.title, i.description, (i.tags || []).join(' ')].join(' ').toLowerCase().includes(q)))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    $('#pList').innerHTML = rows.length ? rows.map(i => {
      const t = typeOf(i.section);
      const c = i.cover || (t === 'image' && (i.images || [])[0]);
      const th = c ? `<img class="th" src="${esc(resolve(c))}" alt="" loading="lazy">`
        : t === 'video' && i.video && !/youtu|vimeo/.test(i.video) ? `<video class="th" src="${esc(resolve(i.video))}#t=0.5" muted preload="metadata"></video>`
        : `<div class="th" style="font-size:11px;font-weight:700;color:var(--muted)">${t === 'automation' ? 'n8n' : t === 'model' ? '3D' : t.toUpperCase()}</div>`;
      const waiting = filesOf(i).some(p => pending[p]);
      return `<div class="item-row">${th}<div><div class="t1">${i.featured ? '★ ' : ''}${esc(i.title)}</div><div class="t2">${esc((sectionOf(i.section) || {}).title || 'No section')}${waiting ? ' · not uploaded yet' : ''}</div></div>
        <div class="btns"><button class="btn" data-edit="${esc(i.id)}">Edit</button><button class="btn btn-danger" data-del="${esc(i.id)}">Delete</button></div></div>`;
    }).join('') : '<div class="empty">No projects yet. Add your first one with the form.</div>';
  }
  $('#fSection').addEventListener('change', () => { renderList(); if (!editId && $('#fSection').value) { $('#pSection').value = $('#fSection').value; showTypeFields(); } });
  $('#fSearch').addEventListener('input', renderList);
  $('#pList').addEventListener('click', e => {
    const ed = e.target.closest('[data-edit]'), de = e.target.closest('[data-del]');
    if (ed) {
      const i = W.items.find(x => x.id === ed.dataset.edit); if (!i) return;
      resetForm(); editId = i.id;
      $('#pSection').value = i.section; $('#pTitle').value = i.title || ''; $('#pDesc').value = i.description || '';
      $('#pTools').value = (i.tools || []).join(', '); $('#pAi').value = (i.ai || []).join(', '); $('#pPrompt').value = i.prompt || ''; $('#pTags').value = (i.tags || []).join(', ');
      $('#pClient').value = i.client || ''; $('#pCredit').value = i.credit || ''; $('#pDate').value = (i.date || '').slice(0, 10); $('#pFeatured').checked = !!i.featured;
      F = { images: (i.images || []).slice(), before: i.before || '', video: '', model: '', workflow: i.workflow || '', cover: i.cover || '' };
      const t = typeOf(i.section);
      if (t === 'video') { if (/^(assets\/uploads\/)/.test(i.video) || pending[i.video]) F.video = i.video; else $('#pVideoUrl').value = i.video || ''; }
      if (t === 'model') { if (/^(assets\/)/.test(i.model) || pending[i.model]) F.model = i.model; else $('#pModelUrl').value = i.model || ''; }
      if (t === 'automation' && pending[i.workflow]) $('#pWorkflowText').value = b64u8(pending[i.workflow].b64);
      $('#pFormTitle').textContent = 'Edit project'; $('#pSubmit').textContent = 'Save changes';
      showTypeFields();
      $('#pForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (de) {
      const i = W.items.find(x => x.id === de.dataset.del); if (!i) return;
      if (!confirm(`Delete “${i.title}”? It disappears from the site after you publish.`)) return;
      W.items = W.items.filter(x => x !== i);
      filesOf(i).forEach(p => { if (!JSON.stringify(W).includes(p)) replaceUpload(p); });
      setDirty(true); renderList(); toast('Deleted. Publish to update the site.');
    }
  });

  /* ---------- Sections ---------- */
  let editSection = null;
  function renderSections() {
    $('#sList').innerHTML = W.sections.map((s, idx) => {
      const n = W.items.filter(i => i.section === s.id).length;
      return `<div class="item-row" style="grid-template-columns:1fr auto"><div><div class="t1">${esc(s.title)}</div><div class="t2">${({ image: 'Images', video: 'Videos', model: '3D models', automation: 'n8n automations' })[s.type] || s.type} · ${n} project${n === 1 ? '' : 's'}</div></div>
        <div class="btns"><button class="btn" data-up="${idx}" ${idx ? '' : 'disabled'} aria-label="Move up">↑</button><button class="btn" data-sedit="${esc(s.id)}">Edit</button><button class="btn btn-danger" data-sdel="${esc(s.id)}">Delete</button></div></div>`;
    }).join('') || '<div class="empty">No sections yet.</div>';
  }
  function resetSection() { editSection = null; $('#sForm').reset(); $('#sType').disabled = false; $('#sFormTitle').textContent = 'Add section'; $('#sSubmit').textContent = 'Add section'; }
  $('#sReset').addEventListener('click', resetSection);
  $('#sForm').addEventListener('submit', e => {
    e.preventDefault();
    const title = $('#sTitle').value.trim(); if (!title) return;
    if (editSection) {
      const s = sectionOf(editSection); s.title = title; s.blurb = $('#sBlurb').value.trim(); s.type = $('#sType').value;
    } else {
      let id = slug(title), n = 2; while (sectionOf(id)) id = slug(title) + '-' + n++;
      W.sections.push({ id, type: $('#sType').value, title, blurb: $('#sBlurb').value.trim() });
    }
    setDirty(true); toast(editSection ? 'Section updated' : 'Section added'); resetSection(); renderSections(); fillSectionSelects();
  });
  $('#sList').addEventListener('click', e => {
    const up = e.target.closest('[data-up]'), ed = e.target.closest('[data-sedit]'), de = e.target.closest('[data-sdel]');
    if (up) { const i = +up.dataset.up; [W.sections[i - 1], W.sections[i]] = [W.sections[i], W.sections[i - 1]]; setDirty(true); renderSections(); fillSectionSelects(); }
    if (ed) {
      const s = sectionOf(ed.dataset.sedit); editSection = s.id;
      $('#sTitle').value = s.title; $('#sBlurb').value = s.blurb || ''; $('#sType').value = s.type;
      $('#sType').disabled = W.items.some(i => i.section === s.id);
      $('#sFormTitle').textContent = 'Edit section'; $('#sSubmit').textContent = 'Save changes';
    }
    if (de) {
      const s = sectionOf(de.dataset.sdel), n = W.items.filter(i => i.section === s.id).length;
      if (n) return alert(`“${s.title}” still has ${n} project${n > 1 ? 's' : ''}. Delete or move them first.`);
      if (!confirm(`Delete the “${s.title}” section?`)) return;
      W.sections = W.sections.filter(x => x !== s); setDirty(true); renderSections(); fillSectionSelects();
    }
  });

  /* ---------- Profile ---------- */
  function renderProfileThumbs() {
    $('#avatarThumbs').innerHTML = W.profile.avatar ? `<div class="t"><img src="${esc(resolve(W.profile.avatar))}" alt=""></div>` : '';
    $('#bannerThumbs').innerHTML = W.profile.banner ? `<div class="t" style="width:180px"><img src="${esc(resolve(W.profile.banner))}" alt=""></div>` : '';
  }
  function fillProfile() {
    const p = W.profile, c = W.config;
    const set = (id, v) => { $(id).value = v ?? ''; };
    set('#prName', p.name); set('#prLoc', p.location); set('#prHead', p.headline); set('#prAvail', p.availability); set('#prBio', p.bio);
    set('#prEmail', p.email); set('#prWa', p.whatsapp); set('#prIg', p.instagram); set('#prBe', p.behance); set('#prIn', p.linkedin); set('#prYt', p.youtube);
    set('#prSkills', (p.skills || []).join(', ')); set('#prSoft', (p.software || []).join(', '));
    set('#prExp', (p.experience || []).map(x => [x.role, x.company, x.period].filter(Boolean).join(' | ')).join('\n'));
    set('#prHire', p.hireText || 'Contact us'); set('#prHigh', (p.highlights || []).join(', ')); set('#prHero', p.heroStyle || 'map');
    set('#cCTitle', c.contactTitle); set('#cCIntro', c.contactIntro); set('#cBudgets', (c.budgets || []).join(', ')); set('#cChat', c.chatButtonText || 'Chat with us');
    $('#cChatOn').checked = c.showChatButton !== false; $('#cSvc').checked = c.showServices !== false; set('#cTitle', c.siteTitle); set('#cAccent', c.accent || '#2E8BFF'); set('#cTheme', c.defaultTheme || 'dark'); set('#cFoot', c.footerText);
    $('#cAdmin').checked = !!c.showAdminLink;
    renderProfileThumbs();
  }
  $('#prForm').addEventListener('submit', e => {
    e.preventDefault();
    const v = id => $(id).value.trim();
    Object.assign(W.profile, {
      name: v('#prName'), location: v('#prLoc'), headline: v('#prHead'), availability: v('#prAvail'), bio: $('#prBio').value.trim(),
      email: v('#prEmail'), whatsapp: v('#prWa').replace(/\D/g, ''), instagram: v('#prIg'), behance: v('#prBe'), linkedin: v('#prIn'), youtube: v('#prYt'),
      skills: list(v('#prSkills')), software: list(v('#prSoft')), hireText: v('#prHire') || 'Contact us', highlights: list(v('#prHigh')), heroStyle: $('#prHero').value,
      experience: $('#prExp').value.split('\n').map(l => l.split('|').map(x => x.trim())).filter(a => a[0]).map(([role, company, period]) => ({ role, company: company || '', period: period || '' }))
    });
    Object.assign(W.config, { siteTitle: v('#cTitle'), accent: $('#cAccent').value, defaultTheme: $('#cTheme').value, footerText: v('#cFoot'), showAdminLink: $('#cAdmin').checked,
      contactTitle: v('#cCTitle'), contactIntro: v('#cCIntro'), budgets: list(v('#cBudgets')), chatButtonText: v('#cChat') || 'Chat with us', showChatButton: $('#cChatOn').checked, showServices: $('#cSvc').checked });
    document.documentElement.style.setProperty('--accent', W.config.accent);
    setDirty(true); toast('Profile saved. Publish to make it live.');
  });

  /* ---------- GitHub ---------- */
  let gh = store.get('dp-gh', { owner: '', repo: '', branch: 'main', token: '' });
  if (!gh.owner && /\.github\.io$/.test(location.hostname)) { gh.owner = location.hostname.split('.')[0]; gh.repo = location.pathname.split('/')[1] || ''; }
  $('#gOwner').value = gh.owner || ''; $('#gRepo').value = gh.repo || ''; $('#gBranch').value = gh.branch || 'main'; $('#gToken').value = gh.token || '';
  const ready = () => gh.owner && gh.repo && gh.token;
  async function api(path, opts = {}) {
    const r = await fetch(`https://api.github.com/repos/${gh.owner}/${gh.repo}${path}`, {
      ...opts, headers: { Authorization: `Bearer ${gh.token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }
    });
    if (!r.ok) { const j = await r.json().catch(() => ({})); const err = new Error(`${r.status} ${j.message || r.statusText}`); err.status = r.status; throw err; }
    return r.status === 204 ? {} : r.json();
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
  async function deleteFile(path) {
    const cur = await getFile(path); if (!cur) return;
    return api(`/contents/${enc(path)}`, { method: 'DELETE', body: JSON.stringify({ message: 'Remove ' + path.split('/').pop(), sha: cur.sha, branch: gh.branch }) });
  }
  $('#gSave').addEventListener('click', async () => {
    gh = { owner: $('#gOwner').value.trim(), repo: $('#gRepo').value.trim(), branch: $('#gBranch').value.trim() || 'main', token: $('#gToken').value.trim() };
    store.set('dp-gh', gh);
    if (!ready()) return log('Fill in username, repository and token.');
    try { const r = await api(''); log(`Connected to ${r.full_name}. Write access: ${r.permissions?.push ? 'yes' : 'no'}.`); toast('Connected to GitHub'); }
    catch (e) { log('Connection failed: ' + e.message + '. Check the username, repository name and token.'); }
  });
  $('#gForget').addEventListener('click', () => { store.del('dp-gh'); gh = { owner: gh.owner, repo: gh.repo, branch: gh.branch, token: '' }; $('#gToken').value = ''; log('Token removed from this browser.'); });
  $('#gLoad').addEventListener('click', async () => {
    if (!ready()) return log('Connect GitHub first.');
    if (dirty && !confirm('Loading replaces your unpublished changes. Continue?')) return;
    try {
      const f = await getFile(DATA_PATH); if (!f) return log(DATA_PATH + ' was not found in the repository.');
      const text = b64u8(f.content);
      W = normalize(JSON.parse(text.slice(text.indexOf('=') + 1).trim().replace(/;\s*$/, '')));
      Object.keys(pending).forEach(k => delete pending[k]); pendingDeletes.clear();
      setDirty(false); resetForm(); renderList(); renderSections(); fillProfile(); log('Loaded the latest content from GitHub.');
    } catch (e) { log('Load failed: ' + e.message); }
  });

  const serialize = () => 'window.PORTFOLIO = ' + JSON.stringify(W, null, 2) + ';\n';
  $('#pubBtn').addEventListener('click', async () => {
    const goGit = () => $('#tabs [data-tab="github"]').click();
    if (!ready()) { goGit(); log('Connect GitHub first, then press Publish again.'); return; }
    if (!dirty) { toast('Nothing new to publish'); return; }
    $('#pubBtn').disabled = true; goGit();
    try {
      const all = JSON.stringify(W);
      for (const path of Object.keys(pending)) {
        if (!all.includes(path)) { delete pending[path]; continue; }
        log('Uploading ' + path + ' …');
        await putFile(path, pending[path].b64, 'Upload ' + path.split('/').pop());
        delete pending[path];
      }
      for (const path of [...pendingDeletes]) {
        if (all.includes(path)) { pendingDeletes.delete(path); continue; }
        log('Removing ' + path + ' …');
        try { await deleteFile(path); } catch (e) { log('  (could not remove it: ' + e.message + ')'); }
        pendingDeletes.delete(path);
      }
      log('Saving content …');
      await putFile(DATA_PATH, u8b64(serialize()), 'Update portfolio content');
      setDirty(false); renderList();
      log('Published. The live site updates in about 1–2 minutes.'); toast('Published');
    } catch (e) {
      log('Publish failed: ' + e.message + (e.status === 403 ? ' — the token needs Contents: Read and write.' : e.status === 413 || e.status === 422 ? ' — the file may be too big. Use a link instead.' : ''));
      setDirty(true);
    }
    $('#pubBtn').disabled = false;
  });
  $('#dlBtn').addEventListener('click', () => {
    if (Object.keys(pending).length) alert('Note: uploaded files are not inside this data file. Use Publish to GitHub to upload them too.');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([serialize()], { type: 'text/javascript' }));
    a.download = 'portfolio-data.js'; a.click();
  });

  resetForm(); renderList(); renderSections(); fillProfile(); setDirty(false);
})();
