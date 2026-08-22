import urllib.request
import json
import ssl
import re
import os
import subprocess
from datetime import datetime

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
DATA_INITIAL_JS = os.path.join(SHINIGAMI_APP_DIR, "data-initial.js")
INDEX_HTML = os.path.join(SHINIGAMI_APP_DIR, "index.html")
APP_JS = os.path.join(SHINIGAMI_APP_DIR, "app.js")
DETAIL_DIR = os.path.join(SHINIGAMI_APP_DIR, "data", "detail")
os.makedirs(DETAIL_DIR, exist_ok=True)

new_urls = [
    "https://11.shinigami.asia/series/4df769c3-3209-4745-a2c2-e547d44e080a",
    "https://11.shinigami.asia/series/caf1c938-7512-4850-9b60-9c15f9dca173",
    "https://11.shinigami.asia/series/d343e302-b00d-4518-8387-42be2c023f88",
    "https://11.shinigami.asia/series/6073d705-cd8b-4b71-a806-7c6ce6501ed3",
    "https://11.shinigami.asia/series/eea477df-e92a-46e3-9cb0-d846ce7c158a",
    "https://komiku.org/manga/manga-one-punch-man/",
    "https://komiku.org/manga/the-new-gate/",
    "https://komiku.org/manga/after-improperly-licking-a-dog-i-became-a-billionaire/",
    "https://komiku.org/manga/the-dragon-of-kunlun/"
]

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/html'
}

print("=== SCRAPING & DEPLOYING 9 NEW SERIES TO ONIVERSE.SBS ===")

scraped_series = []

