/* Portfolio front end. Content comes from data/portfolio-data.js.
   The owner edits everything on the page itself (edit mode, assets/js/editor.js). */
(() => {
  let D = window.PORTFOLIO || {};
  let C, P, SECTIONS, ITEMS;
  function bind() {
    D.config ||= {}; D.profile ||= {}; D.sections ||= []; D.items ||= [];
    C = D.config; P = D.profile; SECTIONS = D.sections; ITEMS = D.items;
  }
  bind();
  const HERE = (document.currentScript && document.currentScript.src) || location.href;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const editing = () => document.documentElement.classList.contains('editing');
  /* In edit mode, files not yet published are shown from memory. */
  const src = p => (window.PF_EDITOR && window.PF_EDITOR.resolve(p)) || p;

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
  I.pencil = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
  I.trash = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>';
  I.plus = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>';
  I.camera = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
  I.lock = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

  /* ---------- Editable labels (every heading on the page can be changed in edit mode) ---------- */
  const LABELS = {
    allWork: 'All work', about: 'About me', whatIDo: 'What I do', experience: 'Experience', software: 'Software',
    contact: "Let's work together", contactText: "Tell me about your project and I'll reply within a day.",
    how: 'How we work', ctaTitle: 'Want something like this?', ctaText: 'Share your idea and get a quote on WhatsApp.',
    tabAbout: 'About', lockedTitle: 'This workflow is private', lockedText: 'The full workflow with all its settings is shared after we discuss your project.',
    requestWorkflow: 'Request this workflow'
  };
  const L = k => (C.labels && C.labels[k]) || LABELS[k];
  const ed = (path, tag = 'span', cls = '', multi = false) => (text, extra = '') =>
    `<${tag} class="${cls}" data-edit="${path}"${multi ? ' data-multi' : ''}${extra}>${esc(text)}</${tag}>`;
  const lbl = (k, tag = 'span', cls = '') => ed('config.labels.' + k, tag, cls)(L(k));
  const edBtn = (what, label = 'Edit', extra = '') => editing() ? `<button class="ed-btn" data-ed="${what}"${extra}>${I.pencil}${esc(label)}</button>` : '';

  /* ---------- Helpers ---------- */
  const sectionOf = it => SECTIONS.find(s => s.id === it.section) || { id: it.section, type: 'image', title: it.section || '' };
  const typeOf = it => sectionOf(it).type;
  const ytId = u => { const m = String(u || '').match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/); return m ? m[1] : null; };
  const vimeoId = u => { const m = String(u || '').match(/vimeo\.com\/(?:video\/)?(\d+)/); return m ? m[1] : null; };
  const fmtDate = d => { if (!d) return ''; const t = new Date(d); return isNaN(t) ? d : t.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); };
  const waLink = msg => P.whatsapp ? `https://wa.me/${String(P.whatsapp).replace(/\D/g, '')}${msg ? '?text=' + encodeURIComponent(msg) : ''}` : '';
  const sorted = list => list.slice().sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || String(b.date || '').localeCompare(String(a.date || '')));
  const wfCache = {};
  const getWorkflow = p => {
    const u = src(p);
    return (wfCache[u] ||= fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }));
  };
  const CTA = () => P.hireText || 'Contact us';
  const protect = () => (C.protect || {});

  /* ---------- Hero ---------- */
  function applyShell() {
    const root = document.documentElement;
    if (C.accent) root.style.setProperty('--accent', C.accent);
    root.classList.toggle('protect', protect().noRightClick !== false && !editing());
    document.title = C.siteTitle || P.name || 'Portfolio';
    $('#logo').innerHTML = `${P.avatar ? `<img src="${esc(src(P.avatar))}" alt="">` : ''}<span>${esc(P.name || 'Portfolio')}</span>`;
    $('#hireTop').textContent = CTA();
    const E = editing();
    $('#heroBg').style.backgroundImage = P.banner ? `url("${src(P.banner)}")` : '';
    $('#hero').classList.toggle('has-banner', !!P.banner);
    $('#heroTools').innerHTML = E ? `<button class="ed-btn" data-ed="banner">${I.camera}${P.banner ? 'Change banner' : 'Add banner'}</button>${P.banner ? `<button class="ed-btn" data-ed="banner-remove">${I.trash}Remove</button>` : ''}` : '';
    const socials = [['instagram', I.ig, 'Instagram'], ['behance', I.be, 'Behance'], ['linkedin', I.in, 'LinkedIn'], ['youtube', I.yt, 'YouTube']]
      .filter(([k]) => P[k]).map(([k, ic, n]) => `<a class="icon-btn" href="${esc(P[k])}" target="_blank" rel="noopener" aria-label="${n}">${ic}</a>`).join('');
    const trust = (P.highlights || []).map(t => `<span>${esc(t)}</span>`).join('');
    const avatar = P.avatar ? `<img class="avatar" src="${esc(src(P.avatar))}" alt="${esc(P.name)}">` : E ? '<div class="avatar avatar-empty"></div>' : '';
    $('#profile').innerHTML = `
      ${avatar ? `<div class="avatar-wrap">${avatar}${E ? `<button class="avatar-edit" data-ed="avatar" aria-label="Change profile photo">${I.camera}</button>` : ''}</div>` : ''}
      <div>
        ${ed('profile.name', 'h1')(P.name || (E ? 'Your name' : ''))}
        ${ed('profile.headline', 'p', 'headline')(P.headline || (E ? 'Your headline' : ''))}
        <div class="meta-row">
          ${P.location || E ? `<span>${I.pin}${ed('profile.location')(P.location || '')}</span>` : ''}
          ${P.availability || E ? `<span class="avail">${ed('profile.availability')(P.availability || '')}</span>` : ''}
        </div>
        ${trust || E ? `<div class="trust">${trust}${edBtn('highlights', trust ? 'Edit badges' : 'Add badges')}</div>` : ''}
      </div>
      <div class="profile-actions">
        ${socials ? `<div class="socials">${socials}</div>` : ''}
        ${P.whatsapp ? `<a class="btn btn-lg" href="${esc(waLink(`Hi ${P.name || ''}, I saw your portfolio.`))}" target="_blank" rel="noopener">${I.wa}WhatsApp</a>` : ''}
        <button class="btn btn-primary btn-lg" data-contact>${esc(CTA())}</button>
        ${edBtn('settings:contact', 'Contact details')}
      </div>`;
    const fab = $('#fab');
    fab.hidden = !(P.whatsapp && C.showChatButton !== false);
    if (!fab.hidden) {
      fab.href = waLink(`Hi ${P.name || ''}, I saw your portfolio and want to discuss a project.`);
      fab.innerHTML = `${I.wa}<span>${esc(C.chatButtonText || 'Chat with us')}</span>`;
    }
    $('#footText').innerHTML = ed('config.footerText')(C.footerText || (E ? 'Footer text' : ''));
    $('#footLinks').innerHTML = '';
  }

  function renderNav(active) {
    const count = id => ITEMS.filter(i => i.section === id).length;
    const tabs = [['#/', 'All', ITEMS.length, active === 'all'],
      ...SECTIONS.map(s => [`#/s/${s.id}`, s.title, count(s.id), active === s.id]),
      ['#/about', L('tabAbout'), null, active === 'about']];
    $('#tabs').innerHTML = tabs.map(([h, t, n, a]) => `<a href="${h}" class="${a ? 'active' : ''}">${esc(t)}${n != null ? `<span class="n">${n}</span>` : ''}</a>`).join('')
      + (editing() ? `<button class="ed-btn" data-ed="settings:sections" style="align-self:center;margin-left:8px">${I.pencil}Sections</button>` : '');
    $('#topNav').innerHTML = SECTIONS.map(s => `<a href="#/s/${s.id}" class="${active === s.id ? 'active' : ''}">${esc(s.title)}</a>`).join('');
    const on = $('#tabs .active'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /* ---------- Tiles ---------- */
  function tileMedia(it) {
    const t = typeOf(it);
    const cover = it.cover || (t === 'image' && (it.images || [])[0]) || (t === 'video' && ytId(it.video) && `https://i.ytimg.com/vi/${ytId(it.video)}/hqdefault.jpg`);
    if (cover) return `<img src="${esc(src(cover))}" alt="" loading="lazy" draggable="false">`;
    if (t === 'video' && it.video) return `<video src="${esc(src(it.video))}#t=1" muted playsinline preload="metadata"></video>`;
    if (t === 'automation' && it.workflow) return `<div class="tile-svg" data-wf="${esc(it.workflow)}"></div>`;
    if (t === 'model') return `<div class="tile-svg" style="color:var(--muted)">${I.cube}</div>`;
    return `<div class="tile-svg" style="color:var(--muted)">${TYPE_ICON[t] || I.images}</div>`;
  }
  function tile(it, withTools = true) {
    const t = typeOf(it);
    const badge = t === 'image' ? (it.before ? I.compare : (it.images || []).length > 1 ? I.images : '') : TYPE_ICON[t];
    const tools = editing() && withTools ? `<span class="tile-ed"><button data-ed="edit-item" data-id="${esc(it.id)}" aria-label="Edit">${I.pencil}</button><button data-ed="del-item" data-id="${esc(it.id)}" aria-label="Delete">${I.trash}</button></span>` : '';
    return `<a class="tile" href="#/p/${esc(it.id)}" aria-label="${esc(it.title)}">
      ${tileMedia(it)}
      ${it.featured ? '<span class="star">Featured</span>' : ''}
      ${badge ? `<span class="badge">${badge}</span>` : ''}
      ${t === 'automation' && it.workflowLocked ? `<span class="lock-badge">${I.lock}</span>` : ''}
      ${(it.ai || []).length ? '<span class="ai-badge">AI</span>' : ''}
      <span class="tile-info"><b>${esc(it.title)}</b><span>${esc(sectionOf(it).title)}</span></span>
      ${tools}
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
    const si = SECTIONS.findIndex(x => x.id === sectionId), s = SECTIONS[si];
    let list = sectionId ? ITEMS.filter(i => i.section === sectionId) : ITEMS;
    if (q) list = ITEMS.filter(i => [i.title, i.description, (i.tags || []).join(' '), (i.tools || []).join(' '), (i.ai || []).join(' '), sectionOf(i).title].join(' ').toLowerCase().includes(q));
    list = sorted(list);
    const E = editing();
    const head = q ? `<div class="section-head"><div><h2>Results for “${esc(q)}”</h2><p>${list.length} project${list.length === 1 ? '' : 's'}</p></div></div>`
      : s ? `<div class="section-head"><div>${ed(`sections.${si}.title`, 'h2')(s.title)}${s.blurb || E ? ed(`sections.${si}.blurb`, 'p')(s.blurb || '') : ''}</div></div>`
      : `<div class="section-head"><div>${lbl('allWork', 'h2')}</div></div>`;
    const services = !sectionId && !q && C.showServices !== false ? `<div class="services">${SECTIONS.map(x => {
      const n = ITEMS.filter(i => i.section === x.id).length;
      return `<a class="svc" href="#/s/${esc(x.id)}"><span class="ic">${TYPE_ICON[x.type] || I.images}</span><b>${esc(x.title)}</b>${x.blurb ? `<p>${esc(x.blurb)}</p>` : ''}<span>View ${n} project${n === 1 ? '' : 's'}</span></a>`;
    }).join('')}</div>` : '';
    const add = E && !q ? `<button class="tile tile-add" data-ed="add-item" data-section="${esc(sectionId || '')}">${I.plus}<b>Add project</b><span>${s ? esc(s.title) : 'Image, video, 3D or n8n'}</span></button>` : '';
    const empty = q ? `No project matches “${esc(q)}”.` : 'No projects here yet.';
    $('#main').innerHTML = services + head + `<div class="grid">${add}${list.length ? list.map(t => tile(t)).join('') : add ? '' : `<div class="empty">${empty}</div>`}</div>`;
    hydrateTiles($('#main'));
  }

  function renderAbout() {
    renderNav('about');
    const E = editing();
    const exp = (P.experience || []).map(e => `<li><b>${esc(e.role)}</b><span>${esc(e.company)}${e.period ? ` · ${esc(e.period)}` : ''}</span></li>`).join('');
    const steps = P.steps || [
      { title: 'Share your idea', text: 'Send the brief, references and deadline on WhatsApp or email.' },
      { title: 'Get the first draft', text: 'You receive a first version with a clear price and timeline.' },
      { title: 'Revisions and delivery', text: 'We refine it together, then you get the final files.' }];
    const contacts = [
      P.email && [`mailto:${P.email}`, I.mail, P.email],
      P.whatsapp && [waLink(), I.wa, 'WhatsApp +' + String(P.whatsapp).replace(/\D/g, '')],
      P.instagram && [P.instagram, I.ig, 'Instagram'], P.behance && [P.behance, I.be, 'Behance'],
      P.linkedin && [P.linkedin, I.in, 'LinkedIn'], P.youtube && [P.youtube, I.yt, 'YouTube']
    ].filter(Boolean).map(([h, ic, t]) => `<a href="${esc(h)}" ${/^https?:/.test(h) ? 'target="_blank" rel="noopener"' : ''}>${ic}${esc(t)}</a>`).join('');
    const bio = E ? ed('profile.bio', 'div', 'bio', true)(P.bio || 'Write about yourself…')
      : String(P.bio || '').split(/\n{2,}/).map(p => `<p>${esc(p)}</p>`).join('');
    const card = (title, body, btn = '') => `<div class="card"><div class="card-head">${title}${btn}</div>${body}</div>`;
    $('#main').innerHTML = `<div class="about">
      <div>
        ${card(lbl('about', 'h2'), bio)}
        ${(P.skills || []).length || E ? card(lbl('whatIDo', 'h2'), `<div class="chips">${(P.skills || []).map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div>`, edBtn('skills')) : ''}
        ${exp || E ? card(lbl('experience', 'h2'), `<ul class="exp">${exp}</ul>`, edBtn('experience')) : ''}
      </div>
      <div>
        ${card(lbl('contact', 'h2'), `<p style="color:var(--muted)">${ed('config.labels.contactText')(L('contactText'))}</p><button class="btn btn-primary btn-lg" data-contact style="width:100%;margin-bottom:12px">${esc(CTA())}</button><div class="contact-list">${contacts}</div>`, edBtn('settings:contact'))}
        ${card(lbl('how', 'h2'), `<ol class="steps">${steps.map(x => `<li><div><b>${esc(x.title)}</b><span>${esc(x.text)}</span></div></li>`).join('')}</ol>`, edBtn('steps'))}
        ${(P.software || []).length || E ? card(lbl('software', 'h2'), `<div class="chips">${(P.software || []).map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div>`, edBtn('software')) : ''}
      </div>
    </div>`;
  }

  /* ---------- Project viewer ---------- */
  let v3d = null;
  function closeViewer() {
    if (v3d) { v3d.dispose(); v3d = null; }
    const v = $('#viewer'); v.hidden = true; v.innerHTML = ''; document.body.style.overflow = ''; document.body.classList.remove('viewing');
  }
  function baSlider(after, before) {
    return `<div class="ba" style="--pos:50%">
      <img src="${esc(src(after))}" alt="After" draggable="false">
      <div class="ba-before"><img src="${esc(src(before))}" alt="Before" draggable="false"></div>
      <span class="ba-line"></span><span class="ba-knob">${I.arrows}</span>
      <span class="ba-tag l">Before</span><span class="ba-tag r">After</span>
      <input type="range" min="0" max="100" value="50" aria-label="Compare before and after">
    </div>`;
  }
  function videoEmbed(v, poster) {
    const y = ytId(v), vm = vimeoId(v);
    if (y) return `<iframe src="https://www.youtube.com/embed/${y}?rel=0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen title="Video"></iframe>`;
    if (vm) return `<iframe src="https://player.vimeo.com/video/${vm}" allow="autoplay; fullscreen" allowfullscreen title="Video"></iframe>`;
    return `<video src="${esc(src(v))}" ${poster ? `poster="${esc(src(poster))}"` : ''} controls playsinline preload="metadata" controlslist="nodownload noremoteplayback" disablepictureinpicture></video>`;
  }
  const img = (p, alt) => `<img src="${esc(src(p))}" alt="${esc(alt)}" loading="lazy" draggable="false">`;

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
      media += (it.before ? imgs.slice(1) : imgs).map(p => img(p, it.title)).join('');
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
    if (t !== 'image') media += imgs.map(p => img(p, it.title)).join('');

    const kv = [['Category', s.title], ['Date', fmtDate(it.date)], ['Client', it.client], ['Credit', it.credit]].filter(r => r[1]);
    const more = siblings.filter(x => x !== it).slice(0, 6);
    const v = $('#viewer');
    v.innerHTML = `
      <div class="viewer-top">
        <button class="icon-btn" data-act="close" aria-label="Close">${I.close}</button>
        <span class="title">${esc(it.title)}</span>
        ${editing() ? `<button class="ed-btn" data-ed="edit-item" data-id="${esc(it.id)}">${I.pencil}Edit project</button>` : ''}
        <button class="icon-btn" data-act="copy-link" aria-label="Copy link">${I.link}</button>
        ${siblings.length > 1 ? `<a class="icon-btn" href="#/p/${esc(prev.id)}" aria-label="Previous project">${I.left}</a><a class="icon-btn" href="#/p/${esc(next.id)}" aria-label="Next project">${I.right}</a>` : ''}
      </div>
      <div class="viewer-body">
        <div class="viewer-media">${media || '<div class="empty">No media added yet.</div>'}</div>
        <aside class="viewer-side">
          <div class="artist">${P.avatar ? `<img src="${esc(src(P.avatar))}" alt="">` : ''}<div><b>${esc(P.name || '')}</b><span>${esc(P.headline || '')}</span></div></div>
          <h1 id="vTitle">${esc(it.title)}</h1>
          ${it.description ? `<p>${esc(it.description)}</p>` : ''}
          <div class="cta-card"><b>${esc(L('ctaTitle'))}</b><p>${esc(L('ctaText'))}</p><button class="btn btn-primary btn-lg" data-contact data-service="${esc(s.title)}" data-msg="${esc(`I liked your project “${it.title}” and want something similar.`)}">${esc(CTA())}</button></div>
          <div id="extra"></div>
          ${kv.length ? `<dl class="kv">${kv.map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join('')}</dl>` : ''}
          ${(it.tools || []).length ? `<div><div class="label">Made with</div><div class="chips">${it.tools.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div></div>` : ''}
          ${(it.ai || []).length ? `<div><div class="label">AI tools used</div><div class="chips">${it.ai.map(x => `<span class="chip ai">${esc(x)}</span>`).join('')}</div></div>` : ''}
          ${it.prompt ? `<div><div class="label">AI prompt</div><div class="prompt-box">${esc(it.prompt)}<button class="btn" data-act="copy-prompt">${I.copy}Copy</button></div></div>` : ''}
          ${(it.tags || []).length ? `<div><div class="label">Tags</div><div class="chips">${it.tags.map(x => `<span class="chip">#${esc(x)}</span>`).join('')}</div></div>` : ''}
          ${more.length ? `<div><div class="label">More ${esc(s.title)}</div><div class="more">${more.map(x => tile(x, false)).join('')}</div></div>` : ''}
        </aside>
      </div>`;
    v.hidden = false; v.scrollTop = 0; document.body.style.overflow = 'hidden'; document.body.classList.add('viewing');
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
      const ext = it.modelFormat || (window.PF_EDITOR && window.PF_EDITOR.extOf(it.model));
      v3d = await mod.mountViewer(el, src(it.model), { ext });
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
      const file = String(it.workflow).split('/').pop();
      const bar = it.workflowLocked
        ? `<div class="locked"><span class="lk">${I.lock}</span><div><b>${esc(L('lockedTitle'))}</b><p>${esc(L('lockedText'))}</p></div>
            <button class="btn btn-primary" data-contact data-service="${esc(sectionOf(it).title)}" data-msg="${esc(`I'm interested in your workflow “${it.title}”.`)}">${esc(L('requestWorkflow'))}</button></div>`
        : `<div class="v3d-bar"><a class="btn btn-primary" href="${esc(src(it.workflow))}" download="${esc(file)}">${I.download}Download workflow</a>
            <button class="btn" data-act="copy-wf">${I.copy}Copy JSON</button><span class="hint">${sm.nodes} nodes${sm.trigger ? `, starts with ${esc(sm.trigger)}` : ''}</span></div>`;
      box.insertAdjacentHTML('afterend', bar);
      $('#extra').innerHTML = `<div><div class="label">Workflow steps</div><ul class="node-list">${sm.list.map(n => `<li><i style="background:${n.color}"></i>${esc(n.name)}<span>${esc(n.app)}</span></li>`).join('')}</ul></div>
        ${it.workflowLocked ? '' : '<div class="import-help">To use it: open n8n, choose <b>Import from file</b> (or paste the copied JSON on the canvas), then connect your own accounts.</div>'}`;
    } catch (e) {
      box.innerHTML = '<div class="v3d-status err" style="position:static;min-height:160px">This workflow file could not be loaded.</div>';
    }
  }

  /* ---------- Events ---------- */
  $('#viewer').addEventListener('click', async e => {
    const a = e.target.closest('[data-act]'), b3 = e.target.closest('[data-3d]');
    const cur = () => ITEMS.find(i => location.hash === '#/p/' + i.id);
    if (a) {
      if (a.dataset.act === 'close') location.hash = lastList;
      if (a.dataset.act === 'copy-link') copy(location.href, 'Link copied');
      if (a.dataset.act === 'copy-prompt') { const it = cur(); if (it) copy(it.prompt, 'Prompt copied'); }
      if (a.dataset.act === 'copy-wf') { const it = cur(); if (it && !it.workflowLocked) getWorkflow(it.workflow).then(wf => copy(JSON.stringify(wf, null, 2), 'Workflow JSON copied')); }
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
    if ($('#viewer').hidden || !$('#sheet').hidden || document.querySelector('.modal:not([hidden])')) return;
    if (e.key === 'Escape') location.hash = lastList;
    if (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const l = $(`#viewer .viewer-top a[aria-label="${e.key === 'ArrowLeft' ? 'Previous' : 'Next'} project"]`);
      if (l) location.hash = l.getAttribute('href');
    }
  });
  document.addEventListener('mouseover', e => { const vd = e.target.closest('.tile')?.querySelector('video'); if (vd) vd.play().catch(() => {}); });
  document.addEventListener('mouseout', e => { const t = e.target.closest('.tile'); if (t && !t.contains(e.relatedTarget)) t.querySelector('video')?.pause(); });

  /* Download protection (the owner's edit mode is not affected). */
  document.addEventListener('contextmenu', e => {
    if (!document.documentElement.classList.contains('protect')) return;
    if (e.target.closest('img, video, canvas, .ba, .tile, .hero, .flow')) { e.preventDefault(); toast(C.protect?.message || 'Downloads are disabled. Contact us for files.'); }
  });
  document.addEventListener('dragstart', e => { if (document.documentElement.classList.contains('protect') && e.target.tagName === 'IMG') e.preventDefault(); });

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
  function toast(m) { const el = $('#toast'); el.textContent = m; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 2000); }

  /* ---------- Contact sheet ---------- */
  function openContact(service, msg) {
    const sh = $('#sheet');
    const phone = String(P.whatsapp || '').replace(/\D/g, '');
    const opts = [...SECTIONS.map(x => x.title), 'Something else'];
    const budgets = C.budgets ?? ['Under ₹5,000', '₹5,000 – ₹15,000', '₹15,000 – ₹50,000', 'Above ₹50,000'];
    sh.innerHTML = `<div class="sheet-box">
      <button class="icon-btn close" data-close aria-label="Close">${I.close}</button>
      <h2 id="sheetTitle">${esc(C.contactTitle || "Let's talk about your project")}</h2>
      <p>${esc(C.contactIntro || 'Tell me what you need. I usually reply within a few hours.')}</p>
      <div class="quick">
        ${phone ? `<a class="wa" href="${esc(waLink(`Hi ${P.name || ''}, I saw your portfolio.`))}" target="_blank" rel="noopener">${I.wa}WhatsApp</a>` : ''}
        ${P.email ? `<a href="mailto:${esc(P.email)}">${I.mail}Email</a>` : ''}
        ${phone ? `<a href="tel:+${phone}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>Call</a>` : ''}
      </div>
      <form class="cform" id="cform">
        <div class="row2">
          <label>Your name<input name="name" required autocomplete="name" placeholder="Your name"></label>
          <label>Business (optional)<input name="biz" autocomplete="organization" placeholder="Brand or company"></label>
        </div>
        <div class="row2">
          <label>What do you need?<select name="service">${opts.map(o => `<option ${o === service ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>
          ${budgets.length ? `<label>Budget (optional)<select name="budget"><option value="">Not sure yet</option>${budgets.map(b => `<option>${esc(b)}</option>`).join('')}</select></label>` : ''}
        </div>
        <label>Project details<textarea name="msg" placeholder="What is it for, any references, and when do you need it?">${msg ? esc(msg) : ''}</textarea></label>
        <div class="acts">
          ${phone ? `<button class="btn btn-primary btn-lg" type="submit" name="via" value="wa">${I.wa}Send on WhatsApp</button>` : ''}
          ${P.email ? `<button class="btn btn-lg" type="submit" name="via" value="mail">${I.mail}Send by email</button>` : ''}
        </div>
      </form></div>`;
    sh.hidden = false; document.body.style.overflow = 'hidden';
    sh.querySelector('input[name=name]').focus();
  }
  function closeContact() { $('#sheet').hidden = true; $('#sheet').innerHTML = ''; if ($('#viewer').hidden) document.body.style.overflow = ''; }
  document.addEventListener('click', e => {
    if (e.target.closest('[data-ed]')) return;
    const c = e.target.closest('[data-contact]');
    if (c) { e.preventDefault(); openContact(c.dataset.service, c.dataset.msg); return; }
    if (e.target.id === 'sheet' || e.target.closest('[data-close]')) closeContact();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sheet').hidden) { e.stopImmediatePropagation(); closeContact(); } }, true);
  document.addEventListener('submit', e => {
    if (e.target.id !== 'cform') return;
    e.preventDefault();
    const f = new FormData(e.target), via = e.submitter ? e.submitter.value : 'wa';
    const lines = [`Hi ${P.name || ''}, I found you through your portfolio.`, '', `Name: ${f.get('name')}`];
    if (f.get('biz')) lines.push(`Business: ${f.get('biz')}`);
    lines.push(`Service: ${f.get('service')}`);
    if (f.get('budget')) lines.push(`Budget: ${f.get('budget')}`);
    if (f.get('msg')) lines.push('', f.get('msg'));
    const text = lines.join('\n');
    if (via === 'mail') location.href = `mailto:${P.email}?subject=${encodeURIComponent('Project enquiry: ' + f.get('service'))}&body=${encodeURIComponent(text)}`;
    else window.open(waLink(text), '_blank', 'noopener');
    toast('Opening ' + (via === 'mail' ? 'email' : 'WhatsApp') + '…');
  });

  /* Broken thumbnail? Show a clean placeholder instead of a broken-image icon. */
  document.addEventListener('error', e => {
    const im = e.target;
    if (im.tagName !== 'IMG' || !im.closest('.tile')) return;
    const t = im.closest('.tile'); const it = ITEMS.find(i => t.getAttribute('href') === '#/p/' + i.id);
    const vid = it && typeOf(it) === 'video' && it.video && !ytId(it.video) && !vimeoId(it.video);
    im.outerHTML = vid ? `<video src="${esc(src(it.video))}#t=1" muted playsinline preload="metadata"></video>`
      : `<div class="tile-svg" style="color:var(--muted)">${it ? TYPE_ICON[typeOf(it)] || I.images : I.images}</div>`;
  }, true);

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

  /* ---------- API for the owner's editor ---------- */
  window.PF = {
    get data() { return D; },
    setData(d) { D = window.PORTFOLIO = d; bind(); this.refresh(); },
    refresh() { bind(); applyShell(); route(); },
    rerenderShell() { applyShell(); },
    toast, typeOf: it => typeOf(it), sectionTypeOf: id => (SECTIONS.find(s => s.id === id) || {}).type || 'image',
    viewerUrl: new URL('viewer3d.js', HERE).href
  };
  applyShell();
  route();

  /* Load the editor only for the owner: when a GitHub token is saved in this browser, or via the #edit link. */
  let hasToken = false;
  try { hasToken = !!(JSON.parse(localStorage.getItem('dp-gh') || '{}').token); } catch (e) {}
  if (hasToken || location.hash === '#edit' || /[?&]edit\b/.test(location.search)) {
    const s = document.createElement('script');
    s.src = new URL('editor.js', HERE).href + '?v=' + Date.now();
    document.body.appendChild(s);
  }
})();
