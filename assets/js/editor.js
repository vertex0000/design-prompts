/* Owner-only edit mode. Loaded by site.js only when a GitHub token is saved in this browser or via the #edit link.
   Visitors never load this file, and nothing can be saved without the owner's GitHub token. */
(() => {
  const PF = window.PF; if (!PF) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const DATA_PATH = 'data/portfolio-data.js';
  const D = () => PF.data;
  const list = s => String(s || '').split(/[,\n]/).map(x => x.trim()).filter(Boolean);
  const slug = s => String(s).toLowerCase().trim().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'file';
  const extOf = n => (String(n || '').split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i) || [, ''])[1].toLowerCase();
  const html = document.documentElement;

  const pending = {};            // repo path -> { b64, url, ext, mime }
  const published = {};          // repo path -> blob url (keeps new files visible until GitHub Pages redeploys)
  const pendingDeletes = new Set();
  let dirty = false;
  window.PF_EDITOR = { resolve: p => p && (pending[p]?.url || published[p]), extOf: p => pending[p]?.ext || extOf(p) };

  let gh = store.get('dp-gh', {});
  if (!gh.owner && /\.github\.io$/.test(location.hostname)) { gh.owner = location.hostname.split('.')[0]; gh.repo = location.pathname.split('/')[1] || ''; }
  gh.branch ||= 'main';

  /* ---------- Chrome: edit button + edit bar ---------- */
  document.body.insertAdjacentHTML('beforeend', `
    <button class="ed-fab" id="edFab">✏️ Edit site</button>
    <div class="ed-bar" id="edBar" hidden>
      <span class="ed-dot"></span><b>Edit mode</b><span id="edStatus">No changes</span>
      <button class="btn" data-ed="settings:contact">Settings</button>
      <button class="btn btn-primary" id="edPublish">Publish</button>
      <button class="btn btn-ghost" id="edExit">Exit</button>
    </div>
    <input type="file" id="edPicker" hidden>`);

  function setDirty(v) {
    dirty = v;
    const n = Object.keys(pending).length;
    $('#edStatus').textContent = v ? `Unpublished changes${n ? ` · ${n} file${n > 1 ? 's' : ''}` : ''}` : 'All changes published';
    $('#edBar').classList.toggle('dirty', v);
  }
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  function enter() {
    if (!gh.token) return openConnect();
    html.classList.add('editing');
    $('#edFab').hidden = true; $('#edBar').hidden = false;
    PF.refresh(); setDirty(dirty);
  }
  function exit() {
    if (dirty && !confirm('You have unpublished changes. They stay here until you publish or reload. Exit edit mode anyway?')) return;
    html.classList.remove('editing');
    $('#edFab').hidden = false; $('#edBar').hidden = true;
    PF.refresh();
  }
  $('#edFab').addEventListener('click', enter);
  $('#edExit').addEventListener('click', exit);

  /* ---------- Inline text editing ---------- */
  function setPath(obj, path, val) {
    const keys = path.split('.');
    let o = obj;
    keys.slice(0, -1).forEach((k, i) => { if (o[k] == null) o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {}; o = o[k]; });
    o[keys[keys.length - 1]] = val;
  }
  const armEditable = root => { if (!html.classList.contains('editing')) return; $$('[data-edit]', root).forEach(el => { if (!el.isContentEditable) { el.contentEditable = 'true'; el.spellcheck = true; } }); };
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) armEditable(n.parentNode || n); }))).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('input', e => {
    const el = e.target.closest && e.target.closest('[data-edit]'); if (!el || !html.classList.contains('editing')) return;
    const val = (el.hasAttribute('data-multi') ? el.innerText : el.textContent).replace(/ /g, ' ').trim();
    setPath(D(), el.dataset.edit, val);
    setDirty(true);
  });
  document.addEventListener('keydown', e => {
    const el = e.target.closest && e.target.closest('[data-edit]');
    if (el && e.key === 'Enter' && !el.hasAttribute('data-multi')) { e.preventDefault(); el.blur(); }
  });
  document.addEventListener('paste', e => {
    const el = e.target.closest && e.target.closest('[data-edit]'); if (!el) return;
    e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  });
  document.addEventListener('focusout', e => {
    const el = e.target.closest && e.target.closest('[data-edit]');
    if (el && /^(profile\.name|sections\.)/.test(el.dataset.edit)) setTimeout(() => { if (!document.activeElement?.closest('[data-edit]')) PF.refresh(); }, 0);
  });

  /* ---------- Files: pick, resize, watermark, stage ---------- */
  const picker = $('#edPicker');
  function pick(accept, multiple = false) {
    return new Promise(res => {
      picker.accept = accept; picker.multiple = multiple; picker.value = '';
      picker.onchange = () => res([...picker.files]);
      picker.click();
    });
  }
  const fileToB64 = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
  const u8b64 = str => { const b = new TextEncoder().encode(str); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  const b64u8 = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)));
  const blobFromB64 = (b64, mime) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime }); };
  const newPath = (folder, name, ext) => `assets/uploads/${folder}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}-${slug(name)}.${ext}`;

  function stage(folder, name, ext, b64, mime) {
    const path = newPath(folder, name, ext);
    pending[path] = { b64, url: URL.createObjectURL(blobFromB64(b64, mime)), ext, mime };
    return path;
  }
  async function stageFile(folder, file) {
    const ext = extOf(file.name) || 'bin';
    return stage(folder, file.name, ext, await fileToB64(file), file.type || 'application/octet-stream');
  }
  const loadImg = file => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });

  /* Resize to web size and (optionally) burn a watermark into the pixels. */
  async function stageImage(file, { max, watermark } = {}) {
    if (!/^image\//.test(file.type)) { alert(`“${file.name}” is not an image.`); return null; }
    if (file.size > 30e6) { alert(`“${file.name}” is bigger than 30 MB. Please use a smaller file.`); return null; }
    if (/gif|svg/.test(file.type)) return stageFile('images', file);
    const pr = D().config.protect || {};
    max = max ?? (pr.maxSize || 1600);
    const im = await loadImg(file);
    const scale = max ? Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)) : 1;
    const w = Math.round(im.naturalWidth * scale), h = Math.round(im.naturalHeight * scale);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(im, 0, 0, w, h);
    const text = (pr.watermarkText || `© ${D().profile.name || ''}`).trim();
    if (watermark && text) {
      const fs = Math.max(14, Math.round(Math.min(w, h) * 0.035));
      x.font = `700 ${fs}px Manrope, Arial, sans-serif`;
      if (pr.watermarkStyle === 'tiled') {
        x.save(); x.globalAlpha = 0.14; x.fillStyle = '#fff'; x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = Math.max(1, fs / 14);
        x.translate(w / 2, h / 2); x.rotate(-Math.PI / 7);
        const tw = x.measureText(text).width + fs * 3, th = fs * 4;
        for (let yy = -h; yy < h; yy += th) for (let xx = -w - ((yy / th) % 2) * tw / 2; xx < w; xx += tw) { x.strokeText(text, xx, yy); x.fillText(text, xx, yy); }
        x.restore();
      }
      x.save(); x.globalAlpha = 0.85; x.textAlign = 'right'; x.textBaseline = 'bottom';
      x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = fs / 3; x.fillStyle = '#fff';
      x.fillText(text, w - fs, h - fs * 0.8); x.restore();
    }
    const png = file.type === 'image/png' && !watermark && scale === 1;
    const mime = png ? 'image/png' : 'image/jpeg';
    const b64 = c.toDataURL(mime, 0.88).split(',')[1];
    return stage('images', file.name, png ? 'png' : 'jpg', b64, mime);
  }
  const RULES = {
    video: { accept: 'video/mp4,video/webm,video/quicktime', max: 50e6, test: f => /^video\//.test(f.type) || /\.(mp4|webm|mov)$/i.test(f.name), folder: 'videos' },
    model: { accept: '.fbx,.glb,.gltf,.obj', max: 50e6, test: f => /\.(fbx|glb|gltf|obj)$/i.test(f.name), folder: 'models' },
    workflow: { accept: '.json,application/json', max: 5e6, test: f => /\.json$/i.test(f.name) || f.type === 'application/json', folder: 'workflows' }
  };
  async function stageRule(kind, f) {
    const r = RULES[kind];
    if (!r.test(f)) { alert(`“${f.name}” is not the right kind of file here.`); return null; }
    if (f.size > r.max) { alert(`“${f.name}” is ${(f.size / 1e6).toFixed(1)} MB. The limit is ${r.max / 1e6} MB. Compress it, or paste a link instead (YouTube works well for videos).`); return null; }
    return stageFile(r.folder, f);
  }
  function dropIfUnused(p) { if (p && pending[p] && !JSON.stringify(D()).includes(p)) delete pending[p]; }
  function retire(p) { if (!p) return; if (pending[p]) delete pending[p]; else if (String(p).startsWith('assets/uploads/')) pendingDeletes.add(p); }

  /* ---------- Modal helper ---------- */
  function modal(title, body, { wide = false, onOpen, submit = 'Save', onSubmit, hideSubmit = false } = {}) {
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = `<form class="modal-box${wide ? ' wide' : ''}" novalidate>
      <div class="modal-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-x aria-label="Close">✕</button></div>
      <div class="modal-body">${body}</div>
      ${hideSubmit ? '' : `<div class="modal-foot"><button type="button" class="btn" data-x>Cancel</button><button class="btn btn-primary" type="submit">${esc(submit)}</button></div>`}
    </form>`;
    document.body.appendChild(m);
    const close = () => { m.remove(); if ($('#viewer').hidden && !$$('.modal').length) document.body.style.overflow = ''; };
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-x]')) close(); });
    m.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
    m.querySelector('form').addEventListener('submit', async e => { e.preventDefault(); if (onSubmit && (await onSubmit(m.querySelector('form'))) !== false) close(); });
    document.body.style.overflow = 'hidden';
    onOpen && onOpen(m, close);
    const first = m.querySelector('input:not([type=hidden]):not([type=checkbox]), textarea, select'); first && first.focus();
    return { el: m, close };
  }
  const field = (label, input, hint = '') => `<div class="field"><label>${label}</label>${input}${hint ? `<small>${hint}</small>` : ''}</div>`;

  /* ---------- Click actions ---------- */
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-ed]'); if (!b || !html.classList.contains('editing')) return;
    e.preventDefault(); e.stopPropagation();
    const what = b.dataset.ed, P = D().profile;
    if (what === 'banner' || what === 'avatar') {
      const [f] = await pick('image/*'); if (!f) return;
      const p = await stageImage(f, { max: what === 'banner' ? 2400 : 800, watermark: false }); if (!p) return;
      retire(P[what]); P[what] = p; setDirty(true); PF.refresh();
      PF.toast(what === 'banner' ? 'Banner updated. Publish to make it live.' : 'Photo updated. Publish to make it live.');
    }
    if (what === 'banner-remove' && confirm('Remove the banner image?')) { retire(P.banner); delete P.banner; setDirty(true); PF.refresh(); }
    if (what === 'highlights') listModal('Badges under your name', 'highlights', P, 'One badge per line, e.g. “5 years experience”.');
    if (what === 'skills') listModal('What I do', 'skills', P, 'One skill per line.');
    if (what === 'software') listModal('Software', 'software', P, 'One app per line.');
    if (what === 'experience') rowsModal('Experience', P, 'experience', [['role', 'Role'], ['company', 'Company'], ['period', 'Period']]);
    if (what === 'steps') {
      if (!P.steps) P.steps = [{ title: 'Share your idea', text: 'Send the brief, references and deadline on WhatsApp or email.' }, { title: 'Get the first draft', text: 'You receive a first version with a clear price and timeline.' }, { title: 'Revisions and delivery', text: 'We refine it together, then you get the final files.' }];
      rowsModal('How we work', P, 'steps', [['title', 'Step'], ['text', 'Description']]);
    }
    if (what.startsWith('settings')) openSettings(what.split(':')[1] || 'contact');
    if (what === 'add-item') projectModal(null, b.dataset.section);
    if (what === 'edit-item') projectModal(b.dataset.id);
    if (what === 'del-item') {
      const it = D().items.find(x => x.id === b.dataset.id); if (!it) return;
      if (!confirm(`Delete “${it.title}”? It disappears from the site after you publish.`)) return;
      D().items.splice(D().items.indexOf(it), 1);
      filesOf(it).forEach(p => { if (!JSON.stringify(D()).includes(p)) retire(p); });
      setDirty(true); PF.refresh(); PF.toast('Deleted. Publish to update the site.');
    }
  }, true);

  function listModal(title, key, obj, hint) {
    modal(title, field('Items', `<textarea name="v" rows="8">${esc((obj[key] || []).join('\n'))}</textarea>`, hint), {
      onSubmit: f => { obj[key] = list(f.v.value); setDirty(true); PF.refresh(); }
    });
  }
  function rowsModal(title, obj, key, cols) {
    const row = r => `<div class="ed-row">${cols.map(([k, l]) => `<input data-k="${k}" placeholder="${esc(l)}" value="${esc(r[k] || '')}">`).join('')}<button type="button" class="icon-btn" data-up aria-label="Move up">↑</button><button type="button" class="icon-btn" data-rm aria-label="Remove">✕</button></div>`;
    modal(title, `<div class="ed-rows" id="rows">${(obj[key] || []).map(row).join('')}</div><button type="button" class="btn" id="addRow" style="margin-top:10px">+ Add row</button>`, {
      onOpen: m => {
        m.addEventListener('click', e => {
          if (e.target.closest('[data-rm]')) e.target.closest('.ed-row').remove();
          if (e.target.closest('[data-up]')) { const r = e.target.closest('.ed-row'); r.previousElementSibling && r.parentNode.insertBefore(r, r.previousElementSibling); }
          if (e.target.id === 'addRow') { $('#rows', m).insertAdjacentHTML('beforeend', row({})); $('#rows .ed-row:last-child input', m).focus(); }
        });
      },
      onSubmit: f => {
        obj[key] = $$('.ed-row', f).map(r => Object.fromEntries($$('input', r).map(i => [i.dataset.k, i.value.trim()]))).filter(r => Object.values(r).some(Boolean));
        setDirty(true); PF.refresh();
      }
    });
  }

  /* ---------- Project editor ---------- */
  const filesOf = it => [it.cover, it.before, it.video, it.model, it.workflow, ...(it.images || [])].filter(Boolean);
  const HINTS = {
    image: 'Leave empty to use the first image.',
    video: 'Leave empty to use the video itself (YouTube thumbnails are automatic).',
    model: 'Leave empty to capture the 3D view automatically when you save.',
    automation: 'Leave empty to show the workflow diagram.'
  };
  const sanitizeWorkflow = wf => ({
    name: wf.name || '', locked: true,
    nodes: (wf.nodes || []).filter(n => !/stickyNote/i.test(n.type)).map(n => ({ name: n.name, type: n.type, typeVersion: n.typeVersion, position: n.position })),
    connections: wf.connections || {}
  });

  function projectModal(id, sectionId) {
    const data = D(), pr = data.config.protect || {};
    const old = id ? data.items.find(i => i.id === id) : null;
    if (!data.sections.length) return alert('Add a section first (Settings → Sections).');
    const it = old ? JSON.parse(JSON.stringify(old)) : { section: sectionId || data.sections[0].id, images: [], date: new Date().toISOString().slice(0, 10), workflowLocked: !!pr.lockWorkflows };
    it.images ||= [];
    let viewer = null, viewerSrc = null, wfText = null;
    const t = () => PF.sectionTypeOf(it.section);
    const th = (p, key, idx) => {
      const u = window.PF_EDITOR.resolve(p) || p;
      const vis = /\.(mp4|webm|mov)$/i.test(p) || /^video/.test(pending[p]?.mime || '') ? `<video src="${esc(u)}#t=1" muted preload="metadata"></video>`
        : /\.(fbx|glb|gltf|obj|json)$/i.test(p) ? `<span>${esc(extOf(p).toUpperCase())}</span>` : `<img src="${esc(u)}" alt="">`;
      return `<div class="t">${vis}<button type="button" data-rmf="${key}" data-i="${idx ?? ''}" aria-label="Remove">✕</button></div>`;
    };
    const body = `
      <div class="row">
        ${field('Section', `<select name="section">${data.sections.map(s => `<option value="${esc(s.id)}" ${s.id === it.section ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}</select>`)}
        ${field('Date', `<input type="date" name="date" value="${esc((it.date || '').slice(0, 10))}">`)}
      </div>
      ${field('Title', `<input name="title" value="${esc(it.title || '')}" placeholder="e.g. Sofa product retouch">`)}
      ${field('Description', `<textarea name="description" rows="4" placeholder="What was the brief and what did you do?">${esc(it.description || '')}</textarea>`)}
      <label class="check" style="margin-bottom:14px"><input type="checkbox" name="wm" ${pr.watermark !== false ? 'checked' : ''}> 🛡️ Add watermark and resize new images for the web</label>
      <div data-t="image">
        ${field('Images', '<button type="button" class="drop" data-pick="images">+ Choose images from your device</button><div class="thumbs" id="thImages"></div>', 'The first image is the cover. You can add several.')}
        ${field('Before image (optional)', '<button type="button" class="drop" data-pick="before">+ Choose the original, unedited photo</button><div class="thumbs" id="thBefore"></div>', 'Shows a before/after slider against the first image.')}
      </div>
      <div data-t="video">
        ${field('Video', '<button type="button" class="drop" data-pick="video">+ Choose a video (MP4, under 50 MB)</button><input name="videoUrl" placeholder="…or paste a YouTube, Vimeo or .mp4 link" style="margin-top:6px"><div class="thumbs" id="thVideo"></div>')}
      </div>
      <div data-t="model">
        ${field('3D model', '<button type="button" class="drop" data-pick="model">+ Choose an FBX, GLB or OBJ file (under 50 MB)</button><input name="modelUrl" placeholder="…or paste a link to the model file" style="margin-top:6px"><div class="preview-box" id="pv3d" hidden><div class="v3d" id="edV3d"></div></div><button type="button" class="btn" id="snap" hidden style="margin-top:8px">Use this view as the cover</button>', 'Textures must be embedded in the file.')}
      </div>
      <div data-t="automation">
        ${field('n8n workflow', '<button type="button" class="drop" data-pick="workflow">+ Choose the exported workflow .json</button><textarea name="wf" rows="3" placeholder="…or paste the workflow JSON (in n8n: select all nodes, Ctrl+C)" style="margin-top:6px"></textarea><div class="preview-box" id="pvFlow" hidden><div class="flow"></div></div>')}
        <label class="check"><input type="checkbox" name="locked" ${it.workflowLocked ? 'checked' : ''}> ${'🔒'} Lock download: clients see the diagram only</label>
        <small class="muted" id="lockHint" style="display:block;margin:4px 0 12px">When locked, only step names and the layout are uploaded. Your API keys, prompts and settings never leave your computer.</small>
      </div>
      ${field('Cover image (optional)', '<button type="button" class="drop" data-pick="cover">+ Choose a thumbnail</button><div class="thumbs" id="thCover"></div>', '<span id="coverHint"></span>')}
      <div data-extra>${field('Extra images (optional)', '<button type="button" class="drop" data-pick="extra">+ Screenshots, stills or process images</button><div class="thumbs" id="thExtra"></div>')}</div>
      <div class="row">
        ${field('Software used', `<input name="tools" value="${esc((it.tools || []).join(', '))}" placeholder="Photoshop, After Effects, Blender">`)}
        ${field('Made with AI (optional)', `<input name="ai" value="${esc((it.ai || []).join(', '))}" placeholder="Midjourney, Runway">`)}
      </div>
      ${field('AI prompt used (optional)', `<textarea name="prompt" rows="2" placeholder="Shown on the project page with a copy button">${esc(it.prompt || '')}</textarea>`)}
      <div class="row">
        ${field('Client (optional)', `<input name="client" value="${esc(it.client || '')}">`)}
        ${field('Tags', `<input name="tags" value="${esc((it.tags || []).join(', '))}" placeholder="furniture, ad">`)}
      </div>
      ${field('Credit (optional)', `<input name="credit" value="${esc(it.credit || '')}">`)}
      <label class="check"><input type="checkbox" name="featured" ${it.featured ? 'checked' : ''}> Featured (shown first)</label>`;

    const m = modal(old ? 'Edit project' : 'Add project', body, {
      wide: true, submit: old ? 'Save changes' : 'Add project',
      onOpen: (el) => {
        const f = el.querySelector('form');
        if (t() === 'video' && it.video && !pending[it.video] && !/^assets\//.test(it.video)) f.videoUrl.value = it.video;
        if (t() === 'model' && it.model && !pending[it.model] && !/^assets\//.test(it.model)) f.modelUrl.value = it.model;
        const show = () => {
          const ty = t();
          $$('[data-t]', el).forEach(x => { x.hidden = x.dataset.t !== ty; });
          $('[data-extra]', el).hidden = ty === 'image';
          $('#coverHint', el).textContent = HINTS[ty] || '';
          draw();
        };
        const draw = () => {
          const ty = t();
          $('#thImages', el).innerHTML = ty === 'image' ? it.images.map((p, i) => th(p, 'images', i)).join('') : '';
          $('#thExtra', el).innerHTML = ty !== 'image' ? it.images.map((p, i) => th(p, 'images', i)).join('') : '';
          $('#thBefore', el).innerHTML = it.before ? th(it.before, 'before') : '';
          $('#thVideo', el).innerHTML = it.video && !f.videoUrl.value ? th(it.video, 'video') : '';
          $('#thCover', el).innerHTML = it.cover ? th(it.cover, 'cover') : '';
          if (ty === 'model') preview3d();
          if (ty === 'automation') previewFlow();
        };
        const preview3d = async () => {
          const s = f.modelUrl.value.trim() || it.model;
          if (s === viewerSrc) return;
          if (viewer) { viewer.dispose(); viewer = null; }
          viewerSrc = s; $('#pv3d', el).hidden = !s; $('#snap', el).hidden = !s;
          if (!s) return;
          try {
            const mod = await import(PF.viewerUrl);
            const v = await mod.mountViewer($('#edV3d', el), window.PF_EDITOR.resolve(s) || s, { ext: pending[s]?.ext || extOf(s) });
            if (viewerSrc !== s || !el.isConnected) return v.dispose();
            viewer = v;
          } catch (err) { $('#edV3d', el).innerHTML = '<div class="v3d-status err">The 3D preview could not start.</div>'; }
        };
        const previewFlow = async () => {
          const box = $('#pvFlow', el);
          let txt = f.wf.value.trim();
          if (!txt && it.workflow) {
            try { txt = pending[it.workflow] ? b64u8(pending[it.workflow].b64) : await (await fetch(window.PF_EDITOR.resolve(it.workflow) || it.workflow)).text(); } catch (err) { txt = ''; }
          }
          if (!txt) { box.hidden = true; return; }
          try { const wf = JSON.parse(txt); box.firstElementChild.innerHTML = window.N8N.render(wf); box.hidden = false; if (!f.wf.value.trim()) wfText = txt; }
          catch (err) { box.hidden = false; box.firstElementChild.innerHTML = '<p style="color:#FF5A6E;margin:0">This is not valid workflow JSON yet.</p>'; }
        };
        f.section.addEventListener('change', () => { it.section = f.section.value; show(); });
        f.wf.addEventListener('input', previewFlow);
        let mt; f.modelUrl.addEventListener('input', () => { clearTimeout(mt); mt = setTimeout(preview3d, 600); });
        f.videoUrl.addEventListener('input', draw);
        el.addEventListener('click', async e => {
          const rm = e.target.closest('[data-rmf]');
          if (rm) {
            const k = rm.dataset.rmf;
            if (k === 'images') { const [p] = it.images.splice(+rm.dataset.i, 1); dropIfUnused(p); } else { dropIfUnused(it[k]); it[k] = ''; }
            if (k === 'model') preview3d();
            draw(); return;
          }
          const pk = e.target.closest('[data-pick]'); if (!pk) return;
          const k = pk.dataset.pick, wm = f.wm.checked;
          if (k === 'images' || k === 'extra') {
            const files = await pick('image/*', true);
            for (const file of files) { pk.textContent = 'Processing…'; const p = await stageImage(file, { watermark: wm }); if (p) it.images.push(p); }
            pk.textContent = k === 'images' ? '+ Choose images from your device' : '+ Screenshots, stills or process images';
          } else if (k === 'before' || k === 'cover') {
            const [file] = await pick('image/*'); if (!file) return;
            const p = await stageImage(file, { watermark: wm }); if (p) { dropIfUnused(it[k]); it[k] = p; }
          } else {
            const [file] = await pick(RULES[k].accept); if (!file) return;
            if (k === 'workflow') {
              const text = await file.text();
              try { JSON.parse(text); } catch (err) { return alert('That file is not valid JSON. Export the workflow from n8n again.'); }
              f.wf.value = text; previewFlow(); return;
            }
            const p = await stageRule(k, file); if (!p) return;
            dropIfUnused(it[k]); it[k] = p;
            if (k === 'video') f.videoUrl.value = '';
            if (k === 'model') { f.modelUrl.value = ''; preview3d(); }
          }
          draw(); setDirty(true);
        });
        $('#snap', el).addEventListener('click', () => { if (snap()) { draw(); PF.toast('Cover captured'); } else PF.toast('Wait for the model to finish loading'); });
        show();
      },
      onSubmit: async f => {
        const ty = t(), title = f.title.value.trim();
        if (!title) { f.title.focus(); alert('Give the project a title.'); return false; }
        Object.assign(it, {
          section: f.section.value, title, description: f.description.value.trim(), date: f.date.value || new Date().toISOString().slice(0, 10),
          tools: list(f.tools.value), ai: list(f.ai.value), prompt: f.prompt.value.trim(), tags: list(f.tags.value),
          client: f.client.value.trim(), credit: f.credit.value.trim(), featured: f.featured.checked
        });
        if (ty === 'image' && !it.images.length) { alert('Add at least one image.'); return false; }
        if (ty === 'video') { it.video = f.videoUrl.value.trim() || it.video; if (!it.video) { alert('Add a video file or paste a video link.'); return false; } }
        if (ty === 'model') {
          it.model = f.modelUrl.value.trim() || it.model;
          if (!it.model) { alert('Add a 3D model file or paste a link.'); return false; }
          it.modelFormat = pending[it.model]?.ext || extOf(it.model) || 'fbx';
          if (!it.cover) snap();
        }
        if (ty === 'automation') {
          const locked = f.locked.checked;
          let txt = f.wf.value.trim(), wf = null;
          if (txt) { try { wf = JSON.parse(txt); } catch (err) { alert('The workflow JSON is not valid. Copy it from n8n again.'); return false; } }
          else if (it.workflow) {
            const cur = JSON.parse(wfText || (pending[it.workflow] ? b64u8(pending[it.workflow].b64) : await (await fetch(it.workflow)).text()));
            if (!locked && cur.locked) { alert('This workflow was uploaded locked, so the full version is not on the site. Upload or paste the full workflow again to unlock it.'); return false; }
            if (locked && !cur.locked) wf = cur;               // lock an existing open workflow
          } else { alert('Add the n8n workflow JSON.'); return false; }
          if (wf) {
            const out = locked ? sanitizeWorkflow(wf) : wf;
            const p = stage('workflows', (wf.name || title) + '.json', 'json', u8b64(JSON.stringify(out, null, 2)), 'application/json');
            if (it.workflow) retire(it.workflow);
            it.workflow = p;
          }
          it.workflowLocked = locked;
        }
        ['before', 'video', 'model', 'workflow', 'modelFormat'].forEach(k => { if (it[k] && ((k === 'before' && ty !== 'image') || (k === 'video' && ty !== 'video') || (k === 'model' && ty !== 'model') || (k === 'workflow' && ty !== 'automation'))) { retire(it[k]); delete it[k]; } });
        Object.keys(it).forEach(k => { if (it[k] === '' || it[k] === false || (Array.isArray(it[k]) && !it[k].length)) delete it[k]; });
        if (ty === 'automation') it.workflowLocked = f.locked.checked;
        if (old) {
          filesOf(old).forEach(p => { if (!filesOf(it).includes(p)) retire(p); });
          data.items[data.items.indexOf(old)] = it;
        } else { it.id = 'p-' + Date.now().toString(36); data.items.unshift(it); }
        if (viewer) viewer.dispose();
        setDirty(true); PF.refresh();
        PF.toast(old ? 'Saved. Publish to make it live.' : 'Added. Publish to make it live.');
      }
    });
    function snap() {
      if (!viewer || !viewer.loaded) return null;
      const b64 = viewer.capture('image/jpeg', 0.88).split(',')[1];
      dropIfUnused(it.cover);
      it.cover = stage('images', (it.title || 'model') + '-cover', 'jpg', b64, 'image/jpeg');
      return it.cover;
    }
    const obs = new MutationObserver(() => { if (!m.el.isConnected) { viewer && viewer.dispose(); obs.disconnect(); } });
    obs.observe(document.body, { childList: true });
  }

  /* ---------- Settings ---------- */
  function openSettings(tab) {
    const data = D(), P = data.profile, C = data.config, pr = C.protect || {};
    const tabs = [['contact', 'Contact & links'], ['sections', 'Sections'], ['protect', 'Protection'], ['site', 'Site'], ['github', 'GitHub']];
    const secRow = (s, i) => `<div class="ed-row sec"><input data-k="title" value="${esc(s.title)}" placeholder="Name"><select data-k="type" ${data.items.some(x => x.section === s.id) ? 'disabled title="This section has projects"' : ''}>${[['image', 'Images'], ['video', 'Videos'], ['model', '3D models'], ['automation', 'n8n automations']].map(([v, l]) => `<option value="${v}" ${s.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select><input data-k="blurb" value="${esc(s.blurb || '')}" placeholder="Short description"><input type="hidden" data-k="id" value="${esc(s.id)}"><button type="button" class="icon-btn" data-up aria-label="Move up">↑</button><button type="button" class="icon-btn" data-rm aria-label="Delete">✕</button></div>`;
    const body = `
      <div class="ed-tabs">${tabs.map(([k, l]) => `<button type="button" data-tab="${k}" aria-selected="${k === tab}">${l}</button>`).join('')}</div>
      <div data-pane="contact">
        <div class="row">${field('Email', `<input name="email" type="email" value="${esc(P.email || '')}">`)}${field('WhatsApp number', `<input name="whatsapp" value="${esc(P.whatsapp || '')}" placeholder="91XXXXXXXXXX">`, 'With country code, no + or spaces.')}</div>
        <div class="row">${field('Instagram link', `<input name="instagram" value="${esc(P.instagram || '')}" placeholder="https://instagram.com/…">`)}${field('Behance link', `<input name="behance" value="${esc(P.behance || '')}">`)}</div>
        <div class="row">${field('LinkedIn link', `<input name="linkedin" value="${esc(P.linkedin || '')}">`)}${field('YouTube link', `<input name="youtube" value="${esc(P.youtube || '')}">`)}</div>
        <div class="row">${field('Contact button text', `<input name="hireText" value="${esc(P.hireText || 'Contact us')}">`)}${field('Floating WhatsApp button text', `<input name="chatButtonText" value="${esc(C.chatButtonText || 'Chat with us')}">`)}</div>
        <label class="check" style="margin-bottom:14px"><input type="checkbox" name="showChatButton" ${C.showChatButton !== false ? 'checked' : ''}> Show the floating WhatsApp button</label>
        ${field('Contact form heading', `<input name="contactTitle" value="${esc(C.contactTitle || '')}">`)}
        ${field('Contact form intro', `<input name="contactIntro" value="${esc(C.contactIntro || '')}">`)}
        ${field('Budget options', `<input name="budgets" value="${esc((C.budgets || []).join(', '))}">`, 'Separate with commas. Leave empty to hide the budget question.')}
      </div>
      <div data-pane="sections">
        <p class="muted">Rename sections, change their order, or add new ones (for example “Logo Design”). A section's type can only change while it has no projects.</p>
        <div class="ed-rows" id="secRows">${data.sections.map(secRow).join('')}</div>
        <button type="button" class="btn" id="addSec" style="margin-top:10px">+ Add section</button>
      </div>
      <div data-pane="protect">
        <label class="check"><input type="checkbox" name="noRightClick" ${pr.noRightClick !== false ? 'checked' : ''}> Block right-click, drag and “Save image” for visitors</label>
        <label class="check"><input type="checkbox" name="watermark" ${pr.watermark !== false ? 'checked' : ''}> Watermark new images by default</label>
        <div class="row">
          ${field('Watermark text', `<input name="watermarkText" value="${esc(pr.watermarkText || '© ' + (P.name || ''))}">`)}
          ${field('Watermark style', `<select name="watermarkStyle"><option value="corner" ${pr.watermarkStyle !== 'tiled' ? 'selected' : ''}>Corner only</option><option value="tiled" ${pr.watermarkStyle === 'tiled' ? 'selected' : ''}>Corner + faint pattern across the image</option></select>`)}
        </div>
        ${field('Web size for uploaded images', `<select name="maxSize">${[[1200, '1200 px (small)'], [1600, '1600 px (recommended)'], [2000, '2000 px'], [0, 'Keep original size']].map(([v, l]) => `<option value="${v}" ${(pr.maxSize ?? 1600) == v ? 'selected' : ''}>${l}</option>`).join('')}</select>`, 'Your full-size original stays on your computer.')}
        <label class="check"><input type="checkbox" name="lockWorkflows" ${pr.lockWorkflows ? 'checked' : ''}> Lock new n8n workflows by default</label>
        ${field('Message when someone tries to save an image', `<input name="message" value="${esc(pr.message || 'Downloads are disabled. Contact us for files.')}">`)}
        <p class="muted">No website can fully stop screenshots. Watermarks and web-size copies make downloaded images useless for reuse.</p>
      </div>
      <div data-pane="site">
        ${field('Browser tab title', `<input name="siteTitle" value="${esc(C.siteTitle || '')}">`)}
        <div class="row">
          ${field('Accent colour', `<input type="color" name="accent" value="${esc(C.accent || '#2E8BFF')}" style="height:42px;padding:3px">`)}
          ${field('Default theme', `<select name="defaultTheme"><option value="dark" ${C.defaultTheme !== 'light' ? 'selected' : ''}>Dark (black)</option><option value="light" ${C.defaultTheme === 'light' ? 'selected' : ''}>Day (white)</option></select>`)}
        </div>
        <label class="check"><input type="checkbox" name="showServices" ${C.showServices !== false ? 'checked' : ''}> Show service cards above “All work”</label>
        <p class="muted">Tip: every heading and text on the page can be edited by clicking it in edit mode.</p>
      </div>
      <div data-pane="github">
        <p class="muted">Your token stays in this browser only. Use a fine-grained token for this repository with <b>Contents: Read and write</b>.</p>
        <div class="row">${field('GitHub username', `<input name="owner" value="${esc(gh.owner || '')}">`)}${field('Repository', `<input name="repo" value="${esc(gh.repo || '')}">`)}${field('Branch', `<input name="branch" value="${esc(gh.branch || 'main')}">`)}</div>
        ${field('Access token', `<input name="token" type="password" value="${esc(gh.token || '')}" placeholder="github_pat_…">`)}
        <div class="row" style="flex-wrap:wrap;gap:8px"><button type="button" class="btn" id="gTest">Test connection</button><button type="button" class="btn" id="gLoad">Load latest from GitHub</button><button type="button" class="btn" id="gDl">Download data backup</button><button type="button" class="btn btn-danger" id="gForget">Remove token from this browser</button></div>
        <div class="log" id="gLog" style="margin-top:12px">Ready.</div>
      </div>`;
    modal('Settings', body, {
      wide: true,
      onOpen: el => {
        const showTab = k => { $$('[data-tab]', el).forEach(b => b.setAttribute('aria-selected', b.dataset.tab === k)); $$('[data-pane]', el).forEach(p => { p.hidden = p.dataset.pane !== k; }); };
        showTab(tab);
        el.addEventListener('click', async e => {
          const tb = e.target.closest('[data-tab]'); if (tb) showTab(tb.dataset.tab);
          const rows = e.target.closest('#secRows');
          if (rows && e.target.closest('[data-rm]')) {
            const r = e.target.closest('.ed-row'), sid = $('[data-k=id]', r).value, n = data.items.filter(x => x.section === sid).length;
            if (n) return alert(`This section still has ${n} project${n > 1 ? 's' : ''}. Delete or move them first.`);
            r.remove();
          }
          if (rows && e.target.closest('[data-up]')) { const r = e.target.closest('.ed-row'); r.previousElementSibling && r.parentNode.insertBefore(r, r.previousElementSibling); }
          if (e.target.id === 'addSec') { $('#secRows', el).insertAdjacentHTML('beforeend', secRow({ id: '', title: '', type: 'image' })); $('#secRows .ed-row:last-child input', el).focus(); }
          const f = el.querySelector('form');
          const readGh = () => { gh = { owner: f.owner.value.trim(), repo: f.repo.value.trim(), branch: f.branch.value.trim() || 'main', token: f.token.value.trim() }; store.set('dp-gh', gh); };
          const log = m => { const l = $('#gLog', el); l.textContent += '\n' + m; l.scrollTop = l.scrollHeight; };
          if (e.target.id === 'gTest') { readGh(); try { const r = await api(''); log(`Connected to ${r.full_name}. Write access: ${r.permissions?.push ? 'yes' : 'no'}.`); } catch (err) { log('Connection failed: ' + err.message); } }
          if (e.target.id === 'gLoad') {
            readGh(); if (dirty && !confirm('Loading replaces your unpublished changes. Continue?')) return;
            try { await loadLatest(); log('Loaded the latest content from GitHub.'); } catch (err) { log('Load failed: ' + err.message); }
          }
          if (e.target.id === 'gDl') {
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([serialize()], { type: 'text/javascript' })); a.download = 'portfolio-data.js'; a.click();
          }
          if (e.target.id === 'gForget' && confirm('Remove the token from this browser? You will need it again to edit.')) { gh.token = ''; store.set('dp-gh', gh); f.token.value = ''; log('Token removed.'); }
        });
      },
      onSubmit: f => {
        ['email', 'instagram', 'behance', 'linkedin', 'youtube'].forEach(k => { P[k] = f[k].value.trim(); });
        P.whatsapp = f.whatsapp.value.replace(/\D/g, ''); P.hireText = f.hireText.value.trim() || 'Contact us';
        Object.assign(C, {
          chatButtonText: f.chatButtonText.value.trim() || 'Chat with us', showChatButton: f.showChatButton.checked,
          contactTitle: f.contactTitle.value.trim(), contactIntro: f.contactIntro.value.trim(), budgets: list(f.budgets.value),
          siteTitle: f.siteTitle.value.trim(), accent: f.accent.value, defaultTheme: f.defaultTheme.value, showServices: f.showServices.checked,
          protect: { noRightClick: f.noRightClick.checked, watermark: f.watermark.checked, watermarkText: f.watermarkText.value.trim(), watermarkStyle: f.watermarkStyle.value, maxSize: +f.maxSize.value, lockWorkflows: f.lockWorkflows.checked, message: f.message.value.trim() }
        });
        const rows = $$('#secRows .ed-row', f).map(r => Object.fromEntries($$('[data-k]', r).map(i => [i.dataset.k, i.value.trim()]))).filter(r => r.title);
        data.sections = rows.map(r => {
          const old = data.sections.find(s => s.id === r.id);
          let id = r.id;
          if (!id) { id = slug(r.title); let n = 2; while (rows.some(x => x.id === id) || data.sections.some(s => s.id === id)) id = slug(r.title) + '-' + n++; }
          return { ...(old || {}), id, title: r.title, type: r.type || (old && old.type) || 'image', blurb: r.blurb };
        });
        gh = { owner: f.owner.value.trim(), repo: f.repo.value.trim(), branch: f.branch.value.trim() || 'main', token: f.token.value.trim() || gh.token };
        store.set('dp-gh', gh);
        setDirty(true); PF.setData(data); PF.toast('Settings saved. Publish to make them live.');
      }
    });
  }

  /* ---------- GitHub ---------- */
  async function api(path, opts = {}) {
    const r = await fetch(`https://api.github.com/repos/${gh.owner}/${gh.repo}${path}`, {
      ...opts, headers: { Authorization: `Bearer ${gh.token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }
    });
    if (!r.ok) { const j = await r.json().catch(() => ({})); const err = new Error(`${r.status} ${j.message || r.statusText}`); err.status = r.status; throw err; }
    return r.status === 204 ? {} : r.json();
  }
  const enc = p => p.split('/').map(encodeURIComponent).join('/');
  async function getFile(path) { try { return await api(`/contents/${enc(path)}?ref=${encodeURIComponent(gh.branch)}&t=${Date.now()}`); } catch (e) { if (e.status === 404) return null; throw e; } }
  async function putFile(path, b64, message) {
    const cur = await getFile(path);
    return api(`/contents/${enc(path)}`, { method: 'PUT', body: JSON.stringify({ message, content: b64, branch: gh.branch, ...(cur ? { sha: cur.sha } : {}) }) });
  }
  async function deleteFile(path) {
    const cur = await getFile(path); if (!cur) return;
    return api(`/contents/${enc(path)}`, { method: 'DELETE', body: JSON.stringify({ message: 'Remove ' + path.split('/').pop(), sha: cur.sha, branch: gh.branch }) });
  }
  async function loadLatest() {
    const f = await getFile(DATA_PATH); if (!f) throw new Error(DATA_PATH + ' not found');
    const text = b64u8(f.content);
    Object.keys(pending).forEach(k => delete pending[k]); pendingDeletes.clear();
    PF.setData(JSON.parse(text.slice(text.indexOf('=') + 1).trim().replace(/;\s*$/, '')));
    setDirty(false);
  }
  const serialize = () => 'window.PORTFOLIO = ' + JSON.stringify(D(), null, 2) + ';\n';

  $('#edPublish').addEventListener('click', async () => {
    if (!gh.token) return openConnect();
    if (!dirty) return PF.toast('Nothing new to publish');
    const btn = $('#edPublish'); btn.disabled = true;
    const step = m => { $('#edStatus').textContent = m; };
    try {
      const all = JSON.stringify(D());
      const files = Object.keys(pending).filter(p => all.includes(p));
      let i = 0;
      for (const path of Object.keys(pending)) {
        if (!all.includes(path)) { delete pending[path]; continue; }
        step(`Uploading ${++i} of ${files.length}…`);
        await putFile(path, pending[path].b64, 'Upload ' + path.split('/').pop());
        published[path] = pending[path].url; delete pending[path];
      }
      for (const path of [...pendingDeletes]) {
        pendingDeletes.delete(path);
        if (all.includes(path)) continue;
        step('Cleaning up old files…');
        try { await deleteFile(path); } catch (e) { /* already gone */ }
      }
      step('Saving…');
      await putFile(DATA_PATH, u8b64(serialize()), 'Update portfolio content');
      setDirty(false); PF.toast('Published. The live site updates in about 1–2 minutes.');
    } catch (e) {
      setDirty(true);
      alert('Publish failed: ' + e.message + (e.status === 401 ? '\n\nThe token is wrong or expired. Open Settings → GitHub.' : e.status === 403 ? '\n\nThe token needs Contents: Read and write.' : e.status === 413 || e.status === 422 ? '\n\nA file may be too big. Use a link instead.' : ''));
    }
    btn.disabled = false;
  });

  /* ---------- Connect (first time, or on a new device via the #edit link) ---------- */
  function openConnect() {
    modal('Owner login', `
      <p class="muted">Only the owner can edit this site. Enter your GitHub details once; they are saved in this browser only.</p>
      <div class="row">${field('GitHub username', `<input name="owner" value="${esc(gh.owner || '')}">`)}${field('Repository', `<input name="repo" value="${esc(gh.repo || '')}">`)}</div>
      ${field('Access token', '<input name="token" type="password" placeholder="github_pat_…">', 'Fine-grained token with Contents: Read and write for this repository.')}
      <p class="err" id="cErr" hidden></p>`, {
      submit: 'Log in',
      onSubmit: async f => {
        const prev = gh;
        gh = { owner: f.owner.value.trim(), repo: f.repo.value.trim(), branch: gh.branch || 'main', token: f.token.value.trim() };
        try {
          const r = await api('');
          if (!r.permissions?.push) throw new Error('This token cannot write to the repository.');
        } catch (e) { gh = prev; const el = $('#cErr', f); el.hidden = false; el.textContent = 'Login failed: ' + e.message; return false; }
        store.set('dp-gh', gh);
        setTimeout(enter, 0);
      }
    });
  }

  if (location.hash === '#edit' || /[?&]edit\b/.test(location.search)) { history.replaceState(null, '', location.pathname + '#/'); PF.refresh(); enter(); }
  $('#edFab').hidden = false;
})();
