import urllib.request
import json
import ssl
import os
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
SCRAPED_DATA = os.path.join(SHINIGAMI_APP_DIR, "scraped_data", "series.json")

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
                time.sleep(1)
            else:
                print(f"  ❌ Error fetching {url}: {e}")
                return None

# All Hail the Sect Leaders has fake chapter IDs, need to fix its detail JSON
manga_id = "a2ba8fcf-f554-4568-95ea-f0cc997ab394"
print(f"Fetching ALL real chapter UUIDs for All Hail the Sect Leaders ({manga_id})...")

all_chaps = []
for page in range(1, 5):  # Up to 2000 chapters (4 pages * 500)
    url = f"https://api.shngm.io/v1/chapter/{manga_id}/list?page={page}&page_size=500&sort_by=chapter_number&sort_order=desc"
    res = fetch_json(url)
    if res and res.get("retcode") == 0 and isinstance(res.get("data"), list):
        items = res["data"]
        if not items:
            break
        all_chaps.extend(items)
        print(f"  Page {page}: {len(items)} chapters (total so far: {len(all_chaps)})")
        if len(items) < 500:
            break
    else:
        break

print(f"\nTotal chapters fetched: {len(all_chaps)}")

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

# Pre-cache images for first 15 chapters (latest)
print("\nPre-caching panel images for top 15 chapters...")
for i, ch in enumerate(clean_chaps[:15]):
    ch_id = ch.get("id") or ""
    if not ch_id:
        continue
    ch_detail_url = f"https://api.shngm.io/v1/chapter/detail/{ch_id}"
    res = fetch_json(ch_detail_url)
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
        ch["images"] = imgs
        print(f"  Ch #{ch.get('number')}: {len(imgs)} images cached")
    time.sleep(0.05)

# Update in scraped_data/series.json
with open(SCRAPED_DATA, "r", encoding="utf-8") as f:
    catalog = json.load(f)

updated = 0
for item in catalog:
    if item.get("id") == manga_id:
        item["chapters"] = clean_chaps
        item["total_chapters"] = len(clean_chaps)
        item["latest_chapter"] = clean_chaps[0]["number"] if clean_chaps else "1"
        updated += 1

with open(SCRAPED_DATA, "w", encoding="utf-8") as f:
    json.dump(catalog, f, ensure_ascii=False, indent=2)

print(f"\n✅ Updated All Hail the Sect Leaders with {len(clean_chaps)} real chapter UUIDs")

# Also update root series.json
root_series = os.path.join(SHINIGAMI_APP_DIR, "series.json")
with open(root_series, "r", encoding="utf-8") as f:
    root_cat = json.load(f)
for item in root_cat:
    if item.get("id") == manga_id:
        item["chapters"] = clean_chaps
        item["total_chapters"] = len(clean_chaps)
        item["latest_chapter"] = clean_chaps[0]["number"] if clean_chaps else "1"
with open(root_series, "w", encoding="utf-8") as f:
    json.dump(root_cat, f, ensure_ascii=False, indent=2)

print("✅ Updated root series.json")

# Now also write the detail/ID.json directly with real chapter IDs
detail_dir = os.path.join(SHINIGAMI_APP_DIR, "data", "detail")
os.makedirs(detail_dir, exist_ok=True)

# Get existing detail for other metadata
detail_path = os.path.join(detail_dir, f"{manga_id}.json")
existing_detail = {}
if os.path.exists(detail_path):
    with open(detail_path, "r", encoding="utf-8") as f:
        existing_detail = json.load(f)

existing_detail["chapters"] = clean_chaps
with open(detail_path, "w", encoding="utf-8") as f:
    json.dump(existing_detail, f, ensure_ascii=False, separators=(',', ':'))
print(f"✅ Wrote detail/{manga_id}.json with {len(clean_chaps)} real chapter UUIDs")
