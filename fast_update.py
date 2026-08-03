"""
Fast Update Script: Fetches absolute latest released comics & chapters from Komikcast & Shinigami APIs
with exact ISO timestamps and updates data.js + series.json.
"""
import json
import urllib.request
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
    "Origin": "https://v3.komikcast.fit",
    "Referer": "https://v3.komikcast.fit/"
}

def fetch_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, context=ctx, timeout=10) as r:
        return json.loads(r.read().decode("utf-8"))

def fetch_latest_komikcast(max_pages=15):
    print(f"[1/3] Fetching Komikcast latest ({max_pages} pages)...")
    kc_series = []
    for page in range(1, max_pages + 1):
        url = f"https://be.komikcast.cc/series?page={page}"
        try:
            res = fetch_json(url)
            items = res.get("data", [])
            for item in items:
                d = item.get("data", {})
                slug = d.get("slug") or str(item.get("id"))
                title = d.get("title") or "Unknown"
                
                genres = [g.get("data", {}).get("name") for g in d.get("genres", []) if isinstance(g, dict)]
                genres = [g for g in genres if g]
                
                cover = d.get("coverImage") or d.get("backgroundImage") or ""
                if cover and cover.startswith("//"):
                    cover = "https:" + cover
                    
                entry = {
                    "id": f"kc_{slug}",
                    "kc_slug": slug,
                    "source": "komikcast",
                    "slug": f"kc-{slug}",
                    "title": title,
                    "alternative_title": d.get("nativeTitle") or d.get("author") or "",
                    "synopsis": d.get("synopsis") or "",
                    "cover": cover,
                    "thumbnail": cover,
                    "rating": str(d.get("rating") or "8.5"),
                    "views": d.get("totalChapters") or 100,
                    "status": "Ongoing" if d.get("status") == "ongoing" else "Completed",
                    "type": (d.get("format") or "Manhwa").capitalize(),
                    "genres": genres or ["Action", "Fantasy"],
                    "latest_chapter": str(d.get("totalChapters") or ""),
                    "last_updated": item.get("updatedAt") or item.get("createdAt") or "",
                    "total_chapters": d.get("totalChapters") or 0,
                    "chapters": []
                }
                kc_series.append(entry)
            time.sleep(0.02)
        except Exception as e:
            print(f"Error on KC page {page}: {e}")
            break
    print(f"Fetched {len(kc_series)} Komikcast series.")
    return kc_series

def main():
    existing_catalog = []
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            existing_catalog = json.load(f)
            
    print(f"Existing catalog: {len(existing_catalog)} series")
    
    # 1. Fetch latest Komikcast
    kc_series = fetch_latest_komikcast(max_pages=15)
    
    # 2. Merge into existing_catalog
    title_map = {s.get("title", "").lower().strip(): i for i, s in enumerate(existing_catalog)}
    
    for new_s in kc_series:
        t = new_s.get("title", "").lower().strip()
        if t in title_map:
            idx = title_map[t]
            existing_catalog[idx]["last_updated"] = new_s.get("last_updated") or existing_catalog[idx].get("last_updated")
            existing_catalog[idx]["latest_chapter"] = new_s.get("latest_chapter") or existing_catalog[idx].get("latest_chapter")
            if new_s.get("cover"):
                existing_catalog[idx]["cover"] = new_s["cover"]
        else:
            existing_catalog.append(new_s)
            title_map[t] = len(existing_catalog) - 1
            
    # Sort entire catalog by last_updated ISO string descending
    def get_sort_key(s):
        val = s.get("last_updated") or s.get("updated_at") or s.get("latest_chapter_time") or ""
        return str(val)
        
    existing_catalog.sort(key=get_sort_key, reverse=True)
    
    print(f"Sorted total catalog: {len(existing_catalog)} series. Top item: {existing_catalog[0].get('title')} ({existing_catalog[0].get('last_updated')})")
    
    # Save to series.json
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(existing_catalog, f, ensure_ascii=False, separators=(',', ':'))
        
    # Save to data.js
    with open(DATA_JS_FILE, "w", encoding="utf-8") as f:
        f.write("window.SERIES_DATA = " + json.dumps(existing_catalog, ensure_ascii=False, separators=(',', ':')) + ";")
        
    print("SUCCESSFULLY updated series.json & data.js!")

if __name__ == "__main__":
    main()
