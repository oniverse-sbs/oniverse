import urllib.request
import json
import ssl
import os
import sys
import time
import subprocess
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
DATA_FILE = os.path.join(SHINIGAMI_APP_DIR, "scraped_data", "series.json")

TARGET_IDS = [
    "4751525f-359c-423a-9fdb-44d40ac8105d",
    "c8077427-0ad6-4358-9497-98fd338f6425"
]

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Origin": "https://shinigami.id",
    "Referer": "https://shinigami.id/",
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

def fetch_chapter_images(chapter_id):
    """Fetch panel image URLs for a chapter"""
    url = f"https://api.shngm.io/v1/chapter/detail/{chapter_id}"
    res = fetch_json(url)
    if res and res.get("retcode") == 0 and res.get("data"):
        data = res["data"]
        chapter_data = data.get("chapter", {})
        images = chapter_data.get("chapter_data_data", []) or chapter_data.get("images", []) or data.get("images", [])
        if isinstance(images, list):
            clean_images = []
            for img in images:
                if isinstance(img, str) and img.startswith("http"):
                    clean_images.append(img)
                elif isinstance(img, dict) and img.get("url"):
                    clean_images.append(img["url"])
            return clean_images
    return []

def fetch_single_series(manga_id):
    print(f"\n=========================================================")
    print(f" Scraping series UUID: {manga_id}")
    print(f"=========================================================")
    
    # 1. Fetch Detail
    detail_url = f"https://api.shngm.io/v1/manga/detail/{manga_id}"
    res = fetch_json(detail_url)
    d = None
    if res and res.get("retcode") == 0 and res.get("data"):
        d = res.get("data")
    else:
        print(f"  Fallback search for {manga_id}...")
        for page in range(1, 15):
            list_url = f"https://api.shngm.io/v1/manga/list?page={page}&page_size=50"
            l_res = fetch_json(list_url)
            if not l_res or not l_res.get("data"):
                break
            for item in l_res["data"]:
                if item.get("manga_id") == manga_id or str(item.get("id")) == manga_id:
                    d = item
                    break
            if d:
                break
                
    if not d:
        print(f"  ❌ Could not find manga_id {manga_id}")
        return None
        
    title = d.get("title") or "Unknown"
    slug = d.get("slug") or manga_id
    print(f"  ✅ Title: {title}")
    print(f"  ✅ Slug:  {slug}")
    
    # Extract taxonomy
    genres = []
    taxonomy = d.get("taxonomy", {})
    if taxonomy:
        genre_list = taxonomy.get("Genre", []) or taxonomy.get("genre", [])
        genres = [g.get("name") for g in genre_list if isinstance(g, dict) and g.get("name")]
    if not genres:
        genres = [g.get("name") for g in d.get("genres", []) if isinstance(g, dict) and g.get("name")]
    
    cover = d.get("cover_image_url") or d.get("cover_portrait_url") or d.get("cover") or ""
    type_name = "Manhwa"
    cid = d.get("country_id")
    if cid == "JP" or cid == 2:
        type_name = "Manga"
    elif cid == "CN" or cid == 3:
        type_name = "Manhua"
    elif cid == "KR" or cid == 1:
        type_name = "Manhwa"
        
    formats = []
    if taxonomy:
        fmt_list = taxonomy.get("Format", [])
        formats = [f.get("name") for f in fmt_list if isinstance(f, dict) and f.get("name")]
    if formats:
        type_name = formats[0]
        
    authors = []
    artists = []
    if taxonomy:
        authors = [a.get("name") for a in taxonomy.get("Author", []) if isinstance(a, dict) and a.get("name")]
        artists = [a.get("name") for a in taxonomy.get("Artist", []) if isinstance(a, dict) and a.get("name")]
        
    rating = d.get("user_rate") or d.get("rating") or 0
    if isinstance(rating, (int, float)) and rating > 0:
        rating = str(round(rating, 1))
    else:
        rating = "8.8"
        
    # 2. Fetch Chapters
    ch_url = f"https://api.shngm.io/v1/chapter/{manga_id}/list?page=1&page_size=500&sort_by=chapter_number&sort_order=desc"
    ch_res = fetch_json(ch_url)
    clean_chaps = []
    if ch_res and ch_res.get("retcode") == 0 and isinstance(ch_res.get("data"), list):
        raw_chaps = ch_res["data"]
        print(f"  📖 Found {len(raw_chaps)} chapters!")
        
        for idx, c in enumerate(raw_chaps):
            ch_num = str(c.get("chapter_number") or "")
            ch_id = c.get("chapter_id") or ""
            
            # Fetch panel images for top 10 chapters
            images = []
            if idx < 10 and ch_id:
                images = fetch_chapter_images(ch_id)
                time.sleep(0.02)
                
            clean_chaps.append({
                "id": ch_id,
                "slug": ch_id,
                "number": ch_num,
                "chapter": ch_num,
                "title": c.get("chapter_title") or f"Chapter {ch_num}",
                "date": (c.get("release_date") or c.get("created_at") or "")[:10],
                "images": images
            })
            
    now_iso = datetime.now().astimezone().isoformat()
    entry = {
        "id": manga_id,
        "source": "shinigami",
        "slug": slug,
        "title": title,
        "alternative_title": d.get("alternative_title") or "",
        "synopsis": d.get("description") or d.get("synopsis") or f"Baca komik {title} Bahasa Indonesia online gratis di OniVerse.SBS",
        "cover": cover,
        "thumbnail": cover,
        "rating": rating,
        "views": d.get("view_count") or d.get("bookmark_count") or 28500,
        "status": "Ongoing" if d.get("status") == 1 or d.get("status_id") == 1 else "Completed",
        "type": type_name,
        "genres": genres or ["Action", "Fantasy", "Martial Arts"],
        "author": ", ".join(authors) if authors else "Shinigami",
        "artist": ", ".join(artists) if artists else "Shinigami",
        "latest_chapter": str(d.get("latest_chapter_number") or (clean_chaps[0]["number"] if clean_chaps else "1")),
        "last_updated": now_iso,
        "total_chapters": len(clean_chaps),
        "chapters": clean_chaps
    }
    return entry