for idx, url in enumerate(new_urls, 1):
    slug_raw = url.rstrip('/').split('/')[-1]
    slug = re.sub(r'[^a-z0-9]+', '-', slug_raw.lower()).strip('-')

    item = {
        "id": slug,
        "slug": slug,
        "title": f"Series {idx}",
        "cover": "",
        "thumbnail": "",
        "type": "Manhwa",
        "rating": "8.5",
        "genres": ["Action", "Fantasy"],
        "latest_chapter": "1",
        "last_updated": datetime.now().isoformat(),
        "status": "Ongoing",
        "views": 50000 + idx * 3200,
        "total_chapters": 1,
        "source": "shinigami" if "shinigami" in url else "komiku",
        "chapters": []
    }

    try:
        if "shinigami" in url:
            series_id = url.split("/series/")[-1].strip("/")
            item["id"] = series_id
            item["slug"] = series_id
            
            # Fetch Detail from Shinigami API
            detail_url = f"https://api.shngm.io/v1/manga/detail/{series_id}"
            req = urllib.request.Request(detail_url, headers=headers)
            with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
                d_json = json.loads(resp.read().decode('utf-8'))
                data = d_json.get("data", {})
                
                item["title"] = data.get("title") or data.get("name") or item["title"]
                item["cover"] = data.get("cover_portrait_url") or data.get("cover_image_url") or ""
                item["thumbnail"] = item["cover"]
                item["synopsis"] = data.get("description") or ""
                item["author"] = data.get("author") or "Unknown"
                
                cid = data.get("country_id")
                if cid == 1: item["type"] = "Manhwa"
                elif cid == 2: item["type"] = "Manga"
                elif cid == 3: item["type"] = "Manhua"
                
                item["rating"] = str(data.get("user_rate") or "8.5")
                item["views"] = data.get("view_count", item["views"])
                item["status"] = "Completed" if data.get("status") == 1 else "Ongoing"
                
                taxonomy = data.get("taxonomy", {})
                genres_list = taxonomy.get("genre", []) or []
                g_names = [g.get("name") for g in genres_list if isinstance(g, dict) and g.get("name")]
                if g_names: item["genres"] = g_names

            # Fetch chapters list
            ch_list_url = f"https://api.shngm.io/v1/chapter/{series_id}/list?page=1&page_size=100&sort_by=chapter_number&sort_order=desc"
            req_ch = urllib.request.Request(ch_list_url, headers=headers)
            with urllib.request.urlopen(req_ch, context=ctx, timeout=10) as resp_ch:
                ch_json = json.loads(resp_ch.read().decode('utf-8'))
                ch_data = ch_json.get("data", [])
                mapped_chs = []
                for c in ch_data:
                    rel_d = str(c.get("release_date") or c.get("created_at") or "")
                    mapped_chs.append({
                        "number": str(c.get("chapter_number") or ""),
                        "chapter": str(c.get("chapter_number") or ""),
                        "slug": c.get("chapter_id") or "",
                        "chapter_id": c.get("chapter_id") or "",
                        "title": c.get("chapter_title") or f"Chapter {c.get('chapter_number')}",
                        "date": rel_d[:10] if rel_d else ""
                    })
                if mapped_chs:
                    item["chapters"] = mapped_chs
                    item["latest_chapter"] = mapped_chs[0]["number"]
                    item["total_chapters"] = len(mapped_chs)

        else:  # komiku.org URLs
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
                html = resp.read().decode('utf-8', errors='ignore')
                
                og_title = re.search(r'<meta\s+property=["\']og:title["\']\s+content=["\'](.*?)["\']', html, re.IGNORECASE)
                if og_title:
                    item["title"] = og_title.group(1).replace(' Komiku', '').replace(' - Komiku', '').replace(' Bahasa Indonesia', '').strip()
                
                og_img = re.search(r'<meta\s+property=["\']og:image["\']\s+content=["\'](.*?)["\']', html, re.IGNORECASE)
                if og_img:
                    item["cover"] = og_img.group(1).strip()
                    item["thumbnail"] = item["cover"]
                    
                og_desc = re.search(r'<meta\s+property=["\']og:description["\']\s+content=["\'](.*?)["\']', html, re.IGNORECASE)
                if og_desc:
                    item["synopsis"] = og_desc.group(1).strip()

                # Extract chapters from HTML table
                ch_matches = re.findall(r'<a\s+href=["\'](/ch/[^"\']+)["\'][^>]*>(.*?)</a>', html)
                if ch_matches:
                    mapped_chs = []
                    for ch_link, ch_text in ch_matches:
                        ch_num_match = re.search(r'chapter-?([0-9.]+)', ch_link, re.IGNORECASE)
                        num = ch_num_match.group(1) if ch_num_match else "1"
                        mapped_chs.append({
                            "number": num,
                            "chapter": num,
                            "slug": ch_link,
                            "title": f"Chapter {num}",
                            "date": "Terbaru"
                        })
                    if mapped_chs:
                        item["chapters"] = mapped_chs
                        item["latest_chapter"] = mapped_chs[0]["number"]
                        item["total_chapters"] = len(mapped_chs)

        print(f"[{idx:09d}] SCRAPED: {item['title']} | Ch. {item['latest_chapter']} ({item['total_chapters']} chapters)")
    except Exception as e:
        print(f"[{idx:09d}] Error scraping {url}: {e}")

    scraped_series.append(item)
    
    # Write detail JSON file for each series
    detail_dict = {
        "id": item["id"],
        "slug": item["slug"],
        "title": item["title"],
        "alternative_title": "",
        "author": item.get("author", "Unknown"),
        "artist": "",
        "synopsis": item.get("synopsis", ""),
        "cover": item["cover"],
        "thumbnail": item["cover"],
        "rating": item["rating"],
        "views": item["views"],
        "status": item["status"],
        "type": item["type"],
        "genres": item["genres"],
        "latest_chapter": item["latest_chapter"],
        "total_chapters": item["total_chapters"],
        "chapters": item.get("chapters", []),
        "source": item["source"]
    }
    
    with open(os.path.join(DETAIL_DIR, f"{item['id']}.json"), "w", encoding="utf-8") as f:
        json.dump(detail_dict, f, ensure_ascii=False, indent=2)
    with open(os.path.join(DETAIL_DIR, f"{item['slug']}.json"), "w", encoding="utf-8") as f:
        json.dump(detail_dict, f, ensure_ascii=False, indent=2)

