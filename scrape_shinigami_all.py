"""
Shinigami Full Scraper — scrape ALL manga/manhwa/manhua from api.shngm.io
and fetch chapter lists for each series. Outputs to scraped_data/series.json and data.js.
"""
import urllib.request
import json
import ssl
import os
import time
import sys

PROJECT_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
OUTPUT_FILE = os.path.join(PROJECT_DIR, "scraped_data", "series.json")
DATA_JS_FILE = os.path.join(PROJECT_DIR, "data.js")
SERIES_JSON = os.path.join(PROJECT_DIR, "series.json")

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
                raise e

def scrape_all_series():
    """Scrape ALL series from Shinigami API (auto-pagination until empty)"""
    print("=" * 60)
    print("  SHINIGAMI FULL SCRAPER - Fetching ALL series")
    print("=" * 60)
    
    all_series = []
    seen_ids = set()
    page = 1
    page_size = 50
    
    while True:
        url = f"https://api.shngm.io/v1/manga/list?page={page}&page_size={page_size}"
        try:
            res = fetch_json(url)
            items = res.get("data", [])
            
            if not items:
                print(f"  >> Page {page}: Empty — all pages scraped!")
                break
            
            new_count = 0
            for d in items:
                manga_id = d.get("manga_id") or str(d.get("id", ""))
                if not manga_id or manga_id in seen_ids:
                    continue
                seen_ids.add(manga_id)
                
                title = d.get("title") or "Unknown"
                slug = d.get("slug") or manga_id
                
                # Extract genres from taxonomy
                genres = []
                taxonomy = d.get("taxonomy", {})
                if taxonomy:
                    genre_list = taxonomy.get("Genre", [])
                    genres = [g.get("name") for g in genre_list if isinstance(g, dict) and g.get("name")]
                if not genres:
                    genres = [g.get("name") for g in d.get("genres", []) if isinstance(g, dict) and g.get("name")]
                
                # Determine type from country
                cover = d.get("cover_image_url") or d.get("cover_portrait_url") or ""
                type_name = "Manhwa"
                cid = d.get("country_id")
                if cid == "JP":
                    type_name = "Manga"
                elif cid == "CN":
                    type_name = "Manhua"
                elif cid == "KR":
                    type_name = "Manhwa"
                
                # Formats from taxonomy
                formats = []
                if taxonomy:
                    fmt_list = taxonomy.get("Format", [])
                    formats = [f.get("name") for f in fmt_list if isinstance(f, dict) and f.get("name")]
                if formats:
                    type_name = formats[0]
                
                # Authors/Artists
                authors = []
                artists = []
                if taxonomy:
                    authors = [a.get("name") for a in taxonomy.get("Author", []) if isinstance(a, dict) and a.get("name")]
                    artists = [a.get("name") for a in taxonomy.get("Artist", []) if isinstance(a, dict) and a.get("name")]
                
                # Rating
                rating = d.get("user_rate") or d.get("rating") or 0
                if isinstance(rating, (int, float)) and rating > 0:
                    rating = str(round(rating, 1))
                else:
                    rating = "N/A"
                
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
                    "views": d.get("view_count") or d.get("bookmark_count") or 0,
                    "status": "Ongoing" if d.get("status") == 1 or d.get("status_id") == 1 else "Completed",
                    "type": type_name,
                    "genres": genres or ["Action", "Fantasy"],
                    "author": ", ".join(authors) if authors else "",
                    "artist": ", ".join(artists) if artists else "",
                    "latest_chapter": str(d.get("latest_chapter_number") or d.get("total_chapter") or ""),
                    "last_updated": (d.get("updated_at") or d.get("latest_chapter_time") or d.get("created_at") or "")[:19],
                    "total_chapters": d.get("total_chapter") or 0,
                    "chapters": []
                }
                all_series.append(entry)
                new_count += 1
            
            print(f"  >> Page {page}: Fetched {len(items)} items ({new_count} new)")
            page += 1
            time.sleep(0.05)
            
        except Exception as e:
            print(f"  >> Page {page} error: {e}")
            break
    
    print(f"\n  Total unique series scraped: {len(all_series)}")
    return all_series


