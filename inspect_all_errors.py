import json
import os
import re

shinigami_dir = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
with open(os.path.join(shinigami_dir, "series.json"), "r", encoding="utf-8") as f:
    series = json.load(f)

print("=" * 80)
print("SERIES INVENTORY & ERROR DIAGNOSIS")
print("=" * 80)

for s in series:
    title = s.get("title")
    sid = s.get("id") or s.get("slug")
    source = s.get("source", "N/A")
    cover = s.get("cover", "")
    chaps = s.get("chapters", [])
    
    real_uuids = 0
    fake_ids = 0
    with_imgs = 0
    
    for ch in chaps:
        cid = str(ch.get("id") or ch.get("slug") or "")
        imgs = ch.get("images") or []
        if imgs:
            with_imgs += 1
        if re.match(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", cid):
            real_uuids += 1
        else:
            fake_ids += 1
            
    cover_status = "OK" if (cover and cover.startswith("http")) else ("MISSING" if not cover else "INVALID")
    
    print(f"Title: {title}")
    print(f"  ID: {sid}")
    print(f"  Source: {source} | Cover: {cover_status}")
    print(f"  Chapters: total={len(chaps)}, real_uuids={real_uuids}, fake_ids={fake_ids}, with_images={with_imgs}")
    if fake_ids > 0:
        print(f"  -> WARNING: {fake_ids} fake chapter IDs that cannot load in reader!")
    if len(chaps) == 0:
        print(f"  -> ERROR: 0 chapters!")
    if not cover:
        print(f"  -> ERROR: Missing cover image!")
    print("-" * 60)
