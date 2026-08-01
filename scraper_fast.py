"""
OniVerse.SBS — Fast API Scraper for Shinigami
Mengambil SEMUA data komik + chapter dari API Shinigami tanpa browser.
"""

import os
import json
import time
import urllib.request
import urllib.error
import ssl

OUTPUT_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app\scraped_data"
API_BASE = "https://api.shngm.io/v1"

# Skip SSL verification (some corporate/ISP intercept)
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Referer": "https://g.shinigami.asia/",
    "Accept": "application/json",
}

def api_get(url, retries=3):
    """Fetch JSON from API with retries."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            print(f"  [RETRY {attempt+1}/{retries}] {url} -> {e}")
            time.sleep(1)
    return None

def scrape_all(max_pages=15):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("=" * 60)
    print("  OniVerse.SBS — Shinigami Full Data Scraper")
    print("=" * 60)
    
    # ---- Step 1: Fetch ALL manga from catalog ----
    print(f"\n[1/3] Fetching manga catalog (max {max_pages} pages)...")
    all_manga = []
    seen_ids = set()
    
    for page_num in range(1, max_pages + 1):
        url = f"{API_BASE}/manga/list?page={page_num}&page_size=30"
        data = api_get(url)
        
        if not data or data.get('retcode') != 0:
            print(f"  Page {page_num}: No data / error. Stopping catalog fetch.")
            break
        
        manga_list = data.get('data', [])
        if not manga_list:
            print(f"  Page {page_num}: Empty. End of catalog.")
            break
        
        new_count = 0
        for m in manga_list:
            mid = m.get('manga_id')
            if mid and mid not in seen_ids:
                seen_ids.add(mid)
                new_count += 1
                
                taxonomy = m.get('taxonomy', {})
                genres = [g.get('name') for g in taxonomy.get('Genre', []) if g.get('name')]
                formats = [f.get('name') for f in taxonomy.get('Format', []) if f.get('name')]
                authors = [a.get('name') for a in taxonomy.get('Author', []) if a.get('name')]
                artists = [a.get('name') for a in taxonomy.get('Artist', []) if a.get('name')]
                
                format_str = formats[0] if formats else ("Manhwa" if m.get('country_id') == "KR" else "Manga")
                
                manga_entry = {
                    "id": mid,
                    "slug": m.get('slug', ''),
                    "title": m.get('title', ''),
                    "alternative_title": m.get('alternative_title', ''),
                    "synopsis": m.get('description', ''),
                    "cover": m.get('cover_image_url', ''),
                    "thumbnail": m.get('cover_portrait_url', '') or m.get('cover_image_url', ''),
                    "rating": str(round(m.get('user_rate', 0.0), 1)),
                    "views": m.get('view_count', 0),
                    "bookmark_count": m.get('bookmark_count', 0),
                    "country": m.get('country_id', ''),
                    "release_year": m.get('release_year', ''),
                    "status": "Ongoing" if m.get('status') == 1 else "Completed",
                    "type": format_str,
                    "genres": genres,
                    "authors": authors,
                    "artists": artists,
                    "latest_chapter": m.get('latest_chapter_number', ''),
                    "last_updated": m.get('updated_at', ''),
                    "total_chapters": 0,
                    "chapters": []
                }
                all_manga.append(manga_entry)
        
        print(f"  Page {page_num}: +{new_count} new series (total: {len(all_manga)})")
        time.sleep(0.15)
    
    print(f"\n  >> Total unique series: {len(all_manga)}")
    
    # ---- Step 2: Fetch chapter list for EVERY series ----
    print(f"\n[2/3] Fetching chapter lists for {len(all_manga)} series...")
    
    for idx, item in enumerate(all_manga):
        mid = item['id']
        url = f"{API_BASE}/chapter/{mid}/list?page=1&page_size=500&sort_by=chapter_number&sort_order=desc"
        ch_data = api_get(url)
        
        if ch_data and ch_data.get('retcode') == 0:
            raw_chaps = ch_data.get('data', [])
            ch_list = []
            for c in raw_chaps:
                ch_list.append({
                    "chapter_id": c.get('chapter_id', ''),
                    "number": str(c.get('chapter_number', '')),
                    "chapter": str(c.get('chapter_number', '')),
                    "chapter_slug": c.get('chapter_id', ''),
                    "slug": c.get('chapter_id', ''),
                    "title": c.get('chapter_title', ''),
                    "date": c.get('release_date', '') or c.get('created_at', ''),
                    "released": c.get('release_date', '') or c.get('created_at', ''),
                })
            item['chapters'] = ch_list
            item['total_chapters'] = len(ch_list)
            
            if (idx + 1) % 10 == 0 or idx == 0:
                print(f"  [{idx+1}/{len(all_manga)}] {item['title']}: {len(ch_list)} chapters")
        else:
            print(f"  [{idx+1}/{len(all_manga)}] {item['title']}: FAILED to fetch chapters")
        
        time.sleep(0.1)
    
    # ---- Step 3: Fetch featured/slider data ----
    print(f"\n[3/3] Fetching featured slider data...")
    slider_data = api_get("https://slider.shinigami.io/v1/slider/explore-1")
    sliders = []
    if slider_data and slider_data.get('data'):
        sliders = slider_data['data']
        print(f"  >> {len(sliders)} featured items captured.")
    else:
        print("  >> No slider data (non-critical).")
    
    # ---- Save ----
    dataset = all_manga  # Save as flat array for direct use in app.js
    
    output_file = os.path.join(OUTPUT_DIR, "series.json")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(dataset, f, ensure_ascii=False, indent=1)
    
    file_size = os.path.getsize(output_file)
    print(f"\n{'=' * 60}")
    print(f"  DONE! Saved {len(all_manga)} series to series.json")
    print(f"  File size: {file_size / 1024 / 1024:.2f} MB")
    print(f"  Total chapters across all series: {sum(m['total_chapters'] for m in all_manga)}")
    print(f"{'=' * 60}")

if __name__ == '__main__':
    scrape_all(max_pages=15)
