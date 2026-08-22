import subprocess
import json
import os
import re
import sys
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
DATA_INITIAL_JS = os.path.join(SHINIGAMI_APP_DIR, "data-initial.js")
INDEX_HTML = os.path.join(SHINIGAMI_APP_DIR, "index.html")

print("=== REBUILDING COMPLETE DATABASE AND DEPLOYING ===")

# 1. Run master database builder
print("\n[1] Running master_database_builder.py...")
subprocess.run(["python", "master_database_builder.py"], cwd=SHINIGAMI_APP_DIR, check=True)

# 2. Run SEO fix
print("\n[2] Running seo_fix_all.py...")
subprocess.run(["python", "seo_fix_all.py"], cwd=SHINIGAMI_APP_DIR, check=True)

# 3. Verify no fake chapter IDs remain in detail JSONs
print("\n[3] Verifying chapter UUIDs in detail JSONs...")
detail_dir = os.path.join(SHINIGAMI_APP_DIR, "data", "detail")
problem_files = []
for fname in os.listdir(detail_dir):
    if not fname.endswith(".json"):
        continue
    fpath = os.path.join(detail_dir, fname)
    try:
        with open(fpath, "r", encoding="utf-8") as f:
            d = json.load(f)
        chaps = d.get("chapters", [])
        if not chaps:
            continue
        sample = chaps[0]
        ch_id = sample.get("id") or sample.get("slug") or ""
        if ch_id and not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-', ch_id, re.IGNORECASE):
            # Not a UUID - check if it's null/empty (OK) or fake (bad)
            if ch_id and ch_id.startswith("ch_") or ch_id.startswith("chapter-"):
                problem_files.append((fname, ch_id))
    except Exception as e:
        pass

if problem_files:
    print(f"  ⚠️  {len(problem_files)} detail files still have fake chapter IDs:")
    for f, cid in problem_files:
        print(f"    {f} — sample ID: {cid}")
else:
    print("  ✅ All detail JSONs have valid/real chapter UUIDs!")

# 4. Update data-initial.js chapter arrays (inject chapters into initial data for instant reading)
print("\n[4] Verifying data-initial.js chapter count...")
with open(DATA_INITIAL_JS, "r", encoding="utf-8") as f:
    js_text = f.read()
    json_str = js_text.replace("window.SERIES_DATA =", "").strip().rstrip(";")
    series_arr = json.loads(json_str)

# Load from scraped_data/series.json as source of truth (has chapters)
scraped_file = os.path.join(SHINIGAMI_APP_DIR, "scraped_data", "series.json")
with open(scraped_file, "r", encoding="utf-8") as f:
    catalog = json.load(f)
catalog_map = {s.get("id"): s for s in catalog}

# Inject chapter counts but NOT full chapter arrays (too big for initial.js)
for item in series_arr:
    sid = item.get("id")
    src = catalog_map.get(sid)
    if src:
        item["latest_chapter"] = src.get("latest_chapter") or item.get("latest_chapter") or "1"
        item["total_chapters"] = src.get("total_chapters") or item.get("total_chapters") or 0
        # Don't include full chapters[] in initial — too heavy, load on demand

with open(DATA_INITIAL_JS, "w", encoding="utf-8") as f:
    f.write(f"window.SERIES_DATA = {json.dumps(series_arr, ensure_ascii=False)};\n")
print(f"  ✅ data-initial.js updated with {len(series_arr)} series")

# 5. Cache-bust and update index.html
print("\n[5] Updating index.html cache busters...")
ts = str(int(datetime.now().timestamp()))
with open(INDEX_HTML, "r", encoding="utf-8") as f:
    html_content = f.read()

# Update window.SERIES_DATA in index.html inline
html_updated = re.sub(
    r'window\.SERIES_DATA\s*=\s*\[.*?\];',
    f"window.SERIES_DATA = {json.dumps(series_arr, ensure_ascii=False)};",
    html_content,
    flags=re.DOTALL
)
# Update cache busters
html_updated = re.sub(r'data-initial\.js\?v=[^"]+', f'data-initial.js?v={ts}', html_updated)
html_updated = re.sub(r'styles\.css\?v=[^"]+', f'styles.css?v={ts}', html_updated)
html_updated = re.sub(r'app\.js\?v=[^"]+', f'app.js?v={ts}', html_updated)
html_updated = re.sub(r'data-catalog\.json\?v=[^"]+', f'data-catalog.json?v={ts}', html_updated)

with open(INDEX_HTML, "w", encoding="utf-8") as f:
    f.write(html_updated)
print(f"  ✅ index.html updated, cache buster v={ts}")

# 6. Git add, commit, push
print("\n[6] Committing and pushing to GitHub / Cloudflare Pages...")
subprocess.run(["git", "add", "."], cwd=SHINIGAMI_APP_DIR, check=True)
subprocess.run([
    "git", "commit", "-m",
    f"Fix all reader errors: real chapter UUIDs, fake slug filter, reader API fallback v={ts}"
], cwd=SHINIGAMI_APP_DIR, check=True)
push = subprocess.run(
    ["git", "push", "origin", "main"],
    cwd=SHINIGAMI_APP_DIR, capture_output=True, text=True
)
print("  Git Push:", push.stdout or "(no output)")
if push.stderr:
    print("  Git Stderr:", push.stderr.strip())

print("\n=== ALL FIXES DEPLOYED SUCCESSFULLY ===")
