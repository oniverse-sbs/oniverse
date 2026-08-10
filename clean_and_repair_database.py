import json
import os
import re

PROJECT_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
SOURCE_FILE = os.path.join(PROJECT_DIR, "scraped_data", "series.json")
OUTPUT_FILE = os.path.join(PROJECT_DIR, "scraped_data", "series.json")

def clean_database_fast():
    print("=========================================================")
    print("  FAST ONIVERSE DATABASE CLEANUP & REPAIR")
    print("=========================================================")

    if not os.path.exists(SOURCE_FILE):
        print(f"[ERROR] Source file not found: {SOURCE_FILE}")
        return

    with open(SOURCE_FILE, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    print(f"Loaded {len(catalog)} series entries.")

    valid_catalog = []
    removed_no_chaps = 0

    for item in catalog:
        title = item.get("title") or item.get("name") or ""
        sid = str(item.get("id") or item.get("slug") or "")

        if not title or not sid:
            continue

        raw_chaps = item.get("chapters") or []
        
        clean_chaps = []
        seen_ch_nums = set()

        for c in raw_chaps:
            ch_num = str(c.get("number") or c.get("chapter") or "").strip()
            ch_id = str(c.get("id") or c.get("chapter_id") or c.get("slug") or "").strip()

            if not ch_num and not ch_id:
                continue

            if not ch_num:
                ch_num = ch_id.replace("ch_", "").replace("chapter-", "")

            if ch_num in seen_ch_nums:
                continue
            seen_ch_nums.add(ch_num)

            raw_imgs = c.get("images") or []
            valid_imgs = [img for img in raw_imgs if isinstance(img, str) and img.startswith("http")]

            clean_chaps.append({
                "id": ch_id or f"ch_{ch_num}",
                "slug": ch_id or f"ch_{ch_num}",
                "number": ch_num,
                "chapter": ch_num,
                "title": c.get("title") or f"Chapter {ch_num}",
                "date": (c.get("date") or c.get("released") or c.get("created_at") or "")[:10],
                "images": valid_imgs
            })

        # Filter out series with 0 valid chapters
        if len(clean_chaps) == 0:
            removed_no_chaps += 1
            print(f"  [REMOVED 0-CHAPTER]: {title}")
            continue

        # Sort chapters descending by parsed number
        def parse_ch(c):
            m = re.search(r'\d+(\.\d+)?', c.get("number", "0"))
            return float(m.group(0)) if m else 0.0

        clean_chaps.sort(key=parse_ch, reverse=True)

        item["chapters"] = clean_chaps
        item["total_chapters"] = len(clean_chaps)
        item["latest_chapter"] = clean_chaps[0]["number"] if clean_chaps else str(item.get("latest_chapter", "1"))
        
        valid_catalog.append(item)

    # Sort valid catalog by last_updated (newest first)
    def parse_date(s):
        return s.get("last_updated") or s.get("updated_at") or s.get("created_at") or ""

    valid_catalog.sort(key=parse_date, reverse=True)

    print("=========================================================")
    print(f"  FAST CLEANUP COMPLETE!")
    print(f"  - Original Series Count: {len(catalog)}")
    print(f"  - Valid Series Count: {len(valid_catalog)}")
    print(f"  - Removed 0-chapter series: {removed_no_chaps}")
    print("=========================================================")

    # Save clean catalog
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(valid_catalog, f, ensure_ascii=False, indent=2)

    print(f"Saved cleaned database to {OUTPUT_FILE}")

if __name__ == "__main__":
    clean_database_fast()
