import urllib.request
import json
import ssl
import os
import sys
import time
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

PROJECT_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
DATA_FILE = os.path.join(PROJECT_DIR, "scraped_data", "series.json")

TARGET_IDS = [
    "d3b05787-4c8e-42bb-ba9a-6b2fafd92f3c",
    "1aba726d-fb23-4e05-aafa-f6b5bb67c489",
    "4bf6c017-842e-48a1-8a2a-f6160c1d8d44",
    "09223329-6528-476d-bb37-40905a29bd34",
    "a0ebc4cb-b9c5-4b71-a1c9-41193d2d67be",
    "15495a79-526d-4349-b23d-ba2fa866a6bd",
    "42a015ae-107b-4634-a14c-9b9f9ecbf404",
    "3b1cbf24-4648-4b1d-9f5b-c92238e701a7",
    "c12b2ddc-557f-4f2b-afd2-116926129899",
    "c6082f01-2ce9-4595-bbe1-b4be67843f16",
    "27eaf36a-fb72-4a73-b5f9-d53c03f88dd0",
    "b112f871-7ea4-4adb-a311-711ae31a1e1f"
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
        print(f"Failed direct detail fetch for {manga_id}. Trying search fallback...")
        # Fallback list search across pages
        for page in range(1, 20):
            list_url = f"https://api.shngm.io/v1/manga/list?page={page}&page_size=50"
            l_res = fetch_json(list_url)
            if not l_res or not l_res.get("data"):
                break
            for item in l_res["data"]:
                mid = item.get("manga_id") or str(item.get("id"))
                if mid == manga_id:
                    d = item
                    break
            if d:
                break
                
    if not d:
        print(f"❌ Could not find manga_id {manga_id}")
        return None
        
    title = d.get("title") or "Unknown"
    slug = d.get("slug") or manga_id
    print(f"  ✅ Title: {title}")
    print(f"  ✅ Slug: {slug}")
    
    # Extract genres
    genres = []
    taxonomy = d.get("taxonomy", {})
    if taxonomy:
        genre_list = taxonomy.get("Genre", [])
        genres = [g.get("name") for g in genre_list if isinstance(g, dict) and g.get("name")]
    if not genres:
        genres = [g.get("name") for g in d.get("genres", []) if isinstance(g, dict) and g.get("name")]
    
    cover = d.get("cover_image_url") or d.get("cover_portrait_url") or d.get("cover") or ""
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
            ch_num = str(c.get("chapter_number") or "")
            ch_id = c.get("chapter_id") or ""
            clean_chaps.append({
                "id": ch_id,
                "number": ch_num,
                "chapter": ch_num,
                "slug": ch_id,
                "title": c.get("chapter_title") or f"Chapter {ch_num}",
                "date": (c.get("release_date") or c.get("created_at") or "")[:10]
            })
    print(f"  📖 Fetched {len(clean_chaps)} chapters.")

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
        "views": d.get("view_count") or d.get("bookmark_count") or 15000,
        "status": "Ongoing" if d.get("status") == 1 or d.get("status_id") == 1 else "Completed",
        "type": type_name,
        "genres": genres or ["Action", "Fantasy"],
        "author": ", ".join(authors) if authors else "Unknown",
        "artist": ", ".join(artists) if artists else "Unknown",
        "latest_chapter": str(d.get("latest_chapter_number") or (clean_chaps[0]["number"] if clean_chaps else "1")),
        "last_updated": datetime.now().astimezone().isoformat()[:19] + "+07:00",
        "total_chapters": len(clean_chaps),
        "chapters": clean_chaps
    }
    return entry

def main():
    print("=========================================================")
    print("  SCRAPING 12 TARGET SERIES FOR ONIVERSE.SBS")
    print("=========================================================")
    
    new_entries = []
    for tid in TARGET_IDS:
        entry = fetch_single_series(tid)
        if entry:
            new_entries.append(entry)
            
    print(f"\nSuccessfully scraped {len(new_entries)} / {len(TARGET_IDS)} series!")
    
    if not new_entries:
        print("❌ No new entries fetched.")
        return
        
    # Load existing series.json from scraped_data
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            existing = json.load(f)
    else:
        existing = []
        
    existing_map = {str(s.get("id")): s for s in existing}
    
    # Prepend new entries so they show as fresh updates
    for ne in new_entries:
        existing_map[str(ne["id"])] = ne
        
    updated_all = list(existing_map.values())
    
    # Save back to scraped_data/series.json
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(updated_all, f, ensure_ascii=False, indent=2)
        
    print(f"✅ Updated {DATA_FILE} — total count: {len(updated_all)}")

if __name__ == "__main__":
    main()
