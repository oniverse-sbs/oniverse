import urllib.request
import json
import ssl
import sys
import os
import re

sys.stdout.reconfigure(encoding='utf-8')

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch(url, timeout=10, origin='https://oniverse.sbs'):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Cache-Control': 'no-cache',
        'Origin': origin,
        'Referer': origin + '/'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=timeout) as r:
            return r.status, r.read().decode('utf-8', errors='ignore'), dict(r.headers)
    except Exception as e:
        return None, str(e), {}

print("=" * 60)
print("ONIVERSE.SBS FULL AUDIT REPORT")
print("=" * 60)

# 1. Check index.html
print("\n[1] Checking index.html...")
status, html, hdrs = fetch("https://oniverse.sbs/")
print(f"  Status: {status}")
print(f"  HTML size: {len(html)} chars")
print(f"  Has 'Chapter N/A': {'Chapter N/A' in html}")
print(f"  Has 'N/A' text: {html.count('N/A')} occurrences")
# Count broken update cards
na_count = html.count('>N/A<')
print(f"  Bare N/A instances: {na_count}")

# Detect static card chapter numbers
ch_matches = re.findall(r'Chapter ([^<"]{1,20})</span>', html)
print(f"  Chapter numbers in static cards: {ch_matches[:15]}")

# Check data-initial.js is linked and version
di_match = re.search(r'data-initial\.js\?v=(\d+)', html)
print(f"  data-initial.js version: {di_match.group(1) if di_match else 'NOT FOUND'}")

# 2. Check critical JS/CSS files
print("\n[2] Checking critical assets...")
assets = [
    "https://oniverse.sbs/app.js",
    "https://oniverse.sbs/styles.css",
    "https://oniverse.sbs/data-initial.js",
    "https://oniverse.sbs/data-catalog.json",
]
for url in assets:
    s, body, h = fetch(url)
    print(f"  [{s}] {url} — {len(body)} bytes")

# 3. Check detail pages of 4 reported comics
print("\n[3] Checking komik detail pages...")
comic_ids = [
    ("cae262f8-ae2c-4626-a9b3-8f2dc6b72117", "The Wind Mage"),
    ("d4e9983e-69eb-4370-b93a-f310b6e81faa", "Face Genius"),
    ("7701ba39-f6b3-46ab-873f-cbc1fe93fb10", "Player Cant Level UP"),
    ("a2ba8fcf-f554-4568-95ea-f0cc997ab394", "All Hail the Sect Leaders"),
    ("4751525f-359c-423a-9fdb-44d40ac8105d", "Return of Crazy Demon"),
    ("c8077427-0ad6-4358-9497-98fd338f6425", "My Dad Is The Strongest"),
]
for cid, cname in comic_ids:
    s, body, h = fetch(f"https://oniverse.sbs/komik/{cid}/")
    print(f"  [{s}] /komik/{cid}/ — {cname}")

