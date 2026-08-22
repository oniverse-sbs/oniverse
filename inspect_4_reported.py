import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
DATA_FILE = os.path.join(SHINIGAMI_APP_DIR, "scraped_data", "series.json")

ids = [
    "cae262f8-ae2c-4626-a9b3-8f2dc6b72117",
    "d4e9983e-69eb-4370-b93a-f310b6e81faa",
    "7701ba39-f6b3-46ab-873f-cbc1fe93fb10",
    "a2ba8fcf-f554-4568-95ea-f0cc997ab394"
]

with open(DATA_FILE, "r", encoding="utf-8") as f:
    catalog = json.load(f)

cat_map = {str(item.get("id")): item for item in catalog}

for sid in ids:
    print(f"\n=======================================================")
    print(f"Checking in series.json: {sid}")
    item = cat_map.get(sid)
    if not item:
        print("❌ NOT FOUND in scraped_data/series.json!")
    else:
        print("Title:", item.get("title"))
        print("Latest Ch:", item.get("latest_chapter"))
        print("Total Ch:", item.get("total_chapters"))
        chaps = item.get("chapters") or []
        print("Chapters count in catalog:", len(chaps))
        if chaps:
            print("First ch sample:", chaps[0].get("number"), chaps[0].get("id") or chaps[0].get("slug"))
            print("First ch images count:", len(chaps[0].get("images") or []))

    # Check detail file
    detail_path = os.path.join(SHINIGAMI_APP_DIR, "data", "detail", f"{sid}.json")
    if os.path.exists(detail_path):
        with open(detail_path, "r", encoding="utf-8") as df:
            d_data = json.load(df)
        d_chaps = d_data.get("chapters") or []
        print(f"Detail file {sid}.json exists! Chapters count: {len(d_chaps)}")
        if d_chaps:
            imgs = d_chaps[0].get("images") or []
            print(f"Detail file sample ch #{d_chaps[0].get('number')} images count: {len(imgs)}")
    else:
        print(f"❌ Detail file {sid}.json DOES NOT EXIST!")
