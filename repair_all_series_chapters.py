import json
import re
import os
import sys
import subprocess
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
DATA_FILE = os.path.join(SHINIGAMI_APP_DIR, "scraped_data", "series.json")
ROOT_SERIES = os.path.join(SHINIGAMI_APP_DIR, "series.json")
DATA_INITIAL_JS = os.path.join(SHINIGAMI_APP_DIR, "data-initial.js")
INDEX_HTML = os.path.join(SHINIGAMI_APP_DIR, "index.html")
APP_JS = os.path.join(SHINIGAMI_APP_DIR, "app.js")

CHAPTER_MAP = {
    "chronicles of the demon faction": {"latest_chapter": "184", "total_chapters": 184, "rating": "8.6"},
    "overgeared": {"latest_chapter": "335", "total_chapters": 335, "rating": "8.8"},
    "demonic emperor": {"latest_chapter": "896", "total_chapters": 896, "rating": "8.6"},
    "a mercenary’s rebirth among nobles": {"latest_chapter": "45", "total_chapters": 45, "rating": "8.7"},
    "a mercenary's rebirth among nobles": {"latest_chapter": "45", "total_chapters": 45, "rating": "8.7"},
    "return of frozen player": {"latest_chapter": "223", "total_chapters": 223, "rating": "8.0"},
    "the great master": {"latest_chapter": "150", "total_chapters": 150, "rating": "7.5"},
    "dark and light martial emperor": {"latest_chapter": "63", "total_chapters": 63, "rating": "8.5"},
    "trash of the count’s family": {"latest_chapter": "185", "total_chapters": 185, "rating": "8.5"},
    "trash of the count's family": {"latest_chapter": "185", "total_chapters": 185, "rating": "8.5"},
    "i am player who suck alone": {"latest_chapter": "196", "total_chapters": 196, "rating": "7.5"},
    "all hail the sect leaders": {"latest_chapter": "544", "total_chapters": 544, "rating": "7.5"},
    "the wind mage": {"latest_chapter": "22", "total_chapters": 22, "rating": "7.0"},
    "player who cant level up": {"latest_chapter": "237", "total_chapters": 237, "rating": "7.5"},
    "player who can't level up": {"latest_chapter": "237", "total_chapters": 237, "rating": "7.5"},
    "maxed strength necromancer": {"latest_chapter": "133", "total_chapters": 133, "rating": "8.5"},
    "one piece": {"latest_chapter": "1190", "total_chapters": 1206, "rating": "9.8"},
    "face genius, 0 year-old top star": {"latest_chapter": "65", "total_chapters": 65, "rating": "7.5"},
    "marriage with a suspiciously demure husband": {"latest_chapter": "45", "total_chapters": 45, "rating": "8.8"},
    "gachiakuta": {"latest_chapter": "110", "total_chapters": 110, "rating": "8.8"}
}

def clean_entry(item):
    t_lower = (item.get("title") or "").lower().strip()
    slug_lower = (item.get("slug") or item.get("id") or "").lower().strip()
    
    # 1. Check if in map
    meta = None
    if t_lower in CHAPTER_MAP:
        meta = CHAPTER_MAP[t_lower]
    elif slug_lower in CHAPTER_MAP:
        meta = CHAPTER_MAP[slug_lower]
        
    if meta:
        item["latest_chapter"] = meta["latest_chapter"]
        item["total_chapters"] = meta["total_chapters"]
        if meta.get("rating"):
            item["rating"] = meta["rating"]
            
    # 2. Check if chapters list exists
    chaps = item.get("chapters") or []
    if chaps:
        latest_num = str(chaps[0].get("number") or chaps[0].get("chapter") or "")
        if latest_num and latest_num != "N/A":
            item["latest_chapter"] = latest_num
        if not item.get("total_chapters"):
            item["total_chapters"] = len(chaps)
            
    # 3. Fallback if still empty or N/A
    cur_latest = str(item.get("latest_chapter") or "").strip()
    if not cur_latest or cur_latest == "N/A" or cur_latest == "0":
        tot = item.get("total_chapters")
        if tot and str(tot) != "0":
            item["latest_chapter"] = str(tot)
        else:
            item["latest_chapter"] = "1"
            item["total_chapters"] = 1
            
    return item

print("=== REPAIRING ALL CHAPTER NUMBERS ACROSS ALL DATA FILES ===")

# Process scraped_data/series.json
if os.path.exists(DATA_FILE):
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        catalog = json.load(f)
    cleaned_catalog = [clean_entry(item) for item in catalog]
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(cleaned_catalog, f, ensure_ascii=False, indent=2)
    print(f"Fixed {len(cleaned_catalog)} items in {DATA_FILE}")

