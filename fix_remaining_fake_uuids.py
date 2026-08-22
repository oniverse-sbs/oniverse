import urllib.request
import json
import ssl
import os
import sys
import time
import subprocess
import re
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
SCRAPED_DATA = os.path.join(SHINIGAMI_APP_DIR, "scraped_data", "series.json")
ROOT_SERIES = os.path.join(SHINIGAMI_APP_DIR, "series.json")
DETAIL_DIR = os.path.join(SHINIGAMI_APP_DIR, "data", "detail")

# Series needing real UUID re-scrape (ID from active catalog)
TARGETS = [
    ("a2ba8fcf-f554-4568-95ea-f0cc997ab394", "All Hail the Sect Leaders"),
    ("4a0b6c8f-1500-4e14-b2ed-364c72fa2963", "Gachiakuta"),
    ("57a7c362-f6f0-43f6-9189-fc43a0ee8ed8", "Marriage With A Suspiciously Demure Husband"),
]

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

def fetch_json(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, context=ctx, timeout=15) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(0.5)
            else:
                print(f"  ❌ Error fetching {url}: {e}")
                return None

def fetch_chapter_images(chapter_id):
    url = f"https://api.shngm.io/v1/chapter/detail/{chapter_id}"
    res = fetch_json(url)
    if res and res.get("retcode") == 0 and res.get("data"):
        data = res["data"]
        base_url = data.get("base_url") or "https://assets.shngm.id"
        ch_obj = data.get("chapter", {})
        ch_path = ch_obj.get("path", "")
        filenames = ch_obj.get("data") or ch_obj.get("images") or []
        imgs = []
        for fn in filenames:
            if isinstance(fn, str) and fn.strip():
                imgs.append(fn if fn.startswith("http") else base_url + ch_path + fn)
        return imgs
    return []

