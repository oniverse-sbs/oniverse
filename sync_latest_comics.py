"""
Master Sync & Scraper Script for OniVerse
Fetches absolute latest series and chapters from Shinigami & Komikcast V3 APIs.
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

def scrape_komikcast_latest(max_pages=25):
    print(f"[1/3] Scraping Komikcast V3 Latest Updates ({max_pages} pages)...")
    kc_series = []
    
    for page in range(1, max_pages + 1):
        url = f"https://be.komikcast.cc/series?page={page}"
        try:
            res = fetch_json(url)
            items = res.get("data", [])
            print(f"  >> Komikcast Page {page}/{max_pages}: Fetched {len(items)} series")
            
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
            time.sleep(0.05)
        except Exception as e:
            print(f"  >> Komikcast Page {page} error: {e}")
            break
            
    print(f"Total Komikcast series fetched: {len(kc_series)}")
    return kc_series

def fetch_chapters_for_series(slug):
    url = f"https://be.komikcast.cc/series/{slug}/chapters"
    try:
        res = fetch_json(url)
        items = res.get("data", [])
        clean_chaps = []
        for ch in items[:50]:
            cd = ch.get("data", {})
            idx = cd.get("index") or ch.get("id")
            clean_chaps.append({
                "number": str(idx),
                "chapter": str(idx),
                "slug": f"kc_ch_{slug}_{idx}",
                "kc_index": idx,
                "kc_series_slug": slug,
                "date": (ch.get("createdAt") or "")[:10]
            })
        return clean_chaps
    except Exception as e:
        return []

def main():
    existing_catalog = []
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            existing_catalog = json.load(f)
            
    print(f"Loaded existing catalog: {len(existing_catalog)} series")
    
    # 1. Fetch latest Komikcast
    kc_series = scrape_komikcast_latest(max_pages=25)
    
    # 2. Enrich top 120 Komikcast series with full chapter lists
    print("[2/3] Enriching top 120 Komikcast series with chapter lists...")
    for i, s in enumerate(kc_series[:120]):
        s["chapters"] = fetch_chapters_for_series(s["kc_slug"])
        if i % 30 == 0:
            print(f"  >> Enriched {i}/120 series...")
            
    # 3. Merge with existing catalog
    print("[3/3] Merging datasets...")
    title_map = {s.get("title", "").lower().strip(): i for i, s in enumerate(existing_catalog)}
    
    updated_count = 0
    added_count = 0
    
    for new_s in kc_series:
        t = new_s.get("title", "").lower().strip()
        if t in title_map:
            # Update existing entry with newest chapter info
            idx = title_map[t]
            existing_catalog[idx]["last_updated"] = new_s.get("last_updated") or existing_catalog[idx].get("last_updated")
            existing_catalog[idx]["latest_chapter"] = new_s.get("latest_chapter") or existing_catalog[idx].get("latest_chapter")
            if new_s.get("chapters"):
                existing_catalog[idx]["chapters"] = new_s["chapters"]
            updated_count += 1
        else:
            existing_catalog.append(new_s)
            title_map[t] = len(existing_catalog) - 1
            added_count += 1
            
    # Sort existing_catalog by latest update date descending
    def get_sort_key(s):
        val = s.get("last_updated") or s.get("updated_at") or ""
        return str(val)
        
    existing_catalog.sort(key=get_sort_key, reverse=True)
    
    print(f"Merge Complete! {updated_count} series updated, {added_count} new series added.")
    print(f"Total catalog size: {len(existing_catalog)} series.")
    
    # Save to scraped_data/series.json and root series.json
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(existing_catalog, f, ensure_ascii=False, separators=(',', ':'))
        
    ROOT_SERIES_FILE = os.path.join(PROJECT_DIR, "series.json")
    with open(ROOT_SERIES_FILE, "w", encoding="utf-8") as f:
        json.dump(existing_catalog, f, ensure_ascii=False, separators=(',', ':'))
        
    # Save to data.js
    with open(DATA_JS_FILE, "w", encoding="utf-8") as f:
        f.write("window.SERIES_DATA = " + json.dumps(existing_catalog, ensure_ascii=False, separators=(',', ':')) + ";")
        
    size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    print(f"SUCCESS! Output files updated. Size: {size_mb:.2f} MB")

if __name__ == "__main__":
    main()
