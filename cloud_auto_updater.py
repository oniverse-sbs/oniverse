import os
import sys
import json
from datetime import datetime

# Relative Project Root Path for GitHub Actions & Local Execution
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(PROJECT_DIR, "scraped_data", "series.json")

def run_cloud_update():
    print("============================================================")
    print("  ONIVERSE 24/7 CLOUD AUTO-UPDATER & CHAPTER SYNC")
    print("============================================================")
    
    if not os.path.exists(DATA_FILE):
        print(f"Error: {DATA_FILE} not found!")
        return

    # 1. Fetch latest target series using scrape_user_targets engine
    import scrape_user_targets
    print("\n[1/3] Syncing Target Shinigami Comics...")
    new_entries = []
    for tid in scrape_user_targets.TARGET_IDS:
        entry = scrape_user_targets.fetch_single_series(tid)
        if entry:
            new_entries.append(entry)

    # 2. Merge into master series.json
    print("\n[2/3] Merging into Master Database series.json...")
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        existing = json.load(f)

    existing_map = {s.get("id"): s for s in existing}
    for ne in new_entries:
        existing_map[ne["id"]] = ne

    updated_all = list(existing_map.values())

    # Keep target pinned comics at top positions
    pinned_ids = [
        "4ef0b99b-20d3-4da8-bb73-9c3768f32699",
        "11ecc266-ead4-4728-b21a-5ac34afb140c",
        "56c552be-3ba1-41b8-975e-d77fd4e1bc2c"
    ]
    pinned_items = [s for s in updated_all if s.get("id") in pinned_ids or s.get("slug") in pinned_ids]
    rest_items = [s for s in updated_all if s not in pinned_items]
    final_list = pinned_items + rest_items

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(final_list, f, ensure_ascii=False, indent=2)

    print(f"   Saved master series.json ({len(final_list)} total series).")

    # 3. Trigger Static Site Generator (seo_fix_all.py)
    print("\n[3/3] Regenerating Static Site Pages & Data Catalog...")
    import seo_fix_all
    seo_fix_all.main()

    print("============================================================")
    print(f"   CLOUD AUTO-UPDATE COMPLETE! ({len(new_entries)} targets synced)")
    print("============================================================")

if __name__ == "__main__":
    run_cloud_update()