def scrape_and_fix(manga_id, name):
    print(f"\n{'='*55}")
    print(f" FIXING: {name} ({manga_id})")
    print(f"{'='*55}")

    # Fetch chapters (handle 500+ chapters)
    all_chaps = []
    for page in range(1, 6):
        url = f"https://api.shngm.io/v1/chapter/{manga_id}/list?page={page}&page_size=500&sort_by=chapter_number&sort_order=desc"
        res = fetch_json(url)
        if res and res.get("retcode") == 0 and isinstance(res.get("data"), list):
            items = res["data"]
            if not items:
                break
            all_chaps.extend(items)
            print(f"  Page {page}: {len(items)} chapters (total: {len(all_chaps)})")
            if len(items) < 500:
                break
        else:
            break

    if not all_chaps:
        print(f"  ❌ No chapters fetched!")
        return

    # Map to proper format with real UUIDs
    clean_chaps = []
    for c in all_chaps:
        ch_num = str(c.get("chapter_number") or "")
        ch_id = c.get("chapter_id") or c.get("id") or ""
        clean_chaps.append({
            "id": ch_id,
            "slug": ch_id,
            "chapter_id": ch_id,
            "number": ch_num,
            "chapter": ch_num,
            "title": c.get("chapter_title") or f"Chapter {ch_num}",
            "date": (c.get("release_date") or c.get("created_at") or "")[:10],
            "images": []
        })

    # Pre-cache images for first 15 chapters
    print(f"  Pre-caching panel images for top 15 chapters...")
    for i, ch in enumerate(clean_chaps[:15]):
        ch_id = ch.get("id") or ""
        if ch_id and re.match(r'^[0-9a-f]{8}-', ch_id):
            imgs = fetch_chapter_images(ch_id)
            ch["images"] = imgs
            print(f"    Ch #{ch.get('number')}: {len(imgs)} images")
        time.sleep(0.05)

    # Update scraped_data/series.json
    with open(SCRAPED_DATA, "r", encoding="utf-8") as f:
        catalog = json.load(f)
    for item in catalog:
        if item.get("id") == manga_id:
            item["chapters"] = clean_chaps
            item["total_chapters"] = len(clean_chaps)
            item["latest_chapter"] = clean_chaps[0]["number"] if clean_chaps else "1"
    with open(SCRAPED_DATA, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    # Update root series.json
    with open(ROOT_SERIES, "r", encoding="utf-8") as f:
        root_cat = json.load(f)
    for item in root_cat:
        if item.get("id") == manga_id:
            item["chapters"] = clean_chaps
            item["total_chapters"] = len(clean_chaps)
            item["latest_chapter"] = clean_chaps[0]["number"] if clean_chaps else "1"
    with open(ROOT_SERIES, "w", encoding="utf-8") as f:
        json.dump(root_cat, f, ensure_ascii=False, indent=2)

    # Write detail JSON directly (not through seo_fix_all which overwrites)
    os.makedirs(DETAIL_DIR, exist_ok=True)

    # Find all slug-based filenames for this comic
    slug_matches = []
    for item in catalog:
        if item.get("id") == manga_id:
            slug_matches.append(item.get("slug") or manga_id)

    detail_files_to_write = [manga_id] + [s for s in slug_matches if s != manga_id]
    for df_name in detail_files_to_write:
        df_path = os.path.join(DETAIL_DIR, f"{df_name}.json")
        existing = {}
        if os.path.exists(df_path):
            try:
                with open(df_path, "r", encoding="utf-8") as f:
                    existing = json.load(f)
            except Exception:
                pass
        existing["chapters"] = clean_chaps
        with open(df_path, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, separators=(',', ':'))
        print(f"  ✅ Wrote {df_name}.json with {len(clean_chaps)} real UUIDs")

print("\n" + "="*55)
print(" STARTING SCRAPE FOR 3 ACTIVE SERIES WITH FAKE IDs")
print("="*55)

for manga_id, name in TARGETS:
    scrape_and_fix(manga_id, name)

# Now rebuild without letting seo_fix_all overwrite the detail files
# We run master_database_builder to update data.js/data-initial.js/data-catalog.json
# but NOT seo_fix_all (which generates chapters from clean_master_chaps without images)
print("\n[Rebuilding core data files (without SEO which strips chapter images)]")
subprocess.run(["python", "master_database_builder.py"], cwd=SHINIGAMI_APP_DIR, check=True)

# Now manually rebuild index.html and data-initial.js
import re as _re
DATA_INITIAL_JS = os.path.join(SHINIGAMI_APP_DIR, "data-initial.js")
INDEX_HTML = os.path.join(SHINIGAMI_APP_DIR, "index.html")

with open(DATA_INITIAL_JS, "r", encoding="utf-8") as f:
    js_text = f.read()
json_str = js_text.replace("window.SERIES_DATA =", "").strip().rstrip(";")
series_arr = json.loads(json_str)

# Now regenerate static HTML pages for the 3 fixed comics using seo_fix_all
# But AFTER that, re-write the detail JSONs with real chapter UUIDs
print("\n[Running seo_fix_all.py (will regenerate static pages)]")
subprocess.run(["python", "seo_fix_all.py"], cwd=SHINIGAMI_APP_DIR, check=True)

# Re-apply detail JSON with real chapter UUIDs AFTER seo_fix_all
print("\n[Re-applying real chapter UUIDs to detail JSONs after seo_fix_all]")

with open(SCRAPED_DATA, "r", encoding="utf-8") as f:
    final_catalog = json.load(f)
final_map = {s.get("id"): s for s in final_catalog}

for manga_id, name in TARGETS:
    item = final_map.get(manga_id)
    if not item:
        continue
    chaps = item.get("chapters") or []
    if not chaps:
        continue

    for df_name in [manga_id, item.get("slug")]:
        if not df_name:
            continue
        df_path = os.path.join(DETAIL_DIR, f"{df_name}.json")
        if os.path.exists(df_path):
            try:
                with open(df_path, "r", encoding="utf-8") as f:
                    d = json.load(f)
                d["chapters"] = chaps
                with open(df_path, "w", encoding="utf-8") as f:
                    json.dump(d, f, ensure_ascii=False, separators=(',', ':'))
                print(f"  ✅ Re-applied real UUIDs to {df_name}.json ({len(chaps)} chapters)")
            except Exception as e:
                print(f"  ❌ Error re-applying {df_name}.json: {e}")

# Update cache busters and push
ts = str(int(datetime.now().timestamp()))
with open(INDEX_HTML, "r", encoding="utf-8") as f:
    html = f.read()
html = _re.sub(r'data-initial\.js\?v=[^"]+', f'data-initial.js?v={ts}', html)
html = _re.sub(r'styles\.css\?v=[^"]+', f'styles.css?v={ts}', html)
html = _re.sub(r'app\.js\?v=[^"]+', f'app.js?v={ts}', html)
with open(INDEX_HTML, "w", encoding="utf-8") as f:
    f.write(html)

subprocess.run(["git", "add", "."], cwd=SHINIGAMI_APP_DIR, check=True)
subprocess.run(["git", "commit", "-m", f"Fix Gachiakuta + Marriage + All Hail real chapter UUIDs v={ts}"], cwd=SHINIGAMI_APP_DIR, check=True)
push = subprocess.run(["git", "push", "origin", "main"], cwd=SHINIGAMI_APP_DIR, capture_output=True, text=True)
print("\nGit Push:", push.stdout or "")
if push.stderr:
    print("Stderr:", push.stderr.strip())

print("\n🎉 ALL 3 REMAINING FAKE UUID SERIES FIXED AND DEPLOYED!")
