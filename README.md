# PromptCanvas — Design Styles + AI Prompts (GitHub Pages)

Graphic designers ke liye prompt gallery: 22 design styles, har style ki theory, color palette, fonts aur copy-ready prompts (text + JSON). Alag video page. Admin page se upload, edit, delete — sab kuch.

---

## 1. Files kya karti hain

| File | Kaam |
|---|---|
| `index.html` | Images gallery (All, style filter, Style guide, Favorites) |
| `videos.html` | Video prompts page |
| `admin.html` | Upload / edit / delete / settings / GitHub publish |
| `data/site-data.js` | **Saara content yahi hai** — site name, colors, styles, images, videos |
| `assets/css/style.css` | Design (colors, fonts, spacing) |
| `assets/js/site.js` | Gallery ka logic (edit karne ki zaroorat nahi) |
| `assets/js/admin.js` | Admin ka logic (edit karne ki zaroorat nahi) |
| `assets/dummy/` | 22 dummy artworks + 2 dummy video loops |
| `assets/uploads/` | Aapke upload yahan save honge |

---

## 2. GitHub par live kaise karein (ek baar)

1. github.com par **New repository** banao, naam e.g. `design-prompts`, **Public** rakho.
2. **Add file → Upload files** → is folder ki saari files/folders drag karo → **Commit changes**.
3. Repo **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)` → Save.
4. 1–2 minute baad site live: `https://USERNAME.github.io/design-prompts/`

---

## 3. Admin page se upload chalu karna (ek baar)

1. GitHub → profile photo → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. *Repository access*: **Only select repositories** → apna `design-prompts` repo.
3. *Permissions → Repository → Contents*: **Read and write**. Generate karo, token copy karo.
4. Site par `…/admin.html` kholo → **GitHub connection** tab → username, repo name, branch `main`, token daalo → **Save and test**.

Token sirf aapke browser mein save hota hai. Admin page public hai, par bina token ke koi kuch change nahi kar sakta.

---

## 4. Roz ka kaam (admin.html)

**Nayi image add karna**
Images tab → file drop karo → Heading, Design style, AI model, Prompt likho → **Add to timeline** → upar **Publish to GitHub**. 1–2 min mein site ke top par dikhega (naya content sabse upar aata hai).

**Video add karna**
Videos tab → MP4 upload (20 MB se kam, 5–15 sec) **ya** YouTube / cloud link paste karo → prompt → Add → Publish.

**Edit / Delete** — list mein har item ke saath Edit aur Delete button hai. Phir Publish.

**Naya design style** — Design styles tab → naam (yahi heading banega), theory, palette (`#hex, #hex`), fonts, best for → Add style → Publish. ↑ button se order badlo.

**Site ka naam, logo, color, headings** — Site settings tab → Save settings → Publish.

> Rule yaad rakho: admin mein kuch bhi karo, **Publish to GitHub** dabaye bina live nahi hoga.

---

## 5. Dummy images kaise replace karein

Har dummy card mein ek prompt hai. Best tareeka:
1. Wo prompt copy karo → Nano Banana / GPT Image / Midjourney mein image banao.
2. Admin → Images → us item par **Edit** → nayi file drop karo → Credit mein apna naam likho → Save changes → Publish.
3. Tag `dummy` hata do.

Videos: 4 videos Blender Foundation ki open movies hain (CC BY license, credit likha hua hai). 2 animated SVG dummies hain. Inhe bhi same tareeke se apni AI videos se replace karo.

---

## 6. Bina admin ke manually change karna

`data/site-data.js` GitHub par kholo → pencil (Edit) icon → change karo → Commit. Structure:

```js
window.SITE_DATA = {
  "config": { "siteName": "...", "accent": "#5B3DF5", ... },
  "styles": [ { "id": "retro", "name": "Retro", "theory": "...", "palette": ["#F4E3C1"], "fonts": "...", "bestFor": "..." } ],
  "images": [ { "id": "img-1", "title": "...", "style": "retro", "model": "Nano Banana", "ratio": "1:1",
                "prompt": "...", "tags": ["poster"], "src": "assets/uploads/images/file.jpg", "date": "2026-09-25" } ],
  "videos": [ { "...same fields...", "poster": "optional cover image link" } ]
};
```

Dhyan rakho: har item ke baad comma, aur quotes `"` sahi band hon. Galti ho jaye to site khali dikhegi — Admin → **Download data file** wali purani file wapas daal do.

**Fonts / design badalna**: `assets/css/style.css` ke top par `:root` mein colors aur fonts hain. Font badalne ke liye HTML files mein Google Fonts link bhi badlo.

**Menu mein naya page**: `assets/js/site.js` mein `renderNav()` ke andar `links` list mein ek line add karo.

---

## 7. Claude se content add karwana (optional)

Bahut saare prompts ek saath add karne hon to: Claude Code / Claude Desktop mein **GitHub MCP server** connect karo, phir bolo *"design-prompts repo ke data/site-data.js mein ye 10 prompts Cyberpunk style mein add karo aur images assets/uploads/images mein daalo"*. Khud ka MCP server banane ki zaroorat nahi.

---

## 8. Limits

- GitHub par ek file max 100 MB; admin se upload limit 50 MB video / 10 MB image. Badi video ke liye YouTube (unlisted) link best hai.
- Repo 1 GB se chhota rakho → images WEBP/JPG mein compress karke daalo (TinyPNG, Squoosh).
- Favorites har visitor ke apne browser mein save hote hain.
- Local test: folder mein `python -m http.server` chalao ya VS Code *Live Server* use karo (file double-click se bhi kaam karega, bas admin publish ke liye internet chahiye).
