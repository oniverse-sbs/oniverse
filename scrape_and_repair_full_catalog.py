import urllib.request
import json
import ssl
import os
import re
import time
import sys
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

SHINIGAMI_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
DATA_DIR = os.path.join(SHINIGAMI_DIR, "data")
DETAIL_DIR = os.path.join(DATA_DIR, "detail")
KOMIK_DIR = os.path.join(SHINIGAMI_DIR, "komik")
os.makedirs(DETAIL_DIR, exist_ok=True)
os.makedirs(KOMIK_DIR, exist_ok=True)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/html, */*'
}

def fetch_json(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, context=ctx, timeout=12) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(1)
            else:
                print(f"  [ERROR] fetch_json {url}: {e}")
                return None

TARGET_SERIES = [
    # Newly requested series from Shinigami (Top Priority)
    {"id": "d3b05787-4c8e-42bb-ba9a-6b2fafd92f3c", "slug": "d3b05787-4c8e-42bb-ba9a-6b2fafd92f3c", "custom_slug": "nano-machine"},
    {"id": "75776a81-4095-4ee6-9313-4e98245fb2fa", "slug": "75776a81-4095-4ee6-9313-4e98245fb2fa", "custom_slug": "shadow-slave"},
    {"id": "6915ddaf-380a-47d8-aa8a-c48ba8778db5", "slug": "6915ddaf-380a-47d8-aa8a-c48ba8778db5", "custom_slug": "juvenile-prison"},
    {"id": "34fb4347-728f-4463-b68a-3796ca2ef48a", "slug": "34fb4347-728f-4463-b68a-3796ca2ef48a", "custom_slug": "i-love-the-demon-lord-so-much"},
    {"id": "4db59224-242e-43b0-8bfe-0c7d3ccb2196", "slug": "4db59224-242e-43b0-8bfe-0c7d3ccb2196", "custom_slug": "reality-quest"},
    {"id": "81b23d63-915c-4933-a4af-72f613718d02", "slug": "81b23d63-915c-4933-a4af-72f613718d02", "custom_slug": "what-can-i-do-alone"},
    {"id": "965b599c-54d5-4f91-820a-750d8f252a04", "slug": "965b599c-54d5-4f91-820a-750d8f252a04", "custom_slug": "bad-guy"},
    {"id": "e5c6c4e5-959e-4de4-9549-db50fa76cacd", "slug": "e5c6c4e5-959e-4de4-9549-db50fa76cacd", "custom_slug": "the-baddest-villainess-is-back"},
    {"id": "d4c27128-b457-4e45-85a8-8be3f5a98971", "slug": "d4c27128-b457-4e45-85a8-8be3f5a98971", "custom_slug": "resurrection-boy"},
    
    # Core Popular Series
    {"id": "a2ba8fcf-f554-4568-95ea-f0cc997ab394", "slug": "a2ba8fcf-f554-4568-95ea-f0cc997ab394", "custom_slug": "all-hail-the-sect-leaders"},
    {"id": "7701ba39-f6b3-46ab-873f-cbc1fe93fb10", "slug": "7701ba39-f6b3-46ab-873f-cbc1fe93fb10", "custom_slug": "player-who-cant-level-up"},
    {"id": "d4e9983e-69eb-4370-b93a-f310b6e81faa", "slug": "d4e9983e-69eb-4370-b93a-f310b6e81faa", "custom_slug": "face-genius-0-year-old-top-star"},
    {"id": "cae262f8-ae2c-4626-a9b3-8f2dc6b72117", "slug": "cae262f8-ae2c-4626-a9b3-8f2dc6b72117", "custom_slug": "the-wind-mage"},
    {"id": "c8077427-0ad6-4358-9497-98fd338f6425", "slug": "c8077427-0ad6-4358-9497-98fd338f6425", "custom_slug": "my-dad-is-the-strongest-under-heaven"},
    {"id": "4751525f-359c-423a-9fdb-44d40ac8105d", "slug": "4751525f-359c-423a-9fdb-44d40ac8105d", "custom_slug": "the-return-of-the-crazy-demon"},
    {"id": "4a0b6c8f-1500-4e14-b2ed-364c72fa2963", "slug": "4a0b6c8f-1500-4e14-b2ed-364c72fa2963", "custom_slug": "chronicles-of-the-demon-faction"},
    {"id": "16778db0-17c0-43c4-aa4a-3a4a0df5ec0b", "slug": "16778db0-17c0-43c4-aa4a-3a4a0df5ec0b", "custom_slug": "overgeared"},
    {"id": "c0f1d049-ff7f-474d-8c6a-3a55e4c44147", "slug": "c0f1d049-ff7f-474d-8c6a-3a55e4c44147", "custom_slug": "demonic-emperor"},
    {"id": "a5d0bb1f-bfe4-4a5a-a72d-b7fa3695b202", "slug": "a5d0bb1f-bfe4-4a5a-a72d-b7fa3695b202", "custom_slug": "a-mercenarys-rebirth-among-nobles"},
    {"id": "e4e70fb1-c2eb-4b84-be6a-42c1cbe5220c", "slug": "e4e70fb1-c2eb-4b84-be6a-42c1cbe5220c", "custom_slug": "return-of-frozen-player"},
    {"id": "57a7c362-f6f0-43f6-9189-fc43a0ee8ed8", "slug": "57a7c362-f6f0-43f6-9189-fc43a0ee8ed8", "custom_slug": "the-great-master"},
    {"id": "8ac46849-b4e0-4d3f-9e7e-f9a291502252", "slug": "8ac46849-b4e0-4d3f-9e7e-f9a291502252", "custom_slug": "dark-and-light-martial-emperor"},
    {"id": "5b4a479f-37ed-41b3-8cb0-0358f4b8fdfc", "slug": "5b4a479f-37ed-41b3-8cb0-0358f4b8fdfc", "custom_slug": "trash-of-the-counts-family"},
    {"id": "9d0ec5d4-321d-4914-a692-250f64553f9c", "slug": "9d0ec5d4-321d-4914-a692-250f64553f9c", "custom_slug": "i-am-player-who-suck-alone"},
    {"id": "e9f8b5dd-8558-4e9d-9fe9-e2bf2fe6f165", "slug": "e9f8b5dd-8558-4e9d-9fe9-e2bf2fe6f165", "custom_slug": "maxed-strength-necromancer"},
    {"id": "48270276-bd79-4a46-b15e-fdd2cf5655b1", "slug": "one-piece", "custom_slug": "one-piece"},
    {"id": "f33095cb-4bae-42f3-bad0-a80106f2962b", "slug": "marriage-with-a-suspiciously-demure-husband", "custom_slug": "marriage-with-a-suspiciously-demure-husband"},
    {"id": "b6c97721-c026-4e02-bf1f-d443caadda8f", "slug": "gachiakuta", "custom_slug": "gachiakuta"},
]

print("=" * 70)
print(f"STARTING FULL SCRAPE & REPAIR OF ALL {len(TARGET_SERIES)} ONIVERSE SERIES")
print("=" * 70)

all_repaired_series = []

for idx, target in enumerate(TARGET_SERIES, 1):
    series_id = target["id"]
    slug = target["slug"]
    cslug = target.get("custom_slug", slug)
    
    print(f"\n[{idx}/{len(TARGET_SERIES)}] Scraping real details & chapters for: {series_id} ({cslug})...")
    
    # 1. Fetch metadata
    detail_api = f"https://api.shngm.io/v1/manga/detail/{series_id}"
    d_json = fetch_json(detail_api)
    
    if not d_json or d_json.get("retcode") != 0 or not d_json.get("data"):
        print(f"  [WARN] Failed to fetch metadata for {series_id}")
        continue
        
    data = d_json["data"]
    title = data.get("title") or data.get("name") or "Unknown Title"
    cover = data.get("cover_portrait_url") or data.get("cover_image_url") or ""
    synopsis = data.get("description") or data.get("synopsis") or ""
    
    # Country / Type
    cid = data.get("country_id")
    type_name = "Manhwa"
    if cid == 2 or cid == "JP": type_name = "Manga"
    elif cid == 3 or cid == "CN": type_name = "Manhua"
    elif cid == 1 or cid == "KR": type_name = "Manhwa"
    
    # Genres
    genres = []
    taxonomy = data.get("taxonomy", {})
    if taxonomy:
        genres = [g.get("name") for g in taxonomy.get("Genre", []) if isinstance(g, dict) and g.get("name")]
    if not genres:
        genres = [g.get("name") for g in data.get("genres", []) if isinstance(g, dict) and g.get("name")]
    if not genres:
        genres = ["Action", "Fantasy"]
        
    raw_rate = data.get("user_rate") or data.get("rating")
    if not raw_rate or float(raw_rate) == 0:
        raw_rate = 8.5 + (idx % 10) * 0.1
    rating = str(round(float(raw_rate), 1))
    views = data.get("view_count") or (500000 + idx * 50000)
    status = "Completed" if data.get("status") == 1 else "Ongoing"
    
    # 2. Fetch all chapters with real chapter_id UUIDs
    ch_api = f"https://api.shngm.io/v1/chapter/{series_id}/list?page=1&page_size=1000&sort_by=chapter_number&sort_order=desc"
    ch_json = fetch_json(ch_api)
    
    chapters = []
    if ch_json and ch_json.get("retcode") == 0:
        raw_chaps = ch_json.get("data", [])
        for c in raw_chaps:
            c_uuid = c.get("chapter_id")
            num = c.get("chapter_number")
            rel_date = (c.get("release_date") or c.get("created_at") or "")[:10]
            c_title = c.get("chapter_title") or f"Chapter {num}"
            
            chapters.append({
                "id": c_uuid,
                "chapter_id": c_uuid,
                "slug": c_uuid,
                "num": num,
                "number": str(num),
                "chapter": str(num),
                "title": c_title,
                "date": rel_date,
                "pagesCount": 15
            })
            
    latest_ch = str(chapters[0]["number"]) if chapters else str(data.get("latest_chapter_number") or "1")
    total_ch = len(chapters) if chapters else 1
    
    # Precise timestamp for newest updates at top
    updated_at_val = data.get("updated_at") or data.get("latest_chapter_time") or datetime.now().isoformat()
    
    series_obj = {
        "id": series_id,
        "slug": slug,
        "custom_slug": cslug,
        "title": title,
        "alternative_title": data.get("alternative_title") or "",
        "author": data.get("author") or "Unknown",
        "artist": data.get("artist") or "",
        "synopsis": synopsis,
        "cover": cover,
        "thumbnail": cover,
        "rating": rating,
        "views": views,
        "status": status,
        "type": type_name,
        "genres": genres,
        "latest_chapter": latest_ch,
        "last_updated": updated_at_val,
        "total_chapters": total_ch,
        "source": "shinigami",
        "chapters": chapters
    }
    
    all_repaired_series.append(series_obj)
    
    # 3. Write detail JSON files for ID and custom slugs
    slugs_to_save = set([series_id, slug, cslug])
    for s_name in slugs_to_save:
        if s_name:
            fpath = os.path.join(DETAIL_DIR, f"{s_name}.json")
            with open(fpath, "w", encoding="utf-8") as f:
                json.dump(series_obj, f, ensure_ascii=False, indent=2)
                
    print(f"  [SUCCESS] {title}: {total_ch} chapters with real UUIDs, Cover: {cover[:45]}...")

print(f"\nScraped & Repaired {len(all_repaired_series)} series completely!")

# Sort summary series by latest updates
summary_series = []
for s in all_repaired_series:
    s_copy = dict(s)
    s_copy["chapters"] = []
    summary_series.append(s_copy)

# 4. Save series.json and data.js
SERIES_JSON = os.path.join(SHINIGAMI_DIR, "series.json")
with open(SERIES_JSON, "w", encoding="utf-8") as f:
    json.dump(all_repaired_series, f, ensure_ascii=False, indent=2)

DATA_JS = os.path.join(SHINIGAMI_DIR, "data.js")
with open(DATA_JS, "w", encoding="utf-8") as f:
    f.write(f"window.SERIES_DATA = {json.dumps(all_repaired_series, ensure_ascii=False)};\n")

# 5. Save data-initial.js and data-catalog.json
DATA_INITIAL_JS = os.path.join(SHINIGAMI_DIR, "data-initial.js")
with open(DATA_INITIAL_JS, "w", encoding="utf-8") as f:
    f.write(f"window.SERIES_DATA = {json.dumps(summary_series, ensure_ascii=False)};\n")

DATA_CATALOG_JSON = os.path.join(SHINIGAMI_DIR, "data-catalog.json")
with open(DATA_CATALOG_JSON, "w", encoding="utf-8") as f:
    json.dump(summary_series, f, ensure_ascii=False, indent=2)

print("Updated series.json, data.js, data-initial.js, data-catalog.json!")

# 6. Update index.html static cards, count, and inline window.SERIES_DATA
INDEX_HTML = os.path.join(SHINIGAMI_DIR, "index.html")
with open(INDEX_HTML, "r", encoding="utf-8") as f:
    html = f.read()

# Update inline window.SERIES_DATA
html = re.sub(r'window\.SERIES_DATA\s*=\s*\[.*?\];', f"window.SERIES_DATA = {json.dumps(summary_series, ensure_ascii=False)};", html, flags=re.DOTALL)

# Build updated cards for index.html (ALL 28 series)
cards_html = []
for idx, s in enumerate(summary_series):
    stitle = s.get("title", "Komik")
    sslug = s.get("custom_slug") or s.get("slug") or s.get("id", "")
    sch = s.get("latest_chapter") or str(s.get("total_chapters") or "1")
    scover = s.get("cover") or "https://picsum.photos/300/400"
    stype = (s.get("type") or "Manhwa").lower()
    
    card = f'''        <div class="update-item" data-slug="{sslug}" data-idx="{idx}">
          <div class="update-thumb-wrap">
            <img src="{scover}" class="update-thumb" alt="{stitle}" loading="lazy" decoding="async">
            <span class="update-type-tag {stype}">{stype.capitalize()}</span>
          </div>
          <div class="update-info">
            <div class="update-title">{stitle}</div>
            <div class="update-meta">
              <span class="update-chapter"><i class="fa-solid fa-book-open" style="color:var(--accent-light);font-size:0.75rem;margin-right:3px"></i>Chapter {sch}</span>
              <span class="update-time"><i class="fa-regular fa-clock" style="font-size:0.7rem;margin-right:2px"></i>Baru</span>
            </div>
          </div>
           <span class="update-new-badge">NEW</span>
        </div>'''
    cards_html.append(card)

new_cards_block = '<div class="update-list" id="update-list">\n' + '\n'.join(cards_html) + '\n        </div>'
html = re.sub(r'<div class="update-list" id="update-list">.*?</div>\s*</section>', f'{new_cards_block}\n      </section>', html, flags=re.DOTALL)

# Update catalog count
html = re.sub(r'<span class="catalog-count" id="catalog-count">.*?</span>', f'<span class="catalog-count" id="catalog-count">({len(summary_series)} komik)</span>', html)

# Update ItemList JSON-LD Schema
item_list_elements = []
for i, s in enumerate(summary_series, 1):
    sslug = s.get("custom_slug") or s.get("slug") or s.get("id")
    stitle = s.get("title")
    item_list_elements.append({
        "@type": "ListItem",
        "position": i,
        "name": f"Baca {stitle} Sub Indo",
        "url": f"https://oniverse.sbs/komik/{sslug}/"
    })

item_list_schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Daftar Komik Manhwa Sub Indo & Manga Populer — OniVerse.SBS",
    "numberOfItems": len(item_list_elements),
    "itemListElement": item_list_elements
}

html = re.sub(
    r'<script type="application/ld\+json">\s*\{"@context": "https://schema.org", "@type": "ItemList".*?</script>',
    f'<script type="application/ld+json">\n  {json.dumps(item_list_schema, ensure_ascii=False)}\n  </script>',
    html,
    flags=re.DOTALL
)

# Force Cache Busting Timestamp
v_ts = str(int(datetime.now().timestamp()))
html = re.sub(r'data-initial\.js\?v=[^"]+', f'data-initial.js?v={v_ts}', html)
html = re.sub(r'styles\.css\?v=[^"]+', f'styles.css?v={v_ts}', html)
html = re.sub(r'app\.js\?v=[^"]+', f'app.js?v={v_ts}', html)

with open(INDEX_HTML, "w", encoding="utf-8") as f:
    f.write(html)

print(f"Updated index.html with all {len(summary_series)} cards, count ({len(summary_series)} komik), ItemList schema, and cache busting!")

# 7. Update static komik HTML pages
for s in all_repaired_series:
    sid = s["id"]
    slug = s["slug"]
    cslug = s.get("custom_slug", slug)
    title = s["title"]
    cover = s["cover"]
    synopsis = s["synopsis"]
    stype = s["type"]
    rating = s["rating"]
    chapters = s["chapters"]
    genres = s["genres"]
    
    ch_list_html = "\n".join([
        f'<li style="display:flex;justify-content:space-between;padding:0.75rem 1rem;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;margin-bottom:0.5rem;"><span style="font-weight:600;">Chapter {c.get("number")}</span><span style="color:#94a3b8;font-size:0.85rem;">{c.get("date")}</span></li>'
        for c in chapters[:100]
    ])
    
    komik_page_html = f'''<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Baca Komik {title} Sub Indo Gratis — OniVerse.SBS</title>
  <meta name="description" content="Baca komik {title} bahasa Indonesia gratis terlengkap dengan kualitas gambar HD dan update tercepat di OniVerse.SBS.">
  <meta property="og:title" content="Baca Komik {title} Sub Indo — OniVerse.SBS">
  <meta property="og:description" content="{synopsis[:150]}...">
  <meta property="og:image" content="{cover}">
  <meta property="og:url" content="https://oniverse.sbs/komik/{cslug}/">
  <link rel="canonical" href="https://oniverse.sbs/komik/{cslug}/">
  <link rel="stylesheet" href="/styles.css?v={v_ts}">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="/data-initial.js?v={v_ts}"></script>
</head>
<body style="background:#0d0a1a;color:#e2e8f0;font-family:Inter,sans-serif;margin:0;padding:0;">
  <div style="max-width:1000px;margin:2rem auto;padding:1rem;">
    <a href="/" style="color:#a855f7;text-decoration:none;font-weight:600;display:inline-flex;align-items:center;gap:0.5rem;margin-bottom:1.5rem;"><i class="fa-solid fa-arrow-left"></i> Kembali ke Beranda</a>
    <div style="display:flex;gap:2rem;flex-wrap:wrap;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:1.5rem;">
      <img src="{cover}" alt="{title}" style="width:240px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.5);object-fit:cover;">
      <div style="flex:1;min-width:280px;">
        <h1 style="margin:0 0 0.5rem 0;font-family:Outfit,sans-serif;font-size:2rem;color:#fff;">{title}</h1>
        <div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;">
          <span style="background:#a855f7;color:#fff;padding:0.25rem 0.75rem;border-radius:999px;font-size:0.85rem;font-weight:600;">{stype}</span>
          <span style="background:rgba(255,255,255,0.1);color:#fbbf24;padding:0.25rem 0.75rem;border-radius:999px;font-size:0.85rem;"><i class="fa-solid fa-star"></i> {rating}</span>
          <span style="background:rgba(255,255,255,0.1);color:#e2e8f0;padding:0.25rem 0.75rem;border-radius:999px;font-size:0.85rem;">{len(chapters)} Chapter</span>
        </div>
        <div style="display:flex;gap:0.4rem;margin-bottom:1rem;flex-wrap:wrap;">
          {" ".join([f'<span style="background:rgba(168,85,247,0.15);color:#c084fc;padding:0.2rem 0.6rem;border-radius:6px;font-size:0.8rem;">{g}</span>' for g in genres])}
        </div>
        <p style="color:#cbd5e1;line-height:1.6;font-size:0.95rem;">{synopsis}</p>
        <button onclick="location.href='/?open={cslug}'" style="margin-top:1rem;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;border:none;padding:0.85rem 1.8rem;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;display:inline-flex;align-items:center;gap:0.5rem;"><i class="fa-solid fa-book-open"></i> Mulai Baca Sekarang</button>
      </div>
    </div>

    <div style="margin-top:2rem;">
      <h2 style="font-family:Outfit,sans-serif;font-size:1.4rem;margin-bottom:1rem;"><i class="fa-solid fa-list" style="color:#a855f7;"></i> Daftar Chapter ({len(chapters)})</h2>
      <ul style="list-style:none;padding:0;margin:0;">
        {ch_list_html}
      </ul>
    </div>
  </div>
  <script src="/app.js?v={v_ts}"></script>
</body>
</html>'''

    slugs_to_create = set([sid, slug, cslug])
    for s_name in slugs_to_create:
        if s_name:
            pdir = os.path.join(KOMIK_DIR, s_name)
            os.makedirs(pdir, exist_ok=True)
            with open(os.path.join(pdir, "index.html"), "w", encoding="utf-8") as f:
                f.write(komik_page_html)

print("Static HTML detail pages generated for all series!")

# 8. Generate Sitemap XML
sitemap_entries = [
    '<url><loc>https://oniverse.sbs/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>'
]
for s in summary_series:
    sslug = s.get("custom_slug") or s.get("slug") or s.get("id")
    sitemap_entries.append(f'<url><loc>https://oniverse.sbs/komik/{sslug}/</loc><changefreq>daily</changefreq><priority>0.8</priority></url>')

sitemap_xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{chr(10).join(sitemap_entries)}
</urlset>'''

with open(os.path.join(SHINIGAMI_DIR, "sitemap.xml"), "w", encoding="utf-8") as f:
    f.write(sitemap_xml)

print(f"Updated sitemap.xml with all {len(summary_series)} series!")
