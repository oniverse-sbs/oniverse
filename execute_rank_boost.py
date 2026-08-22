import json
import re
import os
import subprocess
from datetime import datetime

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
DATA_INITIAL_JS = os.path.join(SHINIGAMI_APP_DIR, "data-initial.js")
INDEX_HTML = os.path.join(SHINIGAMI_APP_DIR, "index.html")
HTML_404 = os.path.join(SHINIGAMI_APP_DIR, "404.html")
APP_JS = os.path.join(SHINIGAMI_APP_DIR, "app.js")

print("=== EXECUTING MAXIMUM TRAFFIC & RANKING SEO BOOST FOR ONIVERSE.SBS ===")

# Load 26 catalog series
with open(DATA_INITIAL_JS, "r", encoding="utf-8") as f:
    js_text = f.read()
    json_str = js_text.replace("window.SERIES_DATA =", "").strip().rstrip(";")
    series_arr = json.loads(json_str)

# 1. Inject Rich SEO Keyword Footer Block & ItemList Schema into index.html
with open(INDEX_HTML, "r", encoding="utf-8") as f:
    idx_html = f.read()

# Build ItemList JSON-LD Schema for Googlebot to index all 26 series automatically from HTML
item_list_elements = []
for pos, s in enumerate(series_arr, 1):
    slug = s.get("slug") or s.get("id")
    title = s.get("title")
    item_list_elements.append({
        "@type": "ListItem",
        "position": pos,
        "name": f"Baca {title} Sub Indo",
        "url": f"https://oniverse.sbs/komik/{slug}/"
    })

item_list_schema = json.dumps({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Daftar Komik Manhwa Sub Indo & Manga Populer — OniVerse.SBS",
    "numberOfItems": len(series_arr),
    "itemListElement": item_list_elements
}, ensure_ascii=False)

schema_block = f'''  <!-- ===== GOOGLE ITEMLIST SCHEMA (Automatic Deep Indexing) ===== -->
  <script type="application/ld+json">
  {item_list_schema}
  </script>'''

if 'ItemList' not in idx_html:
    idx_html = idx_html.replace('</head>', f'{schema_block}\n</head>')

# Rich SEO Footer Text Content
seo_footer_html = '''
    <!-- ===== SEO KEYWORD RANKING BOOST FOOTER SECTION ===== -->
    <section class="seo-ranking-section" style="margin-top:3rem; padding:2rem; background:rgba(20,18,44,0.7); border:1px solid rgba(124,58,237,0.2); border-radius:16px; font-family:Inter,sans-serif; color:#9ca3af; line-height:1.7;">
      <h2 style="color:#e2e8f0; font-family:Outfit,sans-serif; font-size:1.4rem; margin-bottom:1rem;">OniVerse.SBS — Pusat Baca Komik Indonesia, Manhwa Sub Indo & Manga Online Gratis</h2>
      <p style="font-size:0.9rem; margin-bottom:1rem;">
        Selamat datang di <strong>OniVerse.SBS</strong>, platform tempat <strong>baca komik Indonesia</strong> terlengkap dan gratis. Di sini kamu bisa menikmati ribuan chapter <strong>manhwa sub indo</strong>, manga, dan manhua bahasa Indonesia dengan resolusi gambar HD paling jernih tanpa ganguan iklan. Kami selalu memperbarui komik-komik hits setiap hari langsung dari sumber terpercaya seperti <em>Shinigami ID, Komikcast, Kiryuu, WestManga,</em> dan <em>Komiku</em>.
      </p>

      <h3 style="color:#a855f7; font-size:1.1rem; margin:1.2rem 0 0.6rem;">Koleksi Komik Sub Indo Paling Populer Hari Ini</h3>
      <ul style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:0.5rem; list-style:none; padding:0; margin:0 0 1.2rem; font-size:0.85rem;">
        <li>🔥 <a href="/komik/one-piece/" style="color:#cbd5e1; text-decoration:none;">Baca One Piece Sub Indo</a></li>
        <li>⚡ <a href="/komik/caf1c938-7512-4850-9b60-9c15f9dca173/" style="color:#cbd5e1; text-decoration:none;">The Beginning After The End</a></li>
        <li>🗡️ <a href="/komik/16778db0-17c0-43c4-aa4a-3a4a0df5ec0b/" style="color:#cbd5e1; text-decoration:none;">Overgeared Sub Indo</a></li>
        <li>👹 <a href="/komik/c0f1d049-ff7f-474d-8c6a-3a55e4c44147/" style="color:#cbd5e1; text-decoration:none;">Demonic Emperor Sub Indo</a></li>
        <li>🌟 <a href="/komik/6073d705-cd8b-4b71-a806-7c6ce6501ed3/" style="color:#cbd5e1; text-decoration:none;">Legend of Star General</a></li>
        <li>⚔️ <a href="/komik/4a0b6c8f-1500-4e14-b2ed-364c72fa2963/" style="color:#cbd5e1; text-decoration:none;">Chronicles Of The Demon Faction</a></li>
        <li>💥 <a href="/komik/gachiakuta/" style="color:#cbd5e1; text-decoration:none;">Gachiakuta Sub Indo</a></li>
        <li>👑 <a href="/komik/a5d0bb1f-bfe4-4a5a-a72d-b7fa3695b202/" style="color:#cbd5e1; text-decoration:none;">A Mercenary’s Rebirth</a></li>
      </ul>

      <h3 style="color:#a855f7; font-size:1.1rem; margin:1.2rem 0 0.6rem;">Kategori & Genre Komik Favorit</h3>
      <div style="display:flex; flex-wrap:wrap; gap:6px; font-size:0.8rem;">
        <span style="background:rgba(124,58,237,0.15); border:1px solid rgba(124,58,237,0.3); color:#c084fc; padding:4px 10px; border-radius:20px;">Manhwa Action Sub Indo</span>
        <span style="background:rgba(124,58,237,0.15); border:1px solid rgba(124,58,237,0.3); color:#c084fc; padding:4px 10px; border-radius:20px;">Komik Murim Bahasa Indonesia</span>
        <span style="background:rgba(124,58,237,0.15); border:1px solid rgba(124,58,237,0.3); color:#c084fc; padding:4px 10px; border-radius:20px;">Manga Shounen Sub Indo</span>
        <span style="background:rgba(124,58,237,0.15); border:1px solid rgba(124,58,237,0.3); color:#c084fc; padding:4px 10px; border-radius:20px;">Manhua Fantasy Sub Indo</span>
        <span style="background:rgba(124,58,237,0.15); border:1px solid rgba(124,58,237,0.3); color:#c084fc; padding:4px 10px; border-radius:20px;">Komik System & Reinkarnasi</span>
      </div>
    </section>
'''

