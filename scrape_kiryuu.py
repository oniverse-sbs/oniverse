import urllib.request
import json
import ssl
import os
import sys
import re
import html
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

PROJECT_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
DATA_FILE = os.path.join(PROJECT_DIR, "scraped_data", "series.json")

KIRYUU_URLS = [
    "https://kiryuuid.net/manga/one-piece",
    "https://kiryuuid.net/manga/how-can-you-pay-back-the-kindness-i-raised-with-obsession",
    "https://kiryuuid.net/manga/what-a-bountiful-harvest-demon-lord",
    "https://kiryuuid.net/novel/the-most-generous-master-ever"
]

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
}

def fetch_html(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, context=ctx, timeout=15) as r:
                return r.read().decode("utf-8", errors="ignore")
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(1)
            else:
                print(f"Error fetching {url}: {e}")
                return None

def parse_kiryuu_series(url):
    print(f"\n--- Scraping Kiryuu: {url} ---")
    html_text = fetch_html(url)
    if not html_text:
        return None
        
    # Check for Inertia data-page
    m = re.search(r'data-page="([^"]+)"', html_text)
    if not m:
        m = re.search(r"data-page='([^']+)'", html_text)
        
    page_data = None
    if m:
        try:
            raw_json = html.unescape(m.group(1))
            page_data = json.loads(raw_json)
        except Exception as e:
            print(f"Failed to parse data-page JSON: {e}")
            
    slug = url.strip("/").split("/")[-1]
    is_novel = "/novel/" in url
    
    title = ""
    synopsis = ""
    cover = ""
    rating = "8.5"
    genres = []
    author = "Unknown"
    artist = "Unknown"
    status = "Ongoing"
    type_name = "Light Novel" if is_novel else "Manga"
    chapters = []
    
    if page_data and isinstance(page_data.get("props"), dict):
        props = page_data["props"]
        manga = props.get("manga") or props.get("novel") or props.get("series") or props.get("data") or {}

        if isinstance(manga, dict):
            title = manga.get("title") or manga.get("name") or title
            slug = manga.get("slug") or slug
            synopsis = manga.get("synopsis") or manga.get("description") or synopsis
            cover = manga.get("cover_url") or manga.get("poster_url") or manga.get("cover") or manga.get("image") or cover
            rating = str(manga.get("rating") or manga.get("score") or rating)
            status = "Ongoing" if str(manga.get("status", "")).lower() in ["ongoing", "1", "publishing"] else "Completed"
            
            # Type
            t_str = str(manga.get("type") or manga.get("format") or "").upper()
            if "MANHWA" in t_str:
                type_name = "Manhwa"
            elif "MANHUA" in t_str:
                type_name = "Manhua"
            elif "MANGA" in t_str:
                type_name = "Manga"
            elif is_novel or "NOVEL" in t_str:
                type_name = "Novel"
                
            # Genres
            raw_g = manga.get("genres") or []
            if isinstance(raw_g, list):
                for g in raw_g:
                    if isinstance(g, dict) and g.get("name"):
                        genres.append(g.get("name"))
                    elif isinstance(g, str):
                        genres.append(g)

            # Authors / Artists
            if manga.get("author"):
                author = manga.get("author") if isinstance(manga.get("author"), str) else str(manga.get("author"))
            if manga.get("artist"):
                artist = manga.get("artist") if isinstance(manga.get("artist"), str) else str(manga.get("artist"))

            # Chapters
            raw_chaps = manga.get("chapters") or props.get("chapters") or []
            if isinstance(raw_chaps, list):
                for c in raw_chaps:
                    if isinstance(c, dict):
                        ch_num = str(c.get("number") or c.get("chapter_number") or c.get("title") or "")
                        ch_num = re.sub(r'^[Cc]hapter\s*', '', ch_num).strip()
                        c_slug = c.get("slug") or c.get("id") or f"ch_{ch_num}"
                        c_date = (c.get("created_at") or c.get("release_date") or c.get("date") or "")[:10]
                        chapters.append({
                            "id": str(c_slug),
                            "number": ch_num,
                            "chapter": ch_num,
                            "slug": str(c_slug),
                            "title": c.get("title") or f"Chapter {ch_num}",
                            "date": c_date
                        })

    # Fallbacks via HTML regex if props wasn't populated fully
    if not title:
        tm = re.search(r'<h1[^>]*>([^<]+)</h1>', html_text, re.IGNORECASE)
        title = tm.group(1).strip() if tm else slug.replace("-", " ").title()

    if not cover:
        cm = re.search(r'<img[^>]+src=["\']([^"\']+)["\'][^>]+alt=["\'][^"\']*cover[^"\']*["\']', html_text, re.IGNORECASE)
        if not cm:
            cm = re.search(r'og:image" content="([^"]+)"', html_text)
        if cm:
            cover = cm.group(1)

    if not synopsis:
        sm = re.search(r'og:description" content="([^"]+)"', html_text)
        if sm:
            synopsis = sm.group(1)

    if not genres:
        genres = ["Action", "Adventure"] if "one-piece" in slug else ["Fantasy", "Romance"]

    print(f"  Title: {title}")
    print(f"  Slug: {slug}")
    print(f"  Type: {type_name}")
    print(f"  Chapters: {len(chapters)}")
    
    manga_id = f"kiryuu_{slug}"
    
    entry = {
        "id": manga_id,
        "source": "kiryuu",
        "slug": slug,
        "title": title,
        "alternative_title": title,
        "synopsis": synopsis or f"Baca komik {title} Bahasa Indonesia online gratis di OniVerse.SBS",
        "cover": cover,
        "thumbnail": cover,
        "rating": rating,
        "views": 25000,
        "status": status,
        "type": type_name,
        "genres": list(set(genres)) or ["Action", "Fantasy"],
        "author": author,
        "artist": artist,
        "latest_chapter": str(chapters[0]["number"]) if chapters else "1",
        "last_updated": datetime.now().astimezone().isoformat()[:19] + "+07:00",
        "total_chapters": len(chapters) or 1,
        "chapters": chapters
    }
    return entry

def main():
    print("=========================================================")
    print("  SCRAPING KIRYUU.ID TARGET SERIES FOR ONIVERSE.SBS")
    print("=========================================================")
    
    new_entries = []
    for url in KIRYUU_URLS:
        entry = parse_kiryuu_series(url)
        if entry:
            new_entries.append(entry)
            
    print(f"\nSuccessfully scraped {len(new_entries)} / {len(KIRYUU_URLS)} Kiryuu series!")
    
    if not new_entries:
        print("No new entries fetched.")
        return
        
    # Load existing series.json from scraped_data
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            existing = json.load(f)
    else:
        existing = []
        
    existing_map = {str(s.get("id")): s for s in existing}
    
    # Prepend new entries
    for ne in new_entries:
        existing_map[str(ne["id"])] = ne
        
    updated_all = list(existing_map.values())
    
    # Save back to scraped_data/series.json
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(updated_all, f, ensure_ascii=False, indent=2)
        
    print(f"Updated {DATA_FILE} — total count: {len(updated_all)}")

if __name__ == "__main__":
    main()
