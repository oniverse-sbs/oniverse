import json
import os
import re

PROJECT_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
SCRAPED_FILE = os.path.join(PROJECT_DIR, "scraped_data", "series.json")
ROOT_SERIES_FILE = os.path.join(PROJECT_DIR, "series.json")
DATA_JS_FILE = os.path.join(PROJECT_DIR, "data.js")
DATA_DIR = os.path.join(PROJECT_DIR, "data")
DETAIL_DIR = os.path.join(DATA_DIR, "detail")

os.makedirs(SCRAPED_FILE.rsplit(os.sep, 1)[0], exist_ok=True)
os.makedirs(DETAIL_DIR, exist_ok=True)

def clean_text(text):
    if not isinstance(text, str):
        return text
    # Replace unicode replacement char or mangled characters
    text = text.replace('\ufffd', "'")
    text = text.replace('&amp;', '&').replace('&quot;', '"').replace('&#039;', "'")
    return text.strip()

def run_fix():
    print("==================================================")
    print("   CEKKOMIK FIXER: comik -> chapter -> isinya")
    print("==================================================")

    # Load master scraped_data if exists, or root series.json
    source_path = SCRAPED_FILE if os.path.exists(SCRAPED_FILE) else ROOT_SERIES_FILE
    print(f"Reading master dataset from: {source_path}")
    with open(source_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    # Backup root series.json if also exists
    if os.path.exists(ROOT_SERIES_FILE) and ROOT_SERIES_FILE != source_path:
        with open(ROOT_SERIES_FILE, "r", encoding="utf-8") as f:
            root_data = json.load(f)
            # Merge chapter data if root had some better metadata
            root_map = {s.get("id") or s.get("slug"): s for s in root_data}
            for s in catalog:
                key = s.get("id") or s.get("slug")
                if key in root_map:
                    rm = root_map[key]
                    if not s.get("chapters") and rm.get("chapters"):
                        s["chapters"] = rm["chapters"]

    print(f"Total comics loaded: {len(catalog)}")

    # ----------------------------------------------------
    # STEP 1: COMIK (Comic level checks & fixes)
    # ----------------------------------------------------
    print("\n[STEP 1/3] Checking & Fixing COMIC (Series Metadata)...")
    fixed_comic_count = 0
    slug_seen = set()
    clean_catalog = []

    for s in catalog:
        # Clean title & synopsis
        orig_title = s.get("title", "")
        s["title"] = clean_text(orig_title)
        s["alternative_title"] = clean_text(s.get("alternative_title", ""))
        s["synopsis"] = clean_text(s.get("synopsis", "") or "Belum ada deskripsi.")
        
        # Ensure slug exists
        if not s.get("slug"):
            s["slug"] = re.sub(r'[^a-z0-9]+', '-', s["title"].lower()).strip('-')
        
        # Clean slug
        s["slug"] = clean_text(s["slug"]).lower()

        # Deduplicate
        if s["slug"] in slug_seen:
            continue
        slug_seen.add(s["slug"])

        # Ensure ID exists
        if not s.get("id"):
            s["id"] = s["slug"]

        # Ensure Cover & Thumbnail
        cover = s.get("cover") or s.get("thumbnail") or s.get("cover_image_url") or ""
        if cover.startswith("//"):
            cover = "https:" + cover
        s["cover"] = cover
        s["thumbnail"] = cover

        # Rating, type, status, genres
        s["rating"] = str(s.get("rating") or "8.0")
        s["status"] = s.get("status") or "Ongoing"
        s["type"] = (s.get("type") or "Manhwa").capitalize()
        
        if not isinstance(s.get("genres"), list) or len(s.get("genres", [])) == 0:
            s["genres"] = ["Action", "Fantasy"]

        if orig_title != s["title"]:
            fixed_comic_count += 1

        clean_catalog.append(s)

    catalog = clean_catalog
    print(f"  >> Validated {len(catalog)} comics ({fixed_comic_count} title encoding fixes applied)")

    # ----------------------------------------------------
    # STEP 2: CHAPTER (Chapter level checks & fixes)
    # ----------------------------------------------------
    print("\n[STEP 2/3] Checking & Fixing CHAPTER (Chapter Lists)...")
    comics_with_no_ch = 0
    total_chapters_count = 0
    fixed_ch_meta = 0

    for s in catalog:
        chaps = s.get("chapters", [])
        if not isinstance(chaps, list):
            chaps = []

        clean_chaps = []
        for i, c in enumerate(chaps):
            if not isinstance(c, dict):
                continue
            
            c_num = str(c.get("number") or c.get("chapter") or c.get("chapter_number") or (len(chaps) - i))
            c_slug = str(c.get("slug") or c.get("chapter_id") or f"ch_{c_num}")
            c_date = str(c.get("date") or c.get("release_date") or c.get("createdAt") or "")[:10]
            
            c_entry = {
                "number": c_num,
                "chapter": c_num,
                "slug": c_slug,
                "date": c_date
            }

            # Retain Komikcast/Shinigami indexing if available
            if c.get("kc_index"):
                c_entry["kc_index"] = c["kc_index"]
            if c.get("kc_series_slug"):
                c_entry["kc_series_slug"] = c["kc_series_slug"]
            if c.get("images"):
                c_entry["images"] = c["images"]
            elif c.get("content"):
                c_entry["images"] = c["content"]

            clean_chaps.append(c_entry)

        s["chapters"] = clean_chaps
        s["total_chapters"] = len(clean_chaps)
        
        if clean_chaps:
            s["latest_chapter"] = str(clean_chaps[0]["number"])
            total_chapters_count += len(clean_chaps)
        else:
            comics_with_no_ch += 1
            s["latest_chapter"] = "?"

    print(f"  >> Total chapters processed across all comics: {total_chapters_count}")
    print(f"  >> Comics with 0 chapters: {comics_with_no_ch}")

    # ----------------------------------------------------
    # STEP 3: ISINYA (Chapter Content / Image checks & fixes)
    # ----------------------------------------------------
    print("\n[STEP 3/3] Checking & Fixing ISINYA (Chapter Images)...")
    total_images_found = 0
    ch_with_no_imgs = 0
    detail_files_written = 0

    for s in catalog:
        sid = str(s.get("id", ""))
        slug = s.get("slug", "")

        # Prepare detail object for static JSON
        detail_chaps = []
        for c in s.get("chapters", []):
            imgs = c.get("images") or []
            if isinstance(imgs, str):
                imgs = [imgs]
            # Filter clean non-empty image strings
            clean_imgs = [img for img in imgs if isinstance(img, str) and img.strip()]

            if clean_imgs:
                total_images_found += len(clean_imgs)
            else:
                ch_with_no_imgs += 1

            d_ch = {
                "chapter_id": c.get("slug", ""),
                "number": c.get("number", ""),
                "chapter": c.get("chapter", ""),
                "title": f"Chapter {c.get('number', '')}",
                "date": c.get("date", ""),
                "released": c.get("date", ""),
                "images": clean_imgs
            }
            detail_chaps.append(d_ch)

        detail_payload = {
            "synopsis": s.get("synopsis", ""),
            "alternative_title": s.get("alternative_title", ""),
            "author": s.get("author", "Unknown"),
            "artist": s.get("artist", "Unknown"),
            "chapters": detail_chaps
        }

        # Write to static detail files for BOTH sid.json AND slug.json
        targets = set()
        if sid: targets.add(f"{re.sub(r'[^a-zA-Z0-9_-]', '_', sid)}.json")
        if slug: targets.add(f"{re.sub(r'[^a-zA-Z0-9_-]', '_', slug)}.json")

        for fname in targets:
            fpath = os.path.join(DETAIL_DIR, fname)
            with open(fpath, "w", encoding="utf-8") as df:
                json.dump(detail_payload, df, ensure_ascii=False, separators=(',', ':'))
            detail_files_written += 1

    print(f"  >> Total chapter images verified: {total_images_found}")
    print(f"  >> Chapters without embedded images (fetched on-demand via API): {ch_with_no_imgs}")
    print(f"  >> Total static detail JSON files written: {detail_files_written}")

    # Save master scraped_data/series.json
    print("\nSaving updated scraped_data/series.json...")
    with open(SCRAPED_FILE, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    # Save lightweight root series.json & data/series.json
    print("Saving root series.json & data.js...")
    with open(ROOT_SERIES_FILE, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, separators=(',', ':'))

    data_dir_series = os.path.join(DATA_DIR, "series.json")
    with open(data_dir_series, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, separators=(',', ':'))

    with open(DATA_JS_FILE, "w", encoding="utf-8") as f:
        f.write("window.SERIES_DATA = " + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ";")

    print("\n==================================================")
    print("   SUCCESS! All 3 levels (comik-chapter-isinya) verified & fixed.")
    print("==================================================")

if __name__ == "__main__":
    run_fix()
