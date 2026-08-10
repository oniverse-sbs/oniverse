import urllib.request
import json
import ssl
import os
import time
from datetime import datetime

PROJECT_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
DATA_FILE = os.path.join(PROJECT_DIR, "scraped_data", "series.json")

TARGET_IDS = [
    "90f99e6c-d1db-4522-ab70-21c2e7c1adcd",
    "f166beb7-67d8-47ea-9fa2-54aea1df6dd7",
    "e6f3b404-6613-49d1-9116-00a210d4f3b7",
    "3f1c0e4c-0aa1-4606-b51a-d7cb24766479",
    "b5f07831-f952-4919-af7c-aae4cadeb607",
    "56c552be-3ba1-41b8-975e-d77fd4e1bc2c",
    "fa2897c2-9805-409e-a952-e5e25329b44f",
    "703f6c7a-ad78-4d50-b5cc-c768c0a12fdb"
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
                print(f"  [ERROR] Fetching {url}: {e}")
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
    print(f" Fetching series UUID: {manga_id}")
    print(f"=========================================================")
    
    # 1. Fetch Detail
    detail_url = f"https://api.shngm.io/v1/manga/detail/{manga_id}"
    res = fetch_json(detail_url)
    d = None
    if res and res.get("retcode") == 0 and res.get("data"):
        d = res.get("data")
    else:
        print(f"  Direct detail fetch failed for {manga_id}. Trying search fallback...")
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
        print(f"  [WARNING] Could not find manga_id {manga_id} in API")
        return None
        
    title = d.get("title") or "Unknown"
    slug = d.get("slug") or manga_id
    print(f"  Title: {title}")
    print(f"  Slug:  {slug}")
    
    # Extract taxonomy (Genres, Type, Authors)
    genres = []
    taxonomy = d.get("taxonomy", {})
    if taxonomy:
        genre_list = taxonomy.get("Genre", [])
        genres = [g.get("name") for g in genre_list if isinstance(g, dict) and g.get("name")]
    if not genres:
        genres = [g.get("name") for g in d.get("genres", []) if isinstance(g, dict) and g.get("name")]
    
    cover = d.get("cover_image_url") or d.get("cover_portrait_url") or ""
    type_name = "Manhwa"
    cid = d.get("country_id")
    if cid == "JP":
        type_name = "Manga"
    elif cid == "CN":
        type_name = "Manhua"
    elif cid == "KR":
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
        print(f"  Found {len(raw_chaps)} chapters in API!")
        
        # Fetch chapter image panels for top chapters
        for idx, c in enumerate(raw_chaps):
            ch_num = str(c.get("chapter_number") or "")
            ch_id = c.get("chapter_id") or ""
            
            # Fetch panel images for recent chapters (top 15) to ensure instant reading
            images = []
            if idx < 15 and ch_id:
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
            
    entry = {
        "id": manga_id,
        "source": "shinigami",
        "slug": slug,
        "title": title,
        "alternative_title": d.get("alternative_title") or "",
        "synopsis": d.get("description") or d.get("synopsis") or f"Baca komik {title} Bahasa Indonesia.",
        "cover": cover,
        "thumbnail": cover,
        "rating": rating,
        "views": d.get("view_count") or d.get("bookmark_count") or 12500,
        "status": "Ongoing" if d.get("status") == 1 or d.get("status_id") == 1 else "Completed",
        "type": type_name,
        "genres": genres or ["Action", "Fantasy", "Adventure"],
        "author": ", ".join(authors) if authors else "Shinigami",
        "artist": ", ".join(artists) if artists else "Shinigami",
        "latest_chapter": str(d.get("latest_chapter_number") or (clean_chaps[0]["number"] if clean_chaps else "1")),
        "last_updated": datetime.now().astimezone().isoformat()[:19] + "+07:00",
        "total_chapters": len(clean_chaps),
        "chapters": clean_chaps
    }
    return entry

def main():
    print("Starting target comic sync for OniVerse.SBS...")
    scraped_entries = []
    for tid in TARGET_IDS:
        entry = fetch_single_series(tid)
        if entry:
            scraped_entries.append(entry)
            
    print(f"\nSuccessfully fetched {len(scraped_entries)} targeted comics!")
    
    if not scraped_entries:
        print("[ERROR] No comic entries fetched. Exiting.")
        return
        
    # Load existing series.json
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            existing = json.load(f)
    else:
        existing = []
        
    existing_map = {s.get("id"): s for s in existing}
    for entry in scraped_entries:
        existing_map[entry["id"]] = entry
        
    updated_all = list(existing_map.values())
    
    # Save back to scraped_data/series.json
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(updated_all, f, ensure_ascii=False, indent=2)
        
    print(f"\nUpdated {DATA_FILE} — Total catalog count: {len(updated_all)}")

if __name__ == "__main__":
    main()