# 4. Check data/detail/ JSON files (chapters with real UUIDs)
print("\n[4] Checking detail JSON files (chapter UUID integrity)...")
for cid, cname in comic_ids:
    s, body, h = fetch(f"https://oniverse.sbs/data/detail/{cid}.json")
    if s == 200:
        try:
            d = json.loads(body)
            chaps = d.get("chapters", [])
            sample_ch = chaps[0] if chaps else {}
            ch_id = sample_ch.get("id") or sample_ch.get("slug") or ""
            ch_num = sample_ch.get("number") or sample_ch.get("chapter") or ""
            is_real_uuid = bool(re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-', ch_id))
            imgs = len(sample_ch.get("images") or [])
            print(f"  [OK] {cname}: {len(chaps)} chapters, Sample ch#{ch_num} ID={ch_id[:36]}, is_real_uuid={is_real_uuid}, images={imgs}")
        except Exception as e:
            print(f"  [ERROR parsing JSON] {cname}: {e}")
    else:
        print(f"  [{s}] {cname}: /data/detail/{cid}.json FAILED")

# 5. Test sample chapter image fetch (what happens when user opens a chapter)
print("\n[5] Testing sample chapter image availability (simulating reader)...")
# Load from local catalog
data_file = os.path.join(SHINIGAMI_APP_DIR, "scraped_data", "series.json")
with open(data_file, "r", encoding="utf-8") as f:
    catalog = json.load(f)
cat_map = {s["id"]: s for s in catalog}

for cid, cname in comic_ids[:4]:
    item = cat_map.get(cid)
    if not item:
        print(f"  [MISSING] {cname} not in local catalog!")
        continue
    chaps = item.get("chapters", [])
    if not chaps:
        print(f"  [NO CHAPTERS] {cname}")
        continue
    ch0 = chaps[0]
    ch_id = ch0.get("id") or ch0.get("slug") or ""
    ch_num = ch0.get("number")
    imgs = ch0.get("images") or []
    
    if imgs:
        # Test if first image URL is reachable
        img_url = imgs[0]
        si, _, _ = fetch(img_url, timeout=5, origin='https://oniverse.sbs')
        print(f"  {cname} ch#{ch_num}: {len(imgs)} pre-cached images, first={si or 'TIMEOUT'}")
    else:
        # Must hit Shinigami API at reader time — test if API would work
        api_url = f"https://api.shngm.io/v1/chapter/detail/{ch_id}"
        si, ab, _ = fetch(api_url, timeout=8)
        print(f"  {cname} ch#{ch_num}: NO pre-cached images, API for ch_id={ch_id[:36] or 'MISSING'} → {si or 'TIMEOUT'}")

# 6. Check app.js for known bugs: N/A fallback, fetch timeout issues
print("\n[6] Checking app.js for known bugs...")
app_js_path = os.path.join(SHINIGAMI_APP_DIR, "app.js")
with open(app_js_path, "r", encoding="utf-8") as f:
    app_js = f.read()

# Check fetch timeout setting
timeout_match = re.search(r'fetchWithTimeout\(url,\s*ms\s*=\s*(\d+)\)', app_js)
print(f"  Default fetchWithTimeout: {timeout_match.group(1) if timeout_match else 'NOT FOUND'}ms")

# Check N/A references
na_refs = [(m.start(), app_js[max(0,m.start()-30):m.start()+60]) for m in re.finditer(r"'N/A'", app_js)]
print(f"  Remaining 'N/A' references in app.js: {len(na_refs)}")
for pos, ctx_s in na_refs[:5]:
    print(f"    ...{ctx_s.strip()}...")

# Check if chapter images from static JSON filter
print(f"  Filter 'assets.shinigami.ae' present: {'assets.shinigami.ae' in app_js}")
print(f"  Filter 'picsum.photos' present: {'picsum.photos' in app_js}")

# 7. Check if data-initial.js has correct chapters
print("\n[7] Checking data-initial.js content (live)...")
s, body, h = fetch("https://oniverse.sbs/data-initial.js")
if s == 200:
    try:
        json_str = body.replace("window.SERIES_DATA =", "").strip().rstrip(";")
        arr = json.loads(json_str)
        print(f"  Total series in data-initial.js: {len(arr)}")
        for item in arr[:5]:
            print(f"  — {item.get('title')}: ch={item.get('latest_chapter')}, total={item.get('total_chapters')}, has_chapters={len(item.get('chapters') or [])}")
    except Exception as e:
        print(f"  ERROR parsing data-initial.js: {e}")

print("\n[8] Checking app.js for common reader bugs...")
# chapter_id vs id
has_chapter_id = 'ch.chapter_id' in app_js
has_ch_id = 'ch.id' in app_js
has_slug = 'ch.slug' in app_js
print(f"  Reads ch.chapter_id: {has_chapter_id}")
print(f"  Reads ch.id: {has_ch_id}")
print(f"  Reads ch.slug: {has_slug}")

# Check for critical error handlers
has_onerror = 'onerror' in app_js
print(f"  Has img onerror handler: {has_onerror}")

print("\n" + "=" * 60)
print("AUDIT COMPLETE")
print("=" * 60)