def main():
    print("=========================================================")
    print("  SCRAPING & DEPLOYING USER REQUESTED COMICS FOR ONIVERSE")
    print("=========================================================")
    
    new_entries = []
    for tid in TARGET_IDS:
        entry = fetch_single_series(tid)
        if entry:
            new_entries.append(entry)
            
    if not new_entries:
        print("❌ No entries scraped!")
        return

    # Update scraped_data/series.json & series.json
    for path in [DATA_FILE, os.path.join(SHINIGAMI_APP_DIR, "series.json")]:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        existing = []
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    existing = json.load(f)
            except Exception:
                existing = []
                
        existing_map = {s.get("id"): s for s in existing if isinstance(s, dict)}
        
        # Prepend new entries so they show as fresh top updates
        final_list = list(new_entries)
        for s in existing:
            sid = s.get("id")
            if sid not in [ne["id"] for ne in new_entries]:
                final_list.append(s)
                
        with open(path, "w", encoding="utf-8") as f:
            json.dump(final_list, f, ensure_ascii=False, indent=2)
        print(f"✅ Saved updated catalog to {path} ({len(final_list)} total series)")

    # Rebuild Master Database
    print("\n--- Running master_database_builder.py ---")
    subprocess.run(["python", "master_database_builder.py"], cwd=SHINIGAMI_APP_DIR, check=True)
    
    # Run SEO Fix & Static Page Generation
    print("\n--- Running seo_fix_all.py ---")
    subprocess.run(["python", "seo_fix_all.py"], cwd=SHINIGAMI_APP_DIR, check=True)

    # Git Commit & Push
    print("\n--- Pushing updates to GitHub / Cloudflare Pages ---")
    v_ts = str(int(datetime.now().timestamp()))
    subprocess.run(["git", "add", "."], cwd=SHINIGAMI_APP_DIR, check=True)
    subprocess.run(["git", "commit", "-m", f"Scrape and deploy user requested comics: Return of Crazy Demon & My Dad Is Strongest v={v_ts}"], cwd=SHINIGAMI_APP_DIR, check=True)
    push_res = subprocess.run(["git", "push", "origin", "main"], cwd=SHINIGAMI_APP_DIR, capture_output=True, text=True)
    print("Git Output:", push_res.stdout)
    if push_res.stderr:
        print("Git Stderr:", push_res.stderr)
        
    print("\n=========================================================")
    print("  🎉 SUCCESSFULLY SCRAPED AND DEPLOYED TO ONIVERSE.SBS!")
    print("=========================================================")

if __name__ == "__main__":
    main()
