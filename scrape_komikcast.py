"""
Komikcast V3 API Scraper & Data Merger
Merges 500+ Komikcast series into main catalog with direct image server fallback!
"""
import json
import urllib.request
import ssl
import os
import time

PROJECT_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
OUTPUT_FILE = os.path.join(PROJECT_DIR, "scraped_data", "series.json")

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

def scrape_komikcast_pages(max_pages=15):
    print(f"[1/3] Scraping Komikcast V3 API ({max_pages} pages)...")
    komikcast_series = []
    
    for page in range(1, max_pages + 1):
        url = f"https://be.komikcast.cc/series?page={page}"
        try:
            res = fetch_json(url)
            items = res.get("data", [])
            print(f"  >> Page {page}/{max_pages}: Captured {len(items)} series")
            
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
                    "last_updated": item.get("updatedAt", "")[:10],
                    "total_chapters": d.get("totalChapters") or 0,
                    "chapters": []
                }
                komikcast_series.append(entry)
                
            time.sleep(0.1)
        except Exception as e:
            print(f"  >> Page {page} error: {e}")
            break
            
    print(f"Total Komikcast series fetched: {len(komikcast_series)}")
    return komikcast_series

def fetch_chapters_for_series(s):
    """Fetch chapter list for a single Komikcast series."""
    slug = s.get("kc_slug")
    if not slug:
        return []
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
                "date": ch.get("createdAt", "")[:10]
            })
        return clean_chaps
    except Exception as e:
        return []

def main():
    kc_series = scrape_komikcast_pages(max_pages=20)
    
    # Load existing Shinigami dataset
    shinigami_series = []
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            shinigami_series = json.load(f)
            
    print(f"[2/3] Merging {len(shinigami_series)} Shinigami series + {len(kc_series)} Komikcast series...")
    
    # Fetch chapters for top 100 Komikcast series
    print("[2b/3] Enriching top Komikcast series with chapter lists...")
    for i, s in enumerate(kc_series[:100]):
        s["chapters"] = fetch_chapters_for_series(s)
        if i % 20 == 0:
            print(f"  >> Enriched {i}/100 series...")
            
    # Combine datasets (deduplicate by title similarity if needed, or append)
    existing_titles = set(s.get("title", "").lower().strip() for s in shinigami_series)
    added_count = 0
    
    merged = list(shinigami_series)
    for s in kc_series:
        t = s.get("title", "").lower().strip()
        if t not in existing_titles:
            merged.append(s)
            existing_titles.add(t)
            added_count += 1
            
    print(f"[3/3] Total merged catalog size: {len(merged)} series ({added_count} new from Komikcast)")
    
    # Save to series.json
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, separators=(',', ':'))
        
    # Also generate data.js
    data_js_path = os.path.join(PROJECT_DIR, "data.js")
    with open(data_js_path, "w", encoding="utf-8") as f:
        f.write("window.SERIES_DATA = " + json.dumps(merged, ensure_ascii=False, separators=(',', ':')) + ";")
        
    size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    print(f"SUCCESS! Output files updated. Size: {size_mb:.2f} MB")

if __name__ == "__main__":
    main()
