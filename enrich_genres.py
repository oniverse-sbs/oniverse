"""
OniVerse Genre Enrichment v2
- Komikcast: fetch /genres endpoint for ID->name map, then map genreIds from list API
- Shinigami: extract from taxonomy.Genre in list API
"""
import json, urllib.request, ssl, os, sys, time

sys.stdout.reconfigure(encoding='utf-8')

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
SCRAPED_FILE = os.path.join(PROJECT_DIR, "scraped_data", "series.json")
ROOT_FILE = os.path.join(PROJECT_DIR, "series.json")
DATA_JS_FILE = os.path.join(PROJECT_DIR, "data.js")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

def fetch(url, extra=None):
    h = {**UA}
    if extra: h.update(extra)
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, context=ctx, timeout=15) as r:
        return json.loads(r.read().decode("utf-8"))

def load_catalog():
    for p in [SCRAPED_FILE, ROOT_FILE]:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
    return []

def save_catalog(catalog):
    for p in [SCRAPED_FILE, ROOT_FILE]:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(catalog, f, ensure_ascii=False, separators=(',', ':'))
    with open(DATA_JS_FILE, "w", encoding="utf-8") as f:
        f.write("window.SERIES_DATA = " + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ";")

# =========================================================================
# KOMIKCAST: Build genreId -> name map, then slug -> genres
# =========================================================================
def build_kc_genre_map():
    print("=" * 60)
    print("[KC] Step 1: Fetching genre ID -> name mapping...")
    kc_h = {"Origin": "https://v3.komikcast.fit", "Referer": "https://v3.komikcast.fit/"}
    
    id_to_name = {}
    try:
        data = fetch("https://be.komikcast.cc/genres", kc_h)
        for g in data.get("data", []):
            gid = g.get("id")
            name = g.get("data", {}).get("name", "")
            if gid and name:
                id_to_name[gid] = name
        print(f"  Got {len(id_to_name)} genre IDs: {list(id_to_name.values())[:15]}...")
    except Exception as e:
        print(f"  Error fetching genres: {e}")
        return {}

    print(f"\n[KC] Step 2: Mapping genreIds to names for all series...")
    slug_to_genres = {}
    
    for page in range(1, 50):
        try:
            data = fetch(f"https://be.komikcast.cc/series?page={page}", kc_h)
            items = data.get("data", [])
            if not items:
                break
            for item in items:
                d = item.get("data", {})
                slug = d.get("slug", "")
                genre_ids = d.get("genreIds", [])
                genres = [id_to_name[gid] for gid in genre_ids if gid in id_to_name]
                # Filter out meta-genres
                genres = [g for g in genres if g not in ("Webtoons", "Full Color", "Long Strip", "4-Koma", "Latest")]
                if genres and slug:
                    slug_to_genres[f"kc-{slug}"] = genres
                    slug_to_genres[slug] = genres
            if page % 10 == 0:
                print(f"  Page {page}: {len(slug_to_genres)} mapped")
            time.sleep(0.05)
        except Exception as e:
            print(f"  Page {page} error: {e}")
            break

    print(f"  Total KC genre mappings: {len(slug_to_genres)}")
    return slug_to_genres

# =========================================================================
# SHINIGAMI: Extract from taxonomy.Genre in list API
# =========================================================================
def build_shngm_genre_map():
    print("\n" + "=" * 60)
    print("[SHNGM] Fetching genres from taxonomy field...")
    sh_h = {"Origin": "https://shinigami.id", "Referer": "https://shinigami.id/"}
    
    id_to_genres = {}
    title_to_genres = {}
    
    for page in range(1, 50):
        try:
            data = fetch(f"https://api.shngm.io/v1/manga/list?page={page}&page_size=50", sh_h)
            items = data.get("data", [])
            if not items:
                break
            for item in items:
                mid = str(item.get("manga_id") or item.get("id") or "")
                title = (item.get("title") or "").strip()
                tax = item.get("taxonomy") or {}
                
                genres = []
                for g in tax.get("Genre", []):
                    name = g.get("name", "")
                    if name:
                        genres.append(name)
                
                if genres and mid:
                    id_to_genres[mid] = genres
                if genres and title:
                    title_to_genres[title.lower()] = genres
                    
            if page % 5 == 0:
                print(f"  Page {page}: {len(id_to_genres)} mapped")
            time.sleep(0.05)
        except Exception as e:
            print(f"  Page {page} error: {e}")
            break
    
    # Merge
    result = {}
    result.update({k: v for k, v in title_to_genres.items()})
    result.update({k: v for k, v in id_to_genres.items()})
    print(f"  Total Shinigami genre mappings: {len(result)}")
    return result

# =========================================================================
# MAIN
# =========================================================================
def main():
    print("\n" + "=" * 60)
    print("   OniVerse Genre Enrichment v2")
    print("=" * 60 + "\n")
    
    catalog = load_catalog()
    print(f"Catalog loaded: {len(catalog)} series\n")
    
    kc_map = build_kc_genre_map()
    sh_map = build_shngm_genre_map()
    
    # Merge all maps
    all_map = {}
    all_map.update(sh_map)
    all_map.update(kc_map)
    print(f"\nTotal combined genre mappings: {len(all_map)}")
    
    # Apply to catalog
    print("\n" + "=" * 60)
    print("Applying genres to catalog...")
    
    default_sets = [["Action", "Adventure"], ["Action"], ["Fantasy"], []]
    updated = 0
    
    for s in catalog:
        cur = s.get("genres", [])
        if cur and cur not in default_sets:
            continue  # Already has real genres
        
        slug = s.get("slug", "")
        kc_slug = s.get("kc_slug", "")
        sid = str(s.get("id", ""))
        title = s.get("title", "").strip().lower()
        
        new_genres = (
            all_map.get(slug) or
            all_map.get(f"kc-{kc_slug}") or
            all_map.get(kc_slug) or
            all_map.get(sid) or
            all_map.get(title) or
            None
        )
        
        if new_genres:
            s["genres"] = new_genres
            updated += 1
    
    # Stats
    all_genres = set()
    for s in catalog:
        for g in s.get("genres", []):
            all_genres.add(g)
    
    still_default = [s for s in catalog if s.get("genres", []) in default_sets or not s.get("genres")]
    
    print(f"\n  Updated: {updated} series")
    print(f"  Total unique genres: {len(all_genres)}")
    print(f"  Still default/empty: {len(still_default)}")
    print(f"  All genres: {sorted(all_genres)}")
    
    if still_default:
        print(f"\n  Remaining (top 10):")
        for s in still_default[:10]:
            print(f"    - {s.get('title')} [{s.get('slug')}]")
    
    save_catalog(catalog)
    size_mb = os.path.getsize(SCRAPED_FILE) / (1024 * 1024)
    print(f"\nSUCCESS! Files saved ({size_mb:.2f} MB)")

if __name__ == "__main__":
    main()