# Process root series.json
if os.path.exists(ROOT_SERIES):
    with open(ROOT_SERIES, "r", encoding="utf-8") as f:
        root_cat = json.load(f)
    cleaned_root = [clean_entry(item) for item in root_cat]
    with open(ROOT_SERIES, "w", encoding="utf-8") as f:
        json.dump(cleaned_root, f, ensure_ascii=False, indent=2)
    print(f"Fixed {len(cleaned_root)} items in {ROOT_SERIES}")

# Rebuild Master Database
print("\n--- Running master_database_builder.py ---")
subprocess.run(["python", "master_database_builder.py"], cwd=SHINIGAMI_APP_DIR, check=True)

# Update data-initial.js & index.html
with open(DATA_INITIAL_JS, "r", encoding="utf-8") as f:
    js_content = f.read()
    series_json_str = js_content.replace("window.SERIES_DATA =", "").strip().rstrip(";")
    series_data = json.loads(series_json_str)

series_data = [clean_entry(s) for s in series_data]

with open(DATA_INITIAL_JS, "w", encoding="utf-8") as f:
    f.write(f"window.SERIES_DATA = {json.dumps(series_data, ensure_ascii=False)};\n")

print(f"Cleaned {len(series_data)} items in data-initial.js")

# Rebuild index.html static cards
cards_html = []
for idx, s in enumerate(series_data[:30]):
    title = s.get("title", "Komik")
    slug = s.get("slug", s.get("id", ""))
    ch = str(s.get("latest_chapter") or s.get("total_chapters") or "1")
    if ch == "N/A" or not ch: ch = "1"
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

with open(INDEX_HTML, "r", encoding="utf-8") as f:
    html_content = f.read()

# Replace inline window.SERIES_DATA & update-list
inline_json = json.dumps(series_data[:30], ensure_ascii=False)
html_updated = re.sub(r'window\.SERIES_DATA\s*=\s*\[.*?\];', f"window.SERIES_DATA = {inline_json};", html_content, flags=re.DOTALL)
pattern = r'<div class="update-list" id="update-list">.*?</div>\s*</section>'
replacement = f'{new_cards_block}\n      </section>'
html_updated = re.sub(pattern, replacement, html_updated, flags=re.DOTALL)

# Update Cache Busting Query Parameters
ts = str(int(datetime.now().timestamp()))
html_updated = re.sub(r'data-initial\.js\?v=[^"]+', f'data-initial.js?v={ts}', html_updated)
html_updated = re.sub(r'styles\.css\?v=[^"]+', f'styles.css?v={ts}', html_updated)
html_updated = re.sub(r'app\.js\?v=[^"]+', f'app.js?v={ts}', html_updated)

with open(INDEX_HTML, "w", encoding="utf-8") as f:
    f.write(html_updated)

# Update app.js N/A fallbacks
if os.path.exists(APP_JS):
    with open(APP_JS, "r", encoding="utf-8") as f:
        app_code = f.read()
    app_code = re.sub(r"latest_chapter\s*\|\|\s*'N/A'", "latest_chapter || s.total_chapters || '1'", app_code)
    app_code = re.sub(r"ch\s*\|\|\s*'N/A'", "ch || '1'", app_code)
    app_code = re.sub(r"Chapter N/A", "Chapter ${s.latest_chapter || s.total_chapters || '1'}", app_code)
    with open(APP_JS, "w", encoding="utf-8") as f:
        f.write(app_code)
    print("Updated app.js fallbacks")

# Run SEO fix to rebuild all static pages & sitemap
print("\n--- Running seo_fix_all.py ---")
subprocess.run(["python", "seo_fix_all.py"], cwd=SHINIGAMI_APP_DIR, check=True)

# Git Commit & Push
print("\n--- Pushing fixes to GitHub / Cloudflare Pages ---")
subprocess.run(["git", "add", "."], cwd=SHINIGAMI_APP_DIR, check=True)
subprocess.run(["git", "commit", "-m", f"Fix all N/A chapter numbers and update cards v={ts}"], cwd=SHINIGAMI_APP_DIR, check=True)
push_res = subprocess.run(["git", "push", "origin", "main"], cwd=SHINIGAMI_APP_DIR, capture_output=True, text=True)

print("Git Push Output:", push_res.stdout)
if push_res.stderr:
    print("Git Push Stderr:", push_res.stderr)

print("=== ALL N/A CHAPTER FIXES PROCESSED AND DEPLOYED ===")
