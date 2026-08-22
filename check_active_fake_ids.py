import json
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
SCRAPED = os.path.join(SHINIGAMI_APP_DIR, "scraped_data", "series.json")
DETAIL_DIR = os.path.join(SHINIGAMI_APP_DIR, "data", "detail")

# Load active series IDs
with open(SCRAPED, "r", encoding="utf-8") as f:
    catalog = json.load(f)

active_ids = set(str(s.get("id")) for s in catalog)
active_slugs = set(str(s.get("slug") or s.get("id")) for s in catalog)

print(f"Total active series: {len(active_ids)}")
print(f"Active IDs: {sorted(active_ids)[:5]}...")

# Check which detail files with fake IDs belong to active series
fake_id_active = []
fake_id_inactive = []

for fname in os.listdir(DETAIL_DIR):
    if not fname.endswith(".json"):
        continue
    base = fname[:-5]
    fpath = os.path.join(DETAIL_DIR, fname)
    try:
        with open(fpath, "r", encoding="utf-8") as f:
            d = json.load(f)
        chaps = d.get("chapters", [])
        if not chaps:
            continue
        sample = chaps[0]
        ch_id = sample.get("id") or sample.get("slug") or ""
        if ch_id and not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-', ch_id, re.IGNORECASE):
            if ch_id and (ch_id.startswith("ch_") or ch_id.startswith("chapter-")):
                if base in active_ids or base in active_slugs:
                    fake_id_active.append((fname, ch_id, base))
                else:
                    fake_id_inactive.append(fname)
    except Exception:
        pass

print(f"\n⚠️  ACTIVE series with fake chapter IDs ({len(fake_id_active)}):")
for fname, cid, sid in fake_id_active:
    print(f"  {fname} — sample ID: {cid}")

print(f"\n📦 INACTIVE/orphaned detail files with fake IDs: {len(fake_id_inactive)}")
print("  (These are old data files not used by current catalog — safe to ignore)")
