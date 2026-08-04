import urllib.request
import json
import ssl
import os
import time

PROJECT_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
DATA_FILE = os.path.join(PROJECT_DIR, "scraped_data", "series.json")

TARGET_IDS = [
    "56c552be-3ba1-41b8-975e-d77fd4e1bc2c",
    "4ef0b99b-20d3-4da8-bb73-9c3768f32699",
    "11ecc266-ead4-4728-b21a-5ac34afb140c"
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
                print(f"Error fetching {url}: {e}")
                return None

def fetch_single_series(manga_id):
    print(f"\n--- Fetching series: {manga_id} ---")
    
    # 1. Fetch Detail
    detail_url = f"https://api.shngm.io/v1/manga/detail/{manga_id}"
    res = fetch_json(detail_url)
    d = None
    if res and res.get("retcode") == 0 and res.get("data"):
        d = res.get("data")
    else:
        print(f"Failed to fetch detail directly for {manga_id}. Trying list search...")
        # Fallback list search across pages
        for page in range(1, 10):
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
        print(f"Could not find manga_id {manga_id}")
        return None
        
    title = d.get("title") or "Unknown"
    slug = d.get("slug") or manga_id
    print(f"  Title: {title}")
    print(f"  Slug: {slug}")
    
    # Extract genres
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
        rating = "8.5"
        
    # 2. Fetch Chapters
    ch_url = f"https://api.shngm.io/v1/chapter/{manga_id}/list?page=1&page_size=500&sort_by=chapter_number&sort_order=desc"
    ch_res = fetch_json(ch_url)
    clean_chaps = []
    if ch_res and ch_res.get("retcode") == 0 and isinstance(ch_res.get("data"), list):
        for c in ch_res["data"]:
            clean_chaps.append({
                "number": str(c.get("chapter_number") or ""),
                "chapter": str(c.get("chapter_number") or ""),
                "slug": c.get("chapter_id") or "",
                "date": (c.get("release_date") or c.get("created_at") or "")[:10]
            })
    print(f"  Fetched {len(clean_chaps)} chapters.")

    entry = {
        "id": manga_id,
        "source": "shinigami",
        "slug": slug,
        "title": title,
        "alternative_title": d.get("alternative_title") or "",
        "synopsis": d.get("description") or d.get("synopsis") or "",
        "cover": cover,
        "thumbnail": cover,
        "rating": rating,
        "views": d.get("view_count") or d.get("bookmark_count") or 5000,
        "status": "Ongoing" if d.get("status") == 1 or d.get("status_id") == 1 else "Completed",
        "type": type_name,
        "genres": genres or ["Action", "Fantasy"],
        "author": ", ".join(authors) if authors else "",
        "artist": ", ".join(artists) if artists else "",
        "latest_chapter": str(d.get("latest_chapter_number") or (clean_chaps[0]["number"] if clean_chaps else "")),
        "last_updated": "2026-08-04T11:00:00+07:00",
        "total_chapters": len(clean_chaps),
        "chapters": clean_chaps
    }
    return entry

def main():
    print("Scraping targeted series...")
    new_entries = []
    for tid in TARGET_IDS:
        entry = fetch_single_series(tid)
        if entry:
            new_entries.append(entry)
            
    print(f"\nSuccessfully scraped {len(new_entries)} series!")
    
    if not new_entries:
        print("No new entries fetched.")
        return
        
    # Load existing series.json
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        existing = json.load(f)
        
    existing_map = {s.get("id"): s for s in existing}
    for ne in new_entries:
        existing_map[ne["id"]] = ne
        
    updated_all = list(existing_map.values())
    
    # Save back to scraped_data/series.json
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(updated_all, f, ensure_ascii=False, indent=2)
        
    print(f"Updated {DATA_FILE} — total count: {len(updated_all)}")

if __name__ == "__main__":
    main()
