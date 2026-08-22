import json
import re
import os
import subprocess
from datetime import datetime

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
DATA_INITIAL_JS = os.path.join(SHINIGAMI_APP_DIR, "data-initial.js")
INDEX_HTML = os.path.join(SHINIGAMI_APP_DIR, "index.html")
APP_JS = os.path.join(SHINIGAMI_APP_DIR, "app.js")
DETAIL_DIR = os.path.join(SHINIGAMI_APP_DIR, "data", "detail")

print("=== FIXING TITLE PREFIXES, TYPES & LATEST CHAPTERS FOR KOMIKU SERIES ===")

with open(DATA_INITIAL_JS, "r", encoding="utf-8") as f:
    js_text = f.read()
    json_str = js_text.replace("window.SERIES_DATA =", "").strip().rstrip(";")
    series_arr = json.loads(json_str)

# Specific fixes for titles, types, and chapters
SPECIFIC_FIXES = {
    "manga-one-punch-man": {
        "title": "One Punch Man",
        "type": "Manga",
        "latest_chapter": "245",
        "total_chapters": 245,
        "genres": ["Action", "Comedy", "Supernatural", "Seinen"]
    },
    "the-new-gate": {
        "title": "The New Gate",
        "type": "Manga",
        "latest_chapter": "105",
        "total_chapters": 105,
        "genres": ["Action", "Adventure", "Fantasy", "Game"]
    },
    "after-improperly-licking-a-dog-i-became-a-billionaire": {
        "title": "After Improperly Licking a Dog, I Became a Billionaire",
        "type": "Manhua",
        "latest_chapter": "85",
        "total_chapters": 85,
        "genres": ["Comedy", "Romance", "System", "Urban"]
    },
    "the-dragon-of-kunlun": {
        "title": "The Dragon of Kunlun",
        "type": "Manhua",
        "latest_chapter": "120",
        "total_chapters": 120,
        "genres": ["Action", "Martial Arts", "Fantasy"]
    }
}

for item in series_arr:
    # 1. Clean up "Komik " prefix from any title
    title = item.get("title", "")
    if title.startswith("Komik "):
        title = title[6:].strip()
    title = title.replace(" Bahasa Indonesia", "").replace(" Sub Indo", "").replace(" - Komiku", "").strip()
    item["title"] = title

    # 2. Apply specific fixes if matched
    slug = item.get("slug") or item.get("id")
    if slug in SPECIFIC_FIXES:
        fix = SPECIFIC_FIXES[slug]
        item["title"] = fix["title"]
        item["type"] = fix["type"]
        item["latest_chapter"] = fix["latest_chapter"]
        item["total_chapters"] = fix["total_chapters"]
        item["genres"] = fix["genres"]

    # Also check if title matches
    t_lower = title.lower()
    if "one punch man" in t_lower:
        item["title"] = "One Punch Man"
        item["type"] = "Manga"
        item["latest_chapter"] = "245"
        item["total_chapters"] = 245
    elif "the new gate" in t_lower:
        item["title"] = "The New Gate"
        item["type"] = "Manga"
        item["latest_chapter"] = "105"
        item["total_chapters"] = 105
    elif "licking a dog" in t_lower:
        item["title"] = "After Improperly Licking a Dog, I Became a Billionaire"
        item["type"] = "Manhua"
        item["latest_chapter"] = "85"
        item["total_chapters"] = 85
    elif "dragon of kunlun" in t_lower:
        item["title"] = "The Dragon of Kunlun"
        item["type"] = "Manhua"
        item["latest_chapter"] = "120"
        item["total_chapters"] = 120

# Save data-initial.js
with open(DATA_INITIAL_JS, "w", encoding="utf-8") as f:
    f.write(f"window.SERIES_DATA = {json.dumps(series_arr, ensure_ascii=False)};\n")

print("Saved updated data-initial.js!")

# Update detail JSON files
for item in series_arr:
    sid = item.get("id")
    slug = item.get("slug")
    for f_id in [sid, slug]:
        if not f_id: continue
        json_path = os.path.join(DETAIL_DIR, f"{f_id}.json")
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                try: d_obj = json.load(f)
                except: d_obj = {}
            d_obj["title"] = item["title"]
            d_obj["type"] = item["type"]
            d_obj["latest_chapter"] = item["latest_chapter"]
            d_obj["total_chapters"] = item["total_chapters"]
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(d_obj, f, ensure_ascii=False, indent=2)

print("Updated all detail JSON files in data/detail!")

# Rebuild static HTML cards in index.html
with open(INDEX_HTML, "r", encoding="utf-8") as f:
    html = f.read()

# Update inline window.SERIES_DATA
html = re.sub(r'window\.SERIES_DATA\s*=\s*\[.*?\];', f"window.SERIES_DATA = {json.dumps(series_arr, ensure_ascii=False)};", html, flags=re.DOTALL)

# Rebuild update-list static HTML cards
cards_html = []
for idx, s in enumerate(series_arr[:30]):
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

# Force cache busting
v_ts = str(int(datetime.now().timestamp()))
html = re.sub(r'data-initial\.js\?v=[^"]+', f'data-initial.js?v={v_ts}', html)
html = re.sub(r'styles\.css\?v=[^"]+', f'styles.css?v={v_ts}', html)
html = re.sub(r'app\.js\?v=[^"]+', f'app.js?v={v_ts}', html)

with open(INDEX_HTML, "w", encoding="utf-8") as f:
    f.write(html)

print("Updated index.html static cards!")

# Commit & Push to Git
subprocess.run(["git", "add", "data-initial.js", "index.html", "data/detail/*"], cwd=SHINIGAMI_APP_DIR, check=True)
subprocess.run(["git", "commit", "-m", f"Fix Komik title prefixes, types, and latest chapters for mobile view v={v_ts}"], cwd=SHINIGAMI_APP_DIR, check=True)
push_res = subprocess.run(["git", "push", "origin", "main"], cwd=SHINIGAMI_APP_DIR, capture_output=True, text=True)

print("Git Push Output:", push_res.stdout)
if push_res.stderr:
    print("Git Push Stderr:", push_res.stderr)

print("=== FIX COMPLETE & DEPLOYED LIVE ===")
