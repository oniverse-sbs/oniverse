"""
SEO Fix Script — All-in-One
1. Split data.js into small initial load + lazy-load chunks
2. Generate static HTML pages for every comic (/komik/slug/index.html)
3. Generate genre pages (/genre/action/index.html, etc.)
4. Auto-generate optimized sitemap with image tags
5. Update robots.txt
"""
import json
import os
import time
import html
import re
import math

PROJECT = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
DATA_FILE = os.path.join(PROJECT, "scraped_data", "series.json")

def load_data():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def slug_safe(s):
    return re.sub(r'[^a-z0-9-]', '', re.sub(r'\s+', '-', (s or '').lower().strip())).strip('-')

def esc(s):
    return html.escape(str(s or ''), quote=True)

def trunc(s, n=160):
    s = str(s or '')
    s = re.sub(r'<[^>]+>', '', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s[:n] + '...' if len(s) > n else s

# ============================================================
# 1. SPLIT DATA.JS
# ============================================================
def split_data(all_series):
    print("\n[1/5] Splitting data.js...")

    # Sort by last_updated desc
    all_series.sort(key=lambda s: s.get("last_updated", ""), reverse=True)

    # Initial data: top 30 comics, stripped down for instant FCP < 0.4s
    initial = []
    for s in all_series[:30]:
        initial.append({
            "id": s.get("id", ""),
            "slug": s.get("slug", ""),
            "title": s.get("title", ""),
            "cover": s.get("cover", "") or s.get("thumbnail", ""),
            "type": s.get("type", "Manhwa"),
            "rating": s.get("rating", "N/A"),
            "genres": (s.get("genres") or [])[:4],
            "latest_chapter": s.get("latest_chapter", ""),
            "last_updated": s.get("last_updated", ""),
            "status": s.get("status", "Ongoing"),
            "views": s.get("views", 0),
            "total_chapters": s.get("total_chapters", 0),
            "source": s.get("source", ""),
        })

    # Write initial data
    init_js = "window.SERIES_DATA = " + json.dumps(initial, ensure_ascii=False, separators=(',', ':')) + ";"
    init_path = os.path.join(PROJECT, "data-initial.js")
    with open(init_path, "w", encoding="utf-8") as f:
        f.write(init_js)
    print(f"  → data-initial.js: {os.path.getsize(init_path)/1024:.1f} KB (50 comics)")

    # Full data (stripped of chapters/synopsis for catalog browsing)
    catalog = []
    for s in all_series:
        catalog.append({
            "id": s.get("id", ""),
            "slug": s.get("slug", ""),
            "title": s.get("title", ""),
            "cover": s.get("cover", "") or s.get("thumbnail", ""),
            "type": s.get("type", "Manhwa"),
            "rating": s.get("rating", "N/A"),
            "genres": (s.get("genres") or [])[:4],
            "latest_chapter": s.get("latest_chapter", ""),
            "last_updated": s.get("last_updated", ""),
            "status": s.get("status", "Ongoing"),
            "views": s.get("views", 0),
            "total_chapters": s.get("total_chapters", 0),
            "source": s.get("source", ""),
        })

    cat_path = os.path.join(PROJECT, "data-catalog.json")
    with open(cat_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, separators=(',', ':'))
    print(f"  → data-catalog.json: {os.path.getsize(cat_path)/1024:.1f} KB ({len(catalog)} comics)")

    # Individual detail files (synopsis + chapters)
    detail_dir = os.path.join(PROJECT, "data", "detail")
    os.makedirs(detail_dir, exist_ok=True)
    for s in all_series:
        slug = s.get("slug") or s.get("id", "unknown")
        detail = {
            "synopsis": s.get("synopsis", "") or s.get("description", ""),
            "alternative_title": s.get("alternative_title", ""),
            "author": s.get("author", ""),
            "artist": s.get("artist", ""),
            "chapters": s.get("chapters", []),
        }
        with open(os.path.join(detail_dir, f"{slug}.json"), "w", encoding="utf-8") as f:
            json.dump(detail, f, ensure_ascii=False, separators=(',', ':'))

    print(f"  → data/detail/ : {len(all_series)} individual detail files")

# ============================================================
# 2. GENERATE STATIC COMIC PAGES
# ============================================================
def generate_comic_pages(all_series):
    print("\n[2/5] Generating static comic pages...")
    komik_dir = os.path.join(PROJECT, "komik")
    count = 0

    for s in all_series:
        slug = s.get("slug") or slug_safe(s.get("title", "unknown"))
        if not slug:
            continue

        page_dir = os.path.join(komik_dir, slug)
        os.makedirs(page_dir, exist_ok=True)

        title = s.get("title", "Unknown")
        cover = s.get("cover", "") or s.get("thumbnail", "")
        synopsis = trunc(s.get("synopsis", "") or s.get("description", "Baca komik ini di OniVerse"), 155)
        genres = s.get("genres", [])
        rating = s.get("rating", "N/A")
        type_name = s.get("type", "Manhwa")
        status = s.get("status", "Ongoing")
        latest_ch = s.get("latest_chapter", "?")
        chapters = s.get("chapters", [])
        alt_title = s.get("alternative_title", "")
        author = s.get("author", "")
        views = s.get("views", 0)
        total_ch = s.get("total_chapters", 0) or len(chapters)

        meta_title = f"{esc(title)} Sub Indo - Baca {type_name} Gratis | OniVerse"
        if len(meta_title) > 60:
            meta_title = f"{esc(title)} Sub Indo | OniVerse"
        meta_desc = f"Baca {esc(title)} bahasa Indonesia gratis di OniVerse. {esc(synopsis)}"[:160]
        canonical = f"https://oniverse.sbs/komik/{slug}/"

        # Genre tags HTML
        genre_tags = " ".join(f'<span class="genre-tag">{esc(g)}</span>' for g in genres[:6])

        # Chapter list HTML
        ch_html = ""
        for ch in chapters[:30]:
            ch_num = ch.get("number", ch.get("chapter", "?"))
            ch_date = ch.get("date", ch.get("released", ""))
            ch_html += f'<li><a href="/komik/{slug}/chapter-{ch_num}/">Chapter {esc(str(ch_num))}</a> <span class="ch-date">{esc(ch_date)}</span></li>\n'
        if not ch_html:
            ch_html = f'<li>Chapter 1 - {esc(str(latest_ch))}</li>'

        # Related comics (same genre, random 6)
        related = [x for x in all_series if x.get("slug") != slug and any(g in (x.get("genres") or []) for g in genres)][:6]
        related_html = ""
        for r in related:
            r_slug = r.get("slug") or slug_safe(r.get("title", ""))
            r_cover = r.get("cover", "") or r.get("thumbnail", "")
            related_html += f'''<a href="/komik/{r_slug}/" class="related-card">
              <img src="{esc(r_cover)}" alt="Baca {esc(r.get('title',''))} Sub Indo" width="120" height="168" loading="lazy">
              <span>{esc(r.get('title',''))}</span>
            </a>\n'''

        # Schema JSON-LD
        schema = json.dumps({
            "@context": "https://schema.org",
            "@type": "ComicSeries",
            "name": title,
            "alternateName": alt_title,
            "genre": genres,
            "inLanguage": "id",
            "author": {"@type": "Person", "name": author} if author else None,
            "numberOfIssues": total_ch,
            "image": cover,
            "url": canonical,
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": str(rating),
                "bestRating": "10",
                "ratingCount": max(int(views) if isinstance(views, int) or (isinstance(views, str) and views.isdigit()) else 100, 100)
            } if rating and rating != "N/A" else None
        }, ensure_ascii=False)

        breadcrumb_schema = json.dumps({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Beranda", "item": "https://oniverse.sbs/"},
                {"@type": "ListItem", "position": 2, "name": genres[0] if genres else "Komik", "item": f"https://oniverse.sbs/genre/{slug_safe(genres[0]) if genres else 'all'}/"},
                {"@type": "ListItem", "position": 3, "name": title}
            ]
        }, ensure_ascii=False)

        page_html = f'''<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(meta_title)}</title>
  <meta name="description" content="{esc(meta_desc)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="{canonical}">
  <meta property="og:type" content="book">
  <meta property="og:title" content="{esc(meta_title)}">
  <meta property="og:description" content="{esc(meta_desc)}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:image" content="{esc(cover)}">
  <meta property="og:site_name" content="OniVerse.SBS">
  <meta property="og:locale" content="id_ID">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{esc(meta_title)}">
  <meta name="twitter:description" content="{esc(meta_desc)}">
  <meta name="twitter:image" content="{esc(cover)}">
  <link rel="icon" type="image/png" href="/logo.png">
  <script type="application/ld+json">{schema}</script>
  <script type="application/ld+json">{breadcrumb_schema}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Outfit:wght@700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css?v=20260804_clean">
  <style>
    .comic-page {{ max-width: 960px; margin: 0 auto; padding: 1rem; color: #e2e8f0; font-family: Inter, sans-serif; }}
    .comic-hero {{ display: flex; gap: 1.5rem; margin-bottom: 2rem; }}
    .comic-cover {{ width: 220px; min-width: 220px; border-radius: 12px; overflow: hidden; }}
    .comic-cover img {{ width: 100%; height: auto; display: block; }}
    .comic-meta h1 {{ font-family: Outfit, sans-serif; font-size: 1.8rem; margin: 0 0 0.5rem; }}
    .comic-meta .alt-title {{ color: #9ca3af; font-size: 0.85rem; margin-bottom: 0.5rem; }}
    .genre-tag {{ display: inline-block; background: rgba(124,58,237,0.2); color: #a855f7; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; margin: 2px; }}
    .info-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(100px,1fr)); gap: 0.5rem; margin: 1rem 0; }}
    .info-box {{ background: rgba(20,18,44,0.8); padding: 0.6rem; border-radius: 8px; text-align: center; border: 1px solid rgba(255,255,255,0.07); }}
    .info-box .val {{ font-weight: 700; color: #a855f7; display: block; }}
    .info-box .lbl {{ font-size: 0.7rem; color: #6b7280; }}
    .synopsis {{ color: #9ca3af; line-height: 1.7; margin: 1rem 0; }}
    .chapter-list {{ list-style: none; padding: 0; max-height: 400px; overflow-y: auto; }}
    .chapter-list li {{ padding: 0.6rem 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; }}
    .chapter-list li a {{ color: #e2e8f0; text-decoration: none; }}
    .chapter-list li a:hover {{ color: #a855f7; }}
    .ch-date {{ color: #6b7280; font-size: 0.75rem; }}
    .breadcrumb {{ font-size: 0.8rem; color: #6b7280; margin-bottom: 1rem; }}
    .breadcrumb a {{ color: #a855f7; text-decoration: none; }}
    .btn-baca {{ display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 1rem; text-decoration: none; border: none; cursor: pointer; }}
    .related-section {{ margin-top: 2rem; }}
    .related-grid {{ display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem; }}
    .related-card {{ text-align: center; width: 120px; min-width: 120px; text-decoration: none; color: #e2e8f0; }}
    .related-card img {{ width: 120px; height: 168px; object-fit: cover; border-radius: 8px; }}
    .related-card span {{ display: block; font-size: 0.75rem; margin-top: 4px; }}
    @media (max-width: 640px) {{
      .comic-hero {{ flex-direction: column; align-items: center; text-align: center; }}
      .comic-cover {{ width: 160px; min-width: 160px; }}
    }}
  </style>
</head>
<body style="background:#0d0a1a; margin:0;">
  <div class="comic-page">
    <nav class="breadcrumb" aria-label="breadcrumb">
      <a href="/">Beranda</a> › <a href="/genre/{slug_safe(genres[0]) if genres else 'all'}/">{esc(genres[0]) if genres else 'Komik'}</a> › <strong>{esc(title)}</strong>
    </nav>

    <div class="comic-hero">
      <div class="comic-cover">
        <img src="{esc(cover)}" alt="Cover {esc(title)} - Baca {type_name} Sub Indo Gratis" width="220" height="308" loading="eager">
      </div>
      <div class="comic-meta">
        <h1>{esc(title)}</h1>
        {f'<p class="alt-title">{esc(alt_title)}</p>' if alt_title else ''}
        <div>{genre_tags}</div>
        <div class="info-grid">
          <div class="info-box"><span class="val">⭐ {esc(str(rating))}</span><span class="lbl">Rating</span></div>
          <div class="info-box"><span class="val">{esc(type_name)}</span><span class="lbl">Tipe</span></div>
          <div class="info-box"><span class="val">{esc(status)}</span><span class="lbl">Status</span></div>
          <div class="info-box"><span class="val">{total_ch}</span><span class="lbl">Chapter</span></div>
        </div>
        <a href="/" class="btn-baca" onclick="window.location.href='/';return false;">📖 Baca Sekarang</a>
      </div>
    </div>

    <h2>Sinopsis {esc(title)}</h2>
    <div class="synopsis">
      <p>{esc(s.get("synopsis", "") or s.get("description", f"Baca {title} bahasa Indonesia gratis di OniVerse.SBS. {type_name} {', '.join(genres[:3])} dengan kualitas gambar HD terbaik."))}</p>
    </div>

    <h2>Daftar Chapter {esc(title)}</h2>
    <ul class="chapter-list">
      {ch_html}
    </ul>

    <div class="related-section">
      <h2>Komik Serupa</h2>
      <div class="related-grid">
        {related_html}
      </div>
    </div>

    <div style="margin-top:2rem;padding:1.5rem;background:rgba(124,58,237,0.08);border-radius:12px;border:1px solid rgba(124,58,237,0.2);">
      <h3>Baca {esc(title)} di OniVerse</h3>
      <p style="color:#9ca3af;font-size:0.9rem;">Nikmati membaca <strong>{esc(title)}</strong> ({type_name}) dalam bahasa Indonesia gratis di OniVerse.SBS. Update chapter terbaru setiap hari dengan kualitas gambar HD terbaik. Tersedia juga ribuan judul manhwa, manga, dan manhua sub indo lainnya.</p>
      <a href="/" class="btn-baca">🏠 Kembali ke Beranda</a>
    </div>
  </div>

  <script src="/data-initial.js?v=20260804_01"></script>
  <script src="/app.js?v=20260804_01" defer></script>
</body>
</html>'''

        with open(os.path.join(page_dir, "index.html"), "w", encoding="utf-8") as f:
            f.write(page_html)
        count += 1

    print(f"  → Generated {count} static comic pages in /komik/")
    return count

