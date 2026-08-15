import json
import re
import os
import subprocess

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
INDEX_HTML = os.path.join(SHINIGAMI_APP_DIR, "index.html")
DATA_INITIAL_JS = os.path.join(SHINIGAMI_APP_DIR, "data-initial.js")

# Read data-initial.js
with open(DATA_INITIAL_JS, "r", encoding="utf-8") as f:
    js_content = f.read()
    series_json_str = js_content.replace("window.SERIES_DATA =", "").strip().rstrip(";")
    series_data = json.loads(series_json_str)

# Generate HTML cards for update-list
cards_html = []
for idx, s in enumerate(series_data[:20]):
    title = s.get("title", "Komik")
    slug = s.get("slug", "")
    ch = s.get("latest_chapter", "1")
    cover = s.get("cover") if s.get("cover") else "https://picsum.photos/300/400"
    type_str = s.get("type", "Manhwa").lower()
    
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

# Read index.html
with open(INDEX_HTML, "r", encoding="utf-8") as f:
    html_content = f.read()

# Replace update-list block
pattern = r'<div class="update-list" id="update-list">.*?</div>\s*</section>'
replacement = f'{new_cards_block}\n      </section>'

html_updated = re.sub(pattern, replacement, html_content, flags=re.DOTALL)

# Update cache busting script tag version
html_updated = re.sub(r'data-initial\.js\?v=[^"]+', 'data-initial.js?v=' + str(int(os.path.getmtime(DATA_INITIAL_JS))), html_updated)

with open(INDEX_HTML, "w", encoding="utf-8") as f:
    f.write(html_updated)

print(f"Successfully updated static cards in {INDEX_HTML}!")

# Commit and Push to Git
subprocess.run(["git", "add", "index.html", "data-initial.js"], cwd=SHINIGAMI_APP_DIR, check=True)
subprocess.run(["git", "commit", "-m", "Deploy static HTML cards update for 17 user comics on oniverse.sbs"], cwd=SHINIGAMI_APP_DIR, check=True)
push_res = subprocess.run(["git", "push", "origin", "main"], cwd=SHINIGAMI_APP_DIR, capture_output=True, text=True)

print("Git Push Output:", push_res.stdout)
if push_res.stderr:
    print("Git Push Stderr:", push_res.stderr)

print("=== STATIC CARDS DEPLOYED LIVE TO ONIVERSE.SBS ===")
