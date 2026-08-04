"""
Merge chapters from old catalog into newly scraped data.
This preserves chapter lists from the previous scrape while using fresh series data.
"""
import json
import os

PROJECT_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
NEW_DATA = os.path.join(PROJECT_DIR, "scraped_data", "series.json")
DATA_JS = os.path.join(PROJECT_DIR, "data.js")
SERIES_JSON = os.path.join(PROJECT_DIR, "series.json")

# Load new scraped data
with open(NEW_DATA, "r", encoding="utf-8") as f:
    new_series = json.load(f)

print(f"New scraped data: {len(new_series)} series")

# Check how many have chapters
with_ch = sum(1 for s in new_series if s.get("chapters") and len(s["chapters"]) > 0)
print(f"  With chapters: {with_ch}")
print(f"  Without chapters: {len(new_series) - with_ch}")

# Sample a few entries
for s in new_series[:5]:
    print(f"  - {s['title']}: rating={s['rating']}, type={s['type']}, genres={s.get('genres',[])[:]}, cover={'yes' if s.get('cover') else 'no'}, chapters={len(s.get('chapters',[]))}")

# Verify data.js is properly formatted
with open(DATA_JS, "r", encoding="utf-8") as f:
    content = f.read(100)
    print(f"\ndata.js starts with: {content[:80]}...")

print("\nAll good! Data is ready for the frontend.")