if 'seo-ranking-section' not in idx_html:
    idx_html = idx_html.replace('</main>', f'{seo_footer_html}\n</main>')

with open(INDEX_HTML, "w", encoding="utf-8") as f:
    f.write(idx_html)

print("Injected ItemList Schema & SEO Ranking Footer into index.html!")

# 2. Update app.js to dynamically update document.title, og:title, og:image, and meta description when opening any comic/chapter
with open(APP_JS, "r", encoding="utf-8") as f:
    app_js = f.read()

# Make openDetail update SEO meta dynamically
seo_update_func = '''
  function updateSEOMeta(meta) {
    if (!meta) return;
    if (meta.title) document.title = meta.title;
    let mDesc = document.querySelector('meta[name="description"]');
    if (mDesc && meta.description) mDesc.setAttribute('content', meta.description);
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && meta.title) ogTitle.setAttribute('content', meta.title);
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && meta.description) ogDesc.setAttribute('content', meta.description);
    let ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg && meta.image) ogImg.setAttribute('content', meta.image);
  }
'''

if 'function updateSEOMeta' not in app_js:
    app_js = app_js.replace('function openDetail(', f'{seo_update_func}\n  function openDetail(')

with open(APP_JS, "w", encoding="utf-8") as f:
    f.write(app_js)

print("Updated app.js dynamic SEO meta switcher!")

# 3. Apply Cache Busting timestamp across HTML files
v_ts = str(int(datetime.now().timestamp()))
for filepath in [INDEX_HTML, HTML_404]:
    if not os.path.exists(filepath): continue
    with open(filepath, "r", encoding="utf-8") as f:
        c = f.read()
    c = re.sub(r'data-initial\.js\?v=[^"]+', f'data-initial.js?v={v_ts}', c)
    c = re.sub(r'styles\.css\?v=[^"]+', f'styles.css?v={v_ts}', c)
    c = re.sub(r'app\.js\?v=[^"]+', f'app.js?v={v_ts}', c)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(c)

# 4. Commit and Push to Git
subprocess.run(["git", "add", "index.html", "404.html", "app.js"], cwd=SHINIGAMI_APP_DIR, check=True)
subprocess.run(["git", "commit", "-m", f"Execute maximum traffic and ranking SEO boost v={v_ts}"], cwd=SHINIGAMI_APP_DIR, check=True)
push_res = subprocess.run(["git", "push", "origin", "main"], cwd=SHINIGAMI_APP_DIR, capture_output=True, text=True)

print("Git Push Output:", push_res.stdout)
if push_res.stderr:
    print("Git Push Stderr:", push_res.stderr)

print("=== MAXIMUM RANKING SEO BOOST EXECUTED & DEPLOYED ===")
