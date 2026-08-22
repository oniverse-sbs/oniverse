import json
import re
import os
import subprocess
from datetime import datetime

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
DATA_INITIAL_JS = os.path.join(SHINIGAMI_APP_DIR, "data-initial.js")
INDEX_HTML = os.path.join(SHINIGAMI_APP_DIR, "index.html")
HTML_404 = os.path.join(SHINIGAMI_APP_DIR, "404.html")
ONE_PIECE_HTML = os.path.join(SHINIGAMI_APP_DIR, "komik", "one-piece", "index.html")
SITEMAP_XML = os.path.join(SHINIGAMI_APP_DIR, "sitemap.xml")

print("=== MASTER SEO OPTIMIZATION & KEYWORD ENHANCEMENT FOR ONIVERSE.SBS ===")

# Load latest catalog data
with open(DATA_INITIAL_JS, "r", encoding="utf-8") as f:
    js_text = f.read()
    json_str = js_text.replace("window.SERIES_DATA =", "").strip().rstrip(";")
    series_arr = json.loads(json_str)

titles_list = [s.get("title") for s in series_arr if s.get("title")]
titles_str = ", ".join(titles_list[:20])

seo_keywords = f"baca komik indonesia, komik indo, komik sub indo, baca manhwa sub indo, baca manga sub indo, baca manhua sub indo, komikcast sub indo, shinigami sub indo, kiryuu sub indo, westmanga sub indo, komikcast, shinigami id, komik action sub indo, baca komik online gratis, {titles_str.lower()}"

# 1. Update index.html SEO head tags & structured data
with open(INDEX_HTML, "r", encoding="utf-8") as f:
    idx_html = f.read()

idx_title = "<title>OniVerse.SBS — Situs Baca Komik Indonesia, Manhwa Sub Indo &amp; Manga Online Gratis HD</title>"
idx_html = re.sub(r'<title>.*?</title>', idx_title, idx_html)

idx_desc = '<meta name="description" content="Situs baca komik Indonesia gratis terlengkap! Tempat baca manhwa sub indo, manga, dan manhua bahasa Indonesia online kualitas gambar HD jernih, update chapter tercepat setiap hari dari Shinigami, Komikcast, dan Kiryuu.">'
idx_html = re.sub(r'<meta\s+name="description"\s+content="[^"]*"', idx_desc, idx_html)

idx_keys = f'<meta name="keywords" content="{seo_keywords}">'
idx_html = re.sub(r'<meta\s+name="keywords"\s+content="[^"]*"', idx_keys, idx_html)

# Add FAQPage JSON-LD rich snippet if not present
faq_schema = '''
  <!-- ===== FAQ PAGE JSON-LD (Google Rich Snippet) ===== -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Di mana tempat baca komik Indonesia & manhwa sub indo gratis?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "OniVerse.SBS adalah situs baca komik Indonesia terlengkap. Kamu bisa membaca ribuan judul manhwa sub indo, manga, dan manhua bahasa Indonesia secara gratis dengan gambar jernih HD tanpa gangguan iklan."
        }
      },
      {
        "@type": "Question",
        "name": "Apakah OniVerse.SBS update chapter terbaru setiap hari?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ya, OniVerse.SBS meng-update chapter terbaru setiap hari secara otomatis langsung dari server Shinigami, Komikcast, Kiryuu, dan sumber terpercaya lainnya."
        }
      },
      {
        "@type": "Question",
        "name": "Komik apa saja yang populer di OniVerse.SBS?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Komik populer antara lain One Piece, Overgeared, The Beginning After The End, Chronicles Of The Demon Faction, Demonic Emperor, Legend of Star General, Gachiakuta, dan Return Of Frozen Player."
        }
      }
    ]
  }
  </script>
'''

if 'FAQPage' not in idx_html:
    idx_html = idx_html.replace('</head>', f'{faq_schema}\n</head>')

with open(INDEX_HTML, "w", encoding="utf-8") as f:
    f.write(idx_html)

print("Updated index.html primary SEO meta tags & FAQ schema!")

# 2. Update 404.html SEO head tags
with open(HTML_404, "r", encoding="utf-8") as f:
    h404 = f.read()