def fetch_chapters_for_series(series_list, max_chapters_per=30):
    """Fetch chapter lists for each series"""
    total = len(series_list)
    print(f"\n{'=' * 60}")
    print(f"  Fetching chapters for {total} series (max {max_chapters_per}/series)")
    print(f"{'=' * 60}")
    
    success = 0
    for idx, s in enumerate(series_list):
        manga_id = s["id"]
        try:
            url = f"https://api.shngm.io/v1/chapter/{manga_id}/list?page=1&page_size={max_chapters_per}&sort_by=chapter_number&sort_order=desc"
            res = fetch_json(url)
            
            if res and res.get("retcode") == 0:
                raw_chaps = res.get("data", [])
                ch_list = []
                for c in raw_chaps:
                    ch_list.append({
                        "chapter_id": c.get("chapter_id"),
                        "number": str(c.get("chapter_number", "")),
                        "chapter": str(c.get("chapter_number", "")),
                        "title": c.get("chapter_title") or "",
                        "date": (c.get("release_date") or c.get("created_at") or "")[:10],
                        "released": (c.get("release_date") or c.get("created_at") or "")[:10],
                    })
                s["chapters"] = ch_list
                s["total_chapters"] = max(s.get("total_chapters", 0), len(ch_list))
                if ch_list:
                    s["latest_chapter"] = ch_list[0].get("number", s.get("latest_chapter", ""))
                success += 1
                
            if (idx + 1) % 50 == 0 or idx == total - 1:
                print(f"  >> Progress: {idx + 1}/{total} series processed ({success} with chapters)")
            
            time.sleep(0.02)
        except Exception as e:
            if (idx + 1) % 100 == 0:
                print(f"  >> {idx + 1}/{total} — Error for {s.get('title', '?')}: {e}")
            continue
    
    print(f"  >> Chapter fetch complete: {success}/{total} series have chapters")


def save_output(all_series):
    """Save to series.json and data.js"""
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    # Sort by last_updated (newest first)
    all_series.sort(key=lambda s: s.get("last_updated", ""), reverse=True)
    
    # Save scraped_data/series.json
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_series, f, ensure_ascii=False, separators=(',', ':'))
    
    # Save series.json (root)
    with open(SERIES_JSON, "w", encoding="utf-8") as f:
        json.dump(all_series, f, ensure_ascii=False, separators=(',', ':'))
    
    # Save data.js (for browser)
    with open(DATA_JS_FILE, "w", encoding="utf-8") as f:
        f.write("window.SERIES_DATA = " + json.dumps(all_series, ensure_ascii=False, separators=(',', ':')) + ";")
    
    size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    size_js_mb = os.path.getsize(DATA_JS_FILE) / (1024 * 1024)
    print(f"\n{'=' * 60}")
    print(f"  OUTPUT SAVED SUCCESSFULLY!")
    print(f"  - scraped_data/series.json: {size_mb:.2f} MB")
    print(f"  - series.json: {size_mb:.2f} MB")
    print(f"  - data.js: {size_js_mb:.2f} MB")
    print(f"  - Total series: {len(all_series)}")
    print(f"{'=' * 60}")


def main():
    # 1. Scrape all series
    all_series = scrape_all_series()
    
    if not all_series:
        print("ERROR: No series scraped! Aborting.")
        sys.exit(1)
    
    # 2. Fetch chapters
    fetch_chapters = "--no-chapters" not in sys.argv
    if fetch_chapters:
        fetch_chapters_for_series(all_series, max_chapters_per=30)
    else:
        print("\nSkipping chapter fetch (--no-chapters flag)")
    
    # 3. Save
    save_output(all_series)
    
    print(f"\nDONE! {len(all_series)} Shinigami series scraped and saved.")


if __name__ == "__main__":
    main()
