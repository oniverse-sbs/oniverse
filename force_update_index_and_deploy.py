import json
import re
import os
import sys
import subprocess
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
INDEX_HTML = os.path.join(SHINIGAMI_APP_DIR, "index.html")
DATA_INITIAL_JS = os.path.join(SHINIGAMI_APP_DIR, "data-initial.js")

# 1. Read data-initial.js
with open(DATA_INITIAL_JS, "r", encoding="utf-8") as f:
    js_content = f.read()
    series_json_str = js_content.replace("window.SERIES_DATA =", "").strip().rstrip(";")
    series_data = json.loads(series_json_str)

print(f"Loaded {len(series_data)} series from data-initial.js")
print(f"Top 1: {series_data[0]['title']} (Ch. {series_data[0].get('latest_chapter')})")
print(f"Top 2: {series_data[1]['title']} (Ch. {series_data[1].get('latest_chapter')})")

# 2. Build HTML cards for update-list
cards_html = []
for idx, s in enumerate(series_data[:30]):
    title = s.get("title", "Komik")
    slug = s.get("slug", s.get("id", ""))
    ch = s.get("latest_chapter") or "1"
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

# 3. Read index.html
with open(INDEX_HTML, "r", encoding="utf-8") as f:
    html_content = f.read()

# 4. Replace inline window.SERIES_DATA in index.html
inline_json = json.dumps(series_data[:30], ensure_ascii=False)
html_updated = re.sub(r'window\.SERIES_DATA\s*=\s*\[.*?\];', f"window.SERIES_DATA = {inline_json};", html_content, flags=re.DOTALL)

# 5. Replace update-list block in index.html
pattern = r'<div class="update-list" id="update-list">.*?</div>\s*</section>'
replacement = f'{new_cards_block}\n      </section>'
html_updated = re.sub(pattern, replacement, html_updated, flags=re.DOTALL)

# 6. Update Cache Busting Query Parameters
ts = str(int(datetime.now().timestamp()))
html_updated = re.sub(r'data-initial\.js\?v=[^"]+', f'data-initial.js?v={ts}', html_updated)
html_updated = re.sub(r'styles\.css\?v=[^"]+', f'styles.css?v={ts}', html_updated)
html_updated = re.sub(r'app\.js\?v=[^"]+', f'app.js?v={ts}', html_updated)

# Write back to index.html
with open(INDEX_HTML, "w", encoding="utf-8") as f:
    f.write(html_updated)

print(f"✅ Successfully updated index.html with new static cards & inline SERIES_DATA (v={ts})")

# 7. Commit & Git Push
subprocess.run(["git", "add", "index.html", "data-initial.js"], cwd=SHINIGAMI_APP_DIR, check=True)
subprocess.run(["git", "commit", "-m", f"Force update index.html cards for Return of Crazy Demon & My Dad Is Strongest v={ts}"], cwd=SHINIGAMI_APP_DIR, check=True)
push_res = subprocess.run(["git", "push", "origin", "main"], cwd=SHINIGAMI_APP_DIR, capture_output=True, text=True)

print("Git Push Output:", push_res.stdout)
if push_res.stderr:
    print("Git Push Stderr:", push_res.stderr)

print("=== FORCE UPDATE DEPLOYMENT COMPLETE FOR ONIVERSE.SBS ===")
