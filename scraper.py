import os
import json
import time
import sys
from playwright.sync_api import sync_playwright

OUTPUT_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app\scraped_data"

def run_scraper(pages_to_scrape=4, chapters_per_manga=10):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("=== Starting Shinigami API Data Scraper ===")
    print(f"Target Pages: {pages_to_scrape} | Max Chapters per Manga: {chapters_per_manga}")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--disable-blink-features=AutomationControlled'])
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        )
        page = context.new_page()
        
        print("\n[1/3] Initializing session & Cloudflare check...")
        page.goto('https://g.shinigami.asia/', timeout=60000)
        page.wait_for_timeout(4000)
        
        # Fetch Slider / Featured data
        print("\n[2/3] Fetching featured slider items...")
        sliders = page.evaluate("""
            async () => {
                try {
                    const r = await fetch('https://slider.shinigami.io/v1/slider/explore-1');
                    const data = await r.json();
                    return data.data || [];
                } catch(e) {
                    return [];
                }
            }
        """)
        print(f"-> Captured {len(sliders)} featured items.")
        
        # Fetch Manga Catalog
        print("\n[3/3] Fetching manga catalog pages...")
        all_manga = []
        seen_ids = set()
        
        for page_num in range(1, pages_to_scrape + 1):
            print(f"  -> Fetching catalog page {page_num}/{pages_to_scrape}...")
            res = page.evaluate(f"""
                async () => {{
                    try {{
                        const r = await fetch('https://api.shngm.io/v1/manga/list?page={page_num}&page_size=30');
                        return await r.json();
                    }} catch(e) {{
                        return null;
                    }}
                }}
            """)
            
            if res and res.get('retcode') == 0:
                manga_list = res.get('data', [])
                print(f"     Received {len(manga_list)} items.")
                for m in manga_list:
                    mid = m.get('manga_id')
                    if mid and mid not in seen_ids:
                        seen_ids.add(mid)
                        
                        # Process taxonomy
                        taxonomy = m.get('taxonomy', {})
                        genres = [g.get('name') for g in taxonomy.get('Genre', [])]
                        formats = [f.get('name') for f in taxonomy.get('Format', [])]
                        authors = [a.get('name') for a in taxonomy.get('Author', [])]
                        artists = [a.get('name') for a in taxonomy.get('Artist', [])]
                        
                        # Type: Manhwa, Manga, Manhua, or Format
                        format_str = formats[0] if formats else ("Manhwa" if m.get('country_id') == "KR" else "Manga")
                        
                        manga_entry = {
                            "id": mid,
                            "title": m.get('title'),
                            "alternative_title": m.get('alternative_title'),
                            "description": m.get('description'),
                            "cover_image_url": m.get('cover_image_url'),
                            "cover_portrait_url": m.get('cover_portrait_url'),
                            "user_rate": m.get('user_rate', 0.0),
                            "view_count": m.get('view_count', 0),
                            "bookmark_count": m.get('bookmark_count', 0),
                            "country_id": m.get('country_id'),
                            "release_year": m.get('release_year'),
                            "status": "Ongoing" if m.get('status') == 1 else "Completed",
                            "type": format_str,
                            "genres": genres,
                            "authors": authors,
                            "artists": artists,
                            "latest_chapter_number": m.get('latest_chapter_number'),
                            "latest_chapter_time": m.get('latest_chapter_time'),
                            "updated_at": m.get('updated_at'),
                            "chapters": []
                        }
                        all_manga.append(manga_entry)
            else:
                print(f"     Failed to fetch page {page_num}")
            page.wait_for_timeout(300)
            
        print(f"\nTotal unique series extracted: {len(all_manga)}")
        
        # Fetch chapter lists for top series
        print("\nFetching chapter lists for series catalog...")
        for idx, item in enumerate(all_manga[:30]):
            mid = item['id']
            ch_res = page.evaluate(f"""
                async () => {{
                    try {{
                        const r = await fetch('https://api.shngm.io/v1/chapter/{mid}/list?page=1&page_size=20&sort_by=chapter_number&sort_order=desc');
                        return await r.json();
                    }} catch(e) {{
                        return null;
                    }}
                }}
            """)
            if ch_res and ch_res.get('retcode') == 0:
                raw_chaps = ch_res.get('data', [])
                ch_list = []
                for c in raw_chaps[:chapters_per_manga]:
                    ch_list.append({
                        "chapter_id": c.get('chapter_id'),
                        "chapter_number": c.get('chapter_number'),
                        "chapter_title": c.get('chapter_title', ''),
                        "created_at": c.get('created_at'),
                        "release_date": c.get('release_date')
                    })
                item['chapters'] = ch_list
                print(f"  [{idx+1}/30] {item['title']}: {len(ch_list)} chapters recorded.")
            page.wait_for_timeout(100)
            
        dataset = {
            "metadata": {
                "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "total_series": len(all_manga),
                "source": "https://g.shinigami.asia/"
            },
            "featured_sliders": sliders,
            "series": all_manga
        }
        
        output_file = os.path.join(OUTPUT_DIR, "series.json")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(dataset, f, ensure_ascii=False, indent=2)
            
        print(f"\n[DONE] Scraping complete! Dataset saved to: {output_file}")
        browser.close()

if __name__ == '__main__':
    run_scraper(pages_to_scrape=5, chapters_per_manga=10)