h404 = re.sub(r'<title>.*?</title>', idx_title, h404)
h404 = re.sub(r'<meta\s+name="description"\s+content="[^"]*"', idx_desc, h404)
h404 = re.sub(r'<meta\s+name="keywords"\s+content="[^"]*"', idx_keys, h404)

with open(HTML_404, "w", encoding="utf-8") as f:
    f.write(h404)

print("Updated 404.html SEO meta tags!")

# 3. Update komik/one-piece/index.html SEO head tags
with open(ONE_PIECE_HTML, "r", encoding="utf-8") as f:
    op_html = f.read()

op_title = "<title>Baca Komik One Piece Sub Indo Terbaru &amp; Terlengkap — OniVerse.SBS</title>"
op_html = re.sub(r'<title>.*?</title>', op_title, op_html)

op_desc = '<meta name="description" content="Baca komik One Piece Bahasa Indonesia terlengkap dari Chapter 1 hingga Chapter 1190 terbaru gratis di OniVerse.SBS. Gambar jernih HD, update tercepat, tanpa iklan mengganggu!">'
op_html = re.sub(r'<meta\s+name="description"\s+content="[^"]*"', op_desc, op_html)

with open(ONE_PIECE_HTML, "w", encoding="utf-8") as f:
    f.write(op_html)

print("Updated komik/one-piece/index.html SEO meta tags!")

# 4. Generate dynamic comprehensive sitemap.xml with all 26 series
sitemap_entries = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    '  <url>',
    '    <loc>https://oniverse.sbs/</loc>',
    f'    <lastmod>{datetime.now().strftime("%Y-%m-%d")}</lastmod>',
    '    <changefreq>daily</changefreq>',
    '    <priority>1.0</priority>',
    '  </url>',
    '  <url>',
    '    <loc>https://oniverse.sbs/komik/one-piece/</loc>',
    f'    <lastmod>{datetime.now().strftime("%Y-%m-%d")}</lastmod>',
    '    <changefreq>daily</changefreq>',
    '    <priority>0.9</priority>',
    '  </url>'
]

# Add entries for all 26 series
for s in series_arr:
    slug = s.get("slug") or s.get("id")
    if not slug: continue
    sitemap_entries.extend([
        '  <url>',
        f'    <loc>https://oniverse.sbs/komik/{slug}/</loc>',
        f'    <lastmod>{datetime.now().strftime("%Y-%m-%d")}</lastmod>',
        '    <changefreq>daily</changefreq>',
        '    <priority>0.8</priority>',
        '  </url>'
    ])

# Add entries for main genres
genres = ["action", "adventure", "comedy", "fantasy", "murim", "romance", "shounen", "supernatural", "system"]
for g in genres:
    sitemap_entries.extend([
        '  <url>',
        f'    <loc>https://oniverse.sbs/genre/{g}/</loc>',
        f'    <lastmod>{datetime.now().strftime("%Y-%m-%d")}</lastmod>',
        '    <changefreq>weekly</changefreq>',
        '    <priority>0.7</priority>',
        '  </url>'
    ])

sitemap_entries.append('</urlset>')

with open(SITEMAP_XML, "w", encoding="utf-8") as f:
    f.write('\n'.join(sitemap_entries) + '\n')

print(f"Generated comprehensive sitemap.xml with {len(sitemap_entries)} lines!")

# 5. Git Commit & Push
v_ts = str(int(datetime.now().timestamp()))
subprocess.run(["git", "add", "index.html", "404.html", "komik/one-piece/index.html", "sitemap.xml"], cwd=SHINIGAMI_APP_DIR, check=True)
subprocess.run(["git", "commit", "-m", f"Master SEO optimization with Indonesian target keywords and sitemap v={v_ts}"], cwd=SHINIGAMI_APP_DIR, check=True)
push_res = subprocess.run(["git", "push", "origin", "main"], cwd=SHINIGAMI_APP_DIR, capture_output=True, text=True)

print("Git Push Output:", push_res.stdout)
if push_res.stderr:
    print("Git Push Stderr:", push_res.stderr)

print("=== MASTER SEO OPTIMIZATION COMPLETE & DEPLOYED ===")