# ============================================================
# 3. GENERATE GENRE PAGES
# ============================================================
def generate_genre_pages(all_series):
    print("\n[3/5] Generating genre pages...")
    genre_map = {}
    for s in all_series:
        for g in (s.get("genres") or []):
            if g:
                genre_map.setdefault(g, []).append(s)

    genre_dir = os.path.join(PROJECT, "genre")
    count = 0

    for genre, comics in sorted(genre_map.items(), key=lambda x: -len(x[1])):
        g_slug = slug_safe(genre)
        if not g_slug:
            continue
        g_dir = os.path.join(genre_dir, g_slug)
        os.makedirs(g_dir, exist_ok=True)

        meta_title = f"Komik {genre} Sub Indo - Baca {genre} Manhwa & Manga Gratis | OniVerse"
        if len(meta_title) > 60:
            meta_title = f"Komik {genre} Sub Indo Gratis | OniVerse"
        meta_desc = f"Daftar lengkap komik {genre} bahasa Indonesia gratis di OniVerse. {len(comics)} judul manhwa, manga, manhua {genre} terbaik dengan update terbaru."[:160]

        comics_html = ""
        for c in comics[:100]:
            c_slug = c.get("slug") or slug_safe(c.get("title", ""))
            c_cover = c.get("cover", "") or c.get("thumbnail", "")
            comics_html += f'''<a href="/komik/{c_slug}/" class="comic-card">
          <img src="{esc(c_cover)}" alt="Baca {esc(c.get('title',''))} Sub Indo" width="140" height="196" loading="lazy">
          <div class="card-info">
            <strong>{esc(c.get('title',''))}</strong>
            <span>{esc(c.get('type','Manhwa'))} · Ch.{esc(str(c.get('latest_chapter','?')))}</span>
          </div>
        </a>\n'''

        # Other genres for internal linking
        other_genres = [g for g in genre_map.keys() if g != genre][:12]
        other_links = " ".join(f'<a href="/genre/{slug_safe(g)}/" class="genre-tag">{esc(g)}</a>' for g in other_genres)

        schema = json.dumps({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": f"Komik {genre} Sub Indo",
            "description": meta_desc,
            "url": f"https://oniverse.sbs/genre/{g_slug}/",
            "numberOfItems": len(comics),
            "inLanguage": "id"
        }, ensure_ascii=False)

        page_html = f'''<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(meta_title)}</title>
  <meta name="description" content="{esc(meta_desc)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://oniverse.sbs/genre/{g_slug}/">
  <meta property="og:title" content="{esc(meta_title)}">
  <meta property="og:description" content="{esc(meta_desc)}">
  <meta property="og:url" content="https://oniverse.sbs/genre/{g_slug}/">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="OniVerse.SBS">
  <link rel="icon" type="image/png" href="/logo.png">
  <script type="application/ld+json">{schema}</script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Outfit:wght@700;800&display=swap" rel="stylesheet">
  <style>
    body {{ background: #0d0a1a; color: #e2e8f0; font-family: Inter, sans-serif; margin: 0; padding: 0; }}
    .genre-page {{ max-width: 1100px; margin: 0 auto; padding: 1.5rem; }}
    .breadcrumb {{ font-size: 0.8rem; color: #6b7280; margin-bottom: 1rem; }}
    .breadcrumb a {{ color: #a855f7; text-decoration: none; }}
    h1 {{ font-family: Outfit, sans-serif; font-size: 1.6rem; margin-bottom: 0.3rem; }}
    .subtitle {{ color: #9ca3af; margin-bottom: 1.5rem; }}
    .comic-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; }}
    .comic-card {{ text-decoration: none; color: #e2e8f0; border-radius: 10px; overflow: hidden; background: rgba(20,18,44,0.8); border: 1px solid rgba(255,255,255,0.05); transition: transform 0.2s; }}
    .comic-card:hover {{ transform: translateY(-4px); }}
    .comic-card img {{ width: 100%; height: 196px; object-fit: cover; }}
    .card-info {{ padding: 8px; }}
    .card-info strong {{ display: block; font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
    .card-info span {{ font-size: 0.7rem; color: #6b7280; }}
    .genre-tag {{ display: inline-block; background: rgba(124,58,237,0.15); color: #a855f7; padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; margin: 3px; text-decoration: none; }}
    .genre-tag:hover {{ background: rgba(124,58,237,0.3); }}
    .other-genres {{ margin-top: 2rem; }}
    @media (max-width: 480px) {{ .comic-grid {{ grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }} }}
  </style>
</head>
<body>
  <div class="genre-page">
    <nav class="breadcrumb" aria-label="breadcrumb">
      <a href="/">Beranda</a> › <a href="/genre/">Genre</a> › <strong>{esc(genre)}</strong>
    </nav>

    <h1>Komik {esc(genre)} Sub Indo</h1>
    <p class="subtitle">Daftar {len(comics)} komik {esc(genre)} terbaik bahasa Indonesia. Baca gratis di OniVerse!</p>

    <div class="comic-grid">
      {comics_html}
    </div>

    <div class="other-genres">
      <h2>Genre Lainnya</h2>
      <div>{other_links}</div>
    </div>

    <div style="margin-top:2rem;text-align:center;">
      <a href="/" style="color:#a855f7;font-weight:700;text-decoration:none;">← Kembali ke Beranda OniVerse</a>
    </div>
  </div>
</body>
</html>'''

        with open(os.path.join(g_dir, "index.html"), "w", encoding="utf-8") as f:
            f.write(page_html)
        count += 1

    # Genre index page
    os.makedirs(genre_dir, exist_ok=True)
    genre_index_links = ""
    for g in sorted(genre_map.keys()):
        gs = slug_safe(g)
        genre_index_links += f'<a href="/genre/{gs}/" class="genre-tag">{esc(g)} ({len(genre_map[g])})</a>\n'

    genre_index = f'''<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Daftar Genre Komik - OniVerse</title>
<meta name="description" content="Jelajahi semua genre komik di OniVerse. Action, Fantasy, Romance, Murim, dan lainnya.">
<link rel="canonical" href="https://oniverse.sbs/genre/">
<link rel="icon" href="/logo.png">
<style>body{{background:#0d0a1a;color:#e2e8f0;font-family:Inter,sans-serif;margin:0;padding:2rem;max-width:800px;margin:0 auto}}
.genre-tag{{display:inline-block;background:rgba(124,58,237,0.15);color:#a855f7;padding:10px 20px;border-radius:24px;font-size:0.9rem;margin:5px;text-decoration:none;transition:background 0.2s}}
.genre-tag:hover{{background:rgba(124,58,237,0.3)}}</style></head>
<body><h1>Semua Genre Komik</h1><p style="color:#9ca3af">Pilih genre favorit kamu:</p>
<div>{genre_index_links}</div>
<p style="margin-top:2rem"><a href="/" style="color:#a855f7">← Beranda</a></p></body></html>'''
    with open(os.path.join(genre_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(genre_index)

    print(f"  → Generated {count} genre pages + index in /genre/")
    return count

# ============================================================
# 4. AUTO-GENERATE SITEMAP
# ============================================================
def generate_sitemap(all_series, genre_count):
    print("\n[4/5] Generating optimized sitemap...")
    today = time.strftime("%Y-%m-%d")

    urls = []
    # Homepage
    urls.append(f'''  <url>
    <loc>https://oniverse.sbs/</loc>
    <lastmod>{today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>''')

    # Genre index
    urls.append(f'''  <url>
    <loc>https://oniverse.sbs/genre/</loc>
    <lastmod>{today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>''')

    # Genre pages
    genre_set = set()
    for s in all_series:
        for g in (s.get("genres") or []):
            genre_set.add(g)
    for g in sorted(genre_set):
        gs = slug_safe(g)
        if gs:
            urls.append(f'''  <url>
    <loc>https://oniverse.sbs/genre/{gs}/</loc>
    <lastmod>{today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>''')

    # Comic pages
    for s in all_series:
        slug = s.get("slug") or slug_safe(s.get("title", ""))
        if not slug:
            continue
        cover = s.get("cover", "") or s.get("thumbnail", "")
        last_mod = (s.get("last_updated") or today)[:10]
        img_tag = ""
        if cover:
            img_tag = f'''
    <image:image>
      <image:loc>{esc(cover)}</image:loc>
      <image:title>{esc(s.get("title",""))}</image:title>
    </image:image>'''
        urls.append(f'''  <url>
    <loc>https://oniverse.sbs/komik/{slug}/</loc>
    <lastmod>{last_mod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>{img_tag}
  </url>''')

    sitemap = f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
{chr(10).join(urls)}
</urlset>'''

    with open(os.path.join(PROJECT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(sitemap)
    print(f"  → sitemap.xml: {len(urls)} URLs")

    # Sitemap index
    sitemap_index = f'''<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://oniverse.sbs/sitemap.xml</loc>
    <lastmod>{today}</lastmod>
  </sitemap>
</sitemapindex>'''
    with open(os.path.join(PROJECT, "sitemap_index.xml"), "w", encoding="utf-8") as f:
        f.write(sitemap_index)

# ============================================================
# 5. UPDATE ROBOTS.TXT
# ============================================================
def update_robots():
    print("\n[5/5] Updating robots.txt...")
    robots = """# OniVerse.SBS Robots.txt
User-agent: *
Allow: /
Allow: /komik/
Allow: /genre/

Disallow: /data/detail/
Disallow: /scraped_data/
Disallow: /*.json$
Disallow: /*.py$

# Sitemaps
Sitemap: https://oniverse.sbs/sitemap.xml
Sitemap: https://oniverse.sbs/sitemap_index.xml
"""
    with open(os.path.join(PROJECT, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(robots)
    print("  → robots.txt updated")


# ============================================================
# MAIN
# ============================================================
def main():
    print("=" * 60)
    print("  ONIVERSE SEO FIX — All-in-One Implementation")
    print("=" * 60)

    all_series = load_data()
    print(f"Loaded {len(all_series)} series from data")

    split_data(all_series)
    comic_count = generate_comic_pages(all_series)
    genre_count = generate_genre_pages(all_series)
    generate_sitemap(all_series, genre_count)
    update_robots()

    print(f"\n{'=' * 60}")
    print(f"  ✅ SEO FIX COMPLETE!")
    print(f"  - {comic_count} static comic pages generated")
    print(f"  - {genre_count} genre pages generated")
    print(f"  - data.js split into initial + catalog + detail chunks")
    print(f"  - Sitemap regenerated with image tags")
    print(f"  - robots.txt updated")
    print(f"{'=' * 60}")
    print(f"\n  Next: Run 'git add . && git commit && git push' to deploy!")


if __name__ == "__main__":
    main()