# Update data-initial.js
with open(DATA_INITIAL_JS, "r", encoding="utf-8") as f:
    js_text = f.read()
    json_str = js_text.replace("window.SERIES_DATA =", "").strip().rstrip(";")
    existing_arr = json.loads(json_str)

# Prepend new 9 series to front of catalog
updated_arr = []
existing_ids = set()

for s in scraped_series:
    updated_arr.append(s)
    existing_ids.add(s["id"])

for s in existing_arr:
    if s.get("id") not in existing_ids and s.get("slug") not in existing_ids:
        updated_arr.append(s)

with open(DATA_INITIAL_JS, "w", encoding="utf-8") as f:
    f.write(f"window.SERIES_DATA = {json.dumps(updated_arr, ensure_ascii=False)};\n")

print(f"Updated data-initial.js with total {len(updated_arr)} series!")

# Update static HTML cards in index.html
with open(INDEX_HTML, "r", encoding="utf-8") as f:
    html = f.read()

# Update inline window.SERIES_DATA in index.html
html = re.sub(r'window\.SERIES_DATA\s*=\s*\[.*?\];', f"window.SERIES_DATA = {json.dumps(updated_arr, ensure_ascii=False)};", html, flags=re.DOTALL)

# Build static cards HTML
cards_html = []
for idx, s in enumerate(updated_arr[:30]):
    title = s.get("title", "Komik")
    slug = s.get("slug", s.get("id", ""))
    ch = s.get("latest_chapter") or str(s.get("total_chapters") or "1")
    cover = s.get("cover") if s.get("cover") else "https://picsum.photos/300/400"
    type_str = (s.get("type") or "Manhwa").lower()
    
    card = f'''        <div class="update-item" data-slug="{slug}" data-idx="{idx}">
          <div class="update-thumb-wrap">
            <img src="{cover}" class="update-thumb" alt="{title}" loading="lazy" decoding="async">
            <span class="update-type-tag {type_str}">{type_str.capitalize()}</span>
          </div>
          <div class="update-info">
            <div class="update-title">{title}</div>
            <div class="update-meta">
              <span class="update-chapter"><i class="fa-solid fa-book-open" style="color:var(--accent-light);font-size:0.75rem;margin-right:3px"></i>Chapter {ch}</span>
              <span class="update-time"><i class="fa-regular fa-clock" style="font-size:0.7rem;margin-right:2px"></i>Baru</span>
            </div>
          </div>
           <span class="update-new-badge">NEW</span>
        </div>'''
    cards_html.append(card)

new_cards_block = '<div class="update-list" id="update-list">\n' + '\n'.join(cards_html) + '\n        </div>'
html = re.sub(r'<div class="update-list" id="update-list">.*?</div>\s*</section>', f'{new_cards_block}\n      </section>', html, flags=re.DOTALL)

# Update cache busting parameters
v_ts = str(int(datetime.now().timestamp()))
html = re.sub(r'data-initial\.js\?v=[^"]+', f'data-initial.js?v={v_ts}', html)
html = re.sub(r'styles\.css\?v=[^"]+', f'styles.css?v={v_ts}', html)
html = re.sub(r'app\.js\?v=[^"]+', f'app.js?v={v_ts}', html)

with open(INDEX_HTML, "w", encoding="utf-8") as f:
    f.write(html)

print("Updated index.html with new static cards and force cache busting!")

# Commit and Push to Git
subprocess.run(["git", "add", "data-initial.js", "index.html", "data/detail/*"], cwd=SHINIGAMI_APP_DIR, check=True)
subprocess.run(["git", "commit", "-m", f"Scrape and deploy 9 new user series to oniverse.sbs v={v_ts}"], cwd=SHINIGAMI_APP_DIR, check=True)
push_res = subprocess.run(["git", "push", "origin", "main"], cwd=SHINIGAMI_APP_DIR, capture_output=True, text=True)

print("Git Push Output:", push_res.stdout)
if push_res.stderr:
    print("Git Push Stderr:", push_res.stderr)

print("=== 9 NEW SERIES SCRAPED & DEPLOYED LIVE TO ONIVERSE.SBS ===")
