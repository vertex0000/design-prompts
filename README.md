# Portfolio website (GitHub Pages)

Clients ke liye portfolio: **Image Editing** (before/after slider), **Motion Graphics** (video), **3D Models** (FBX viewer) aur **AI Automation** (n8n workflow diagram). Default theme black hai, day mode mein white. Har jagah **Contact us** button hai, jo client ka message seedha aapke WhatsApp ya email par bhejta hai.

## Sab kuch website par hi edit hota hai (sirf aap)

1. Apni site kholo: `https://vertex0000.github.io/design-prompts/`
2. Neeche left mein **✏️ Edit site** button dikhega. Ye sirf aapke browser mein dikhta hai, clients ko nahi.
   - Naye phone ya laptop par pehli baar: link ke end mein `#edit` lagao (`…/design-prompts/#edit`). Username, repo aur token daalo, bas.
3. Edit mode mein:
   - **Koi bhi text** (naam, headline, location, About me, headings, footer): uspe click karo aur type karo.
   - **Profile photo:** photo par 📷 dabao aur device se image chuno.
   - **Banner:** upar right mein **Change banner** / **Remove**.
   - **Naya project:** kisi bhi section mein pehla tile **+ Add project** hai. Image, video, FBX ya n8n JSON chuno, description, software, AI tools aur AI prompt bharo.
   - **Edit / Delete:** har project tile par ✏️ aur 🗑️ buttons.
   - **About:** "What I do", "Experience", "How we work", "Software" ke saath **Edit** button hai.
   - **Settings** (neeche bar mein): contact details, WhatsApp, social links, contact form, sections (add / rename / reorder), protection, colours, GitHub.
4. Kaam ho jaye to **Publish** dabao. 1–2 minute mein live ho jayega.

Publish se pehle page reload karoge to unpublished changes chale jayenge. Browser iske liye warning deta hai.

## Protection

| Kya | Kaise |
|---|---|
| Edit sirf aap | Publish ke liye aapka GitHub token chahiye. Link kisi ko bhi bhejo, koi change nahi kar sakta. |
| Image download | Visitors ke liye right-click, drag aur "Save image" band. Nayi images par apne aap **watermark** lagta hai aur ~1600px web-size copy upload hoti hai. Original aapke PC mein rehta hai. |
| n8n workflow lock | Project mein **🔒 Lock download** on karo. Tab sirf diagram aur steps ke naam upload hote hain. API keys, prompts aur settings upload hi nahi hote. Client ko **Request this workflow** button dikhta hai. |
| Video | Download button band. Badi ya important videos ke liye YouTube (unlisted) link best hai. |

**Honest note:** koi bhi website screenshot ko nahi rok sakti. Repo **Public** hai, isliye uploaded files github.com par dikh sakti hain. Isliye watermark aur web-size wala tareeka use kiya hai. 3D FBX browser mein dikhane ke liye download hona zaroori hai, isliye website par sirf preview/low-poly version daalo.

## Files

| File | Kaam |
|---|---|
| `index.html` | Website |
| `data/portfolio-data.js` | Saara content (edit mode isi ko update karta hai) |
| `assets/js/site.js` | Website logic |
| `assets/js/editor.js` | Owner edit mode (sirf aapke browser mein load hota hai) |
| `assets/js/viewer3d.js` | 3D viewer |
| `assets/js/n8n.js` | n8n diagram |
| `assets/css/style.css` | Design |
| `admin.html` | Purana link, ab edit mode par le jata hai |

## Limits
- Image 30 MB tak (web-size mein badal jati hai), video aur 3D 50 MB tak. Isse badi file ho to link use karo.
- 3D: FBX mein textures embed karo (Export → Embed Media). GLB sabse reliable format hai.
- Repo ka size 1 GB se kam rakho.
