# OniVerse.SBS

Website komik online — Baca manhwa, manga, manhua gratis.

## Tech Stack
- Pure HTML + CSS + Vanilla JS
- Data: `scraped_data/series.json`
- Reader API: `api.shngm.io`

## Deploy
Hosted on **Cloudflare Pages** → [oniverse.sbs](https://oniverse.sbs)

## Development
Buka langsung `index.html` di browser, atau:
```bash
npx serve . -p 3333
```

## File Structure
```
├── index.html          # Main page
├── styles.css          # All styles
├── app.js              # Application logic
├── _headers            # Cloudflare security headers
├── _redirects          # Cloudflare redirects
└── scraped_data/
    └── series.json     # Comic database
```
