import urllib.request
import json
import ssl
import os
import time

PROJECT_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
OUTPUT_FILE = os.path.join(PROJECT_DIR, "scraped_data", "series.json")
DATA_JS_FILE = os.path.join(PROJECT_DIR, "data.js")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Origin": "https://shinigami.id",
    "Referer": "https://shinigami.id/"
}

def fetch_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, context=ctx, timeout=10) as r:
        return json.loads(r.read().decode("utf-8"))

def scrape_all_shinigami(max_pages=20):
    print(f"[1/3] Scraping Shinigami Catalog ({max_pages} pages)...")
    shinigami_series = []
    
    for page in range(1, max_pages + 1):
        url = f"https://api.shngm.io/v1/manga/list?page={page}&page_size=50"
        try:
            res = fetch_json(url)
            items = res.get("data", [])
            print(f"  >> Shinigami Page {page}/{max_pages}: Fetched {len(items)} series")
            if not items:
                break
                
            for d in items:
                manga_id = d.get("manga_id") or str(d.get("id"))
                title = d.get("title") or "Unknown"
                slug = d.get("slug") or manga_id
                
                genres = [g.get("name") for g in d.get("genres", []) if isinstance(g, dict)]
                genres = [g for g in genres if g]
                
                cover = d.get("cover_image_url") or d.get("cover_portrait_url") or ""
                
                type_name = "Manhwa"
                cid = d.get("country_id")
                if cid == "JP":
                    type_name = "Manga"
                elif cid == "CN":
                    type_name = "Manhua"
                elif cid == "KR":
                    type_name = "Manhwa"
                    
                entry = {
                    "id": manga_id,
                    "source": "shinigami",
                    "slug": slug,
                    "title": title,
                    "alternative_title": d.get("alternative_title") or "",
                    "synopsis": d.get("description") or d.get("synopsis") or "",
                    "cover": cover,
                    "thumbnail": cover,
                    "rating": str(d.get("rating") or "9.2"),
                    "views": d.get("view_count") or d.get("bookmark_count") or 50000,
                    "status": "Ongoing" if d.get("status_id") == 1 else "Completed",
                    "type": type_name,
                    "genres": genres or ["Action", "Fantasy"],
                    "latest_chapter": str(d.get("latest_chapter_number") or d.get("total_chapter") or ""),
                    "last_updated": (d.get("updated_at") or d.get("created_at") or "")[:10],
                    "total_chapters": d.get("total_chapter") or 0,
                    "chapters": []
                }
                shinigami_series.append(entry)
            time.sleep(0.05)
        except Exception as e:
            print(f"  >> Shinigami Page {page} error: {e}")
            break
            
    print(f"Total Shinigami series fetched: {len(shinigami_series)}")
    return shinigami_series

def main():
    existing_catalog = []
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            existing_catalog = json.load(f)
            
    print(f"Loaded existing catalog: {len(existing_catalog)} series")
    
    # Scrape Shinigami
    shinigami_series = scrape_all_shinigami(max_pages=20)
    
    # Merge Shinigami into catalog
    title_map = {s.get("title", "").lower().strip(): i for i, s in enumerate(existing_catalog)}
    added = 0
    updated = 0
    
    for s in shinigami_series:
        t = s.get("title", "").lower().strip()
        if t in title_map:
            idx = title_map[t]
            existing_catalog[idx]["cover"] = s.get("cover") or existing_catalog[idx].get("cover")
            existing_catalog[idx]["last_updated"] = s.get("last_updated") or existing_catalog[idx].get("last_updated")
            existing_catalog[idx]["latest_chapter"] = s.get("latest_chapter") or existing_catalog[idx].get("latest_chapter")
            updated += 1
        else:
            existing_catalog.insert(0, s) # Put Shinigami latest at the top!
            title_map[t] = 0
            added += 1
            
    print(f"Merge Complete! {updated} series updated, {added} new Shinigami series added.")
    print(f"Total catalog size: {len(existing_catalog)} series.")
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(existing_catalog, f, ensure_ascii=False, separators=(',', ':'))
        
    with open(DATA_JS_FILE, "w", encoding="utf-8") as f:
        f.write("window.SERIES_DATA = " + json.dumps(existing_catalog, ensure_ascii=False, separators=(',', ':')) + ";")
        
    size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    print(f"SUCCESS! Output files updated. Size: {size_mb:.2f} MB")

if __name__ == "__main__":
    main()
