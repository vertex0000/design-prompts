# Portfolio website (ArtStation style), GitHub Pages par

Clients ko kaam dikhane ke liye portfolio. Default theme black hai, aur day mode mein white. Isme 4 sections hain:

| Section | Kya dikhta hai |
|---|---|
| **Image Editing** | Photos, aur before/after slider (drag karke compare) |
| **Motion Graphics** | MP4 video, YouTube ya Vimeo link |
| **3D Models** | FBX / GLB / OBJ model, jise browser mein rotate, zoom aur wireframe mode mein dekh sakte ho |
| **AI Automation** | n8n workflow ka diagram, steps ki list, aur Download JSON ka button |

Header mein glowing world map hai, jisme har country ka naam aur currency symbol dikhta hai. Mouse le jaane par (ya tap karne par) har country ki detail aati hai. Har jagah **Contact us** button hai. Uspe click karke client form bharta hai aur message seedha aapke WhatsApp ya email par aata hai. Neeche right corner mein floating WhatsApp button bhi hai.

Sab kuch `admin.html` se badal sakte ho: projects, sections, profile, photo, header, WhatsApp, colours, contact form.

---

## Files

| File | Kaam |
|---|---|
| `index.html` | Portfolio website |
| `admin.html` | Upload / edit / delete / publish (sirf aapke liye) |
| `data/portfolio-data.js` | **Saara content yahan hai** (profile, sections, projects) |
| `assets/css/style.css` | Design (colours, fonts) |
| `assets/js/site.js` | Website ka logic |
| `assets/js/viewer3d.js` | 3D viewer (three.js) |
| `assets/js/n8n.js` | n8n workflow diagram |
| `assets/map/world-map.svg` | Header ka world map (240 countries, naam + currency) |
| `assets/js/admin.js` | Admin ka logic |
| `assets/demo/` | Dummy banner, avatar, 3 FBX furniture models, 3 n8n workflows |
| `assets/uploads/` | Aapke uploads yahan save hote hain |
| `videos.html` | Purana link, jo ab Motion Graphics par le jata hai |

---

## Purani prompt website ko is portfolio se badalna (same repo)

1. Zip extract karo, phir **portfolio** folder ke andar jao.
2. GitHub repo kholo, **Add file → Upload files** chuno.
3. Folder ke andar ka sab kuch select karo (**Ctrl + A**) aur drag karke chhod do. Same naam wali files (index.html, admin.html, style.css…) apne aap replace ho jayengi.
4. Commit message `Portfolio version` likho aur **Commit changes** dabao.
5. 1–2 minute baad site kholo: `https://vertex0000.github.io/design-prompts/`

Purani files `data/site-data.js` aur `assets/dummy/` ab kaam ki nahi hain. Chaho to GitHub par delete kar do (file kholo, phir ⋯ → Delete file). Na bhi karo to site par koi fark nahi padega.

Aapka GitHub token isi browser mein pehle se save hai, isliye admin mein dobara nahi daalna padega.

---

## Naya project add karna (admin.html)

1. `…/design-prompts/admin.html` kholo, phir **Projects** tab par jao.
2. **Section** chuno. Form apne aap us section ke hisaab se badal jayega:
   - **Image Editing:** final images drop karo. Before/after dikhana ho to **Before image** mein original photo daalo.
   - **Motion Graphics:** MP4 drop karo (50 MB se kam) **ya** YouTube/Vimeo link paste karo. Badi videos ke liye YouTube (unlisted) best hai.
   - **3D Models:** `.fbx`, `.glb` ya `.obj` drop karo. Preview dikhega, use ghuma ke **Use this view as the cover** dabao. Cover na chuno to save karte waqt khud capture ho jata hai.
   - **AI Automation:** n8n se workflow export karo (⋯ → Download) aur `.json` drop karo, **ya** workflow copy karke paste karo. Diagram khud ban jata hai.
3. Title, description, **Software used** (Photoshop, Blender…), **Made with AI** (Midjourney, Runway…) aur **AI prompt** (optional, project page par copy button ke saath dikhta hai) bharo. **Featured** tick karoge to project sabse pehle dikhega.
4. **Add project** dabao, phir upar **Publish to GitHub**. 1–2 minute mein live ho jayega.

**Edit / Delete:** right side list mein har project ke saath buttons hain. Delete karke Publish karoge to uski uploaded files bhi GitHub se hat jayengi.

**Naya section** (jaise "Logo Design"): **Sections** tab kholo, naam likho, type chuno (Images / Videos / 3D / n8n), Add karo aur Publish karo. ↑ button se tabs ka order badal sakte ho.

**Profile and site:** naam, headline, highlights, photo, header (world map ya apna banner), email, WhatsApp, Instagram/Behance/LinkedIn, skills, software, experience, Contact button ka text, contact form ki heading aur budget options, WhatsApp floating button, accent colour aur default theme, sab yahan se badlo.

---

## Dummy content replace karna

- **Image Editing:** 5 dummy before/after projects hain (random free photos from picsum.photos). Inhe apne edits se replace karo (Edit dabao, images badlo) ya delete kar do. *Office chair* aapki apni image hai.
- **Motion Graphics:** 4 Blender open-movie videos hain (CC BY license, credit likha hai). Inhe apni reels se replace karo.
- **3D Models:** 3 simple furniture FBX models hain (chair, table, sofa), jo maine banaye hain. Apne models daalo.
- **AI Automation:** 3 sample n8n workflows hain. Ye real n8n mein import ho jaate hain, bas accounts connect karne padte hain.

Dummy projects par `dummy` tag laga hai. Client ko dikhane se pehle inhe hata dena.

---

## 3D files ke tips

- **FBX** chalta hai. Textures hon to FBX export karte waqt **Embed Media** on karo.
- Sabse reliable format **GLB** hai (Blender: File → Export → glTF Binary).
- File chhoti rakho (20 MB se kam). Heavy model mobile par slow khulega.
- Animated FBX (jaise Mixamo) apne aap play hota hai.

## Limits

- Admin se upload ki limit: image 15 MB, video / 3D 50 MB. Isse badi file ho to link use karo.
- Repo ka size 1 GB se kam rakho. Images WEBP/JPG mein compress karke daalo.
- Site ka link badalna ho (jaise `…/portfolio`), to repo **Settings → General → Repository name** se rename karo. Uske baad admin ke GitHub tab mein naya naam daalna hoga.
