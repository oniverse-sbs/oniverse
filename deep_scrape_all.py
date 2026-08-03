import urllib.request
import json
import ssl
import os
import time
from datetime import datetime, timezone

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
SCRAPED_DIR = os.path.join(PROJECT_DIR, "scraped_data")
OUTPUT_FILE = os.path.join(SCRAPED_DIR, "series.json")
ROOT_SERIES_FILE = os.path.join(PROJECT_DIR, "series.json")
DATA_JS_FILE = os.path.join(PROJECT_DIR, "data.js")

os.makedirs(SCRAPED_DIR, exist_ok=True)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def load_existing():
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    if os.path.exists(ROOT_SERIES_FILE):
        try:
            with open(ROOT_SERIES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []

def fetch_komikcast_deep(max_pages=30):
    print(f"[1/2] Deep fetching Komikcast ({max_pages} pages)...")
    kc_items = []
    for p in range(1, max_pages + 1):
        url = f"https://be.komikcast.cc/series?page={p}"
        try:
            req = urllib.request.Request(url, headers={**HEADERS, "Origin": "https://v3.komikcast.fit", "Referer": "https://v3.komikcast.fit/"})
            with urllib.request.urlopen(req, context=ctx, timeout=10) as res:
                data = json.loads(res.read().decode("utf-8"))
                items = data.get("data", [])
                if not items:
                    break
                kc_items.extend(items)
                print(f"   - Page {p}/{max_pages}: {len(items)} items fetched")
        except Exception as e:
            print(f"   - Page {p} error: {e}")
            break
        time.sleep(0.1)
    print(f"  Total Komikcast fetched: {len(kc_items)} items")
    return kc_items

def fetch_shinigami_deep(max_pages=30):
    print(f"[2/2] Deep fetching Shinigami ({max_pages} pages)...")
    shngm_items = []
    for p in range(1, max_pages + 1):
        url = f"https://api.shngm.io/v1/manga/list?page={p}&page_size=50"
        try:
            req = urllib.request.Request(url, headers={**HEADERS, "Origin": "https://shinigami.id", "Referer": "https://shinigami.id/"})
            with urllib.request.urlopen(req, context=ctx, timeout=10) as res:
                data = json.loads(res.read().decode("utf-8"))
                items = data.get("data", [])
                if not items:
                    break
                shngm_items.extend(items)
                print(f"   - Page {p}/{max_pages}: {len(items)} items fetched")
        except Exception as e:
            print(f"   - Page {p} error: {e}")
            break
        time.sleep(0.1)
    print(f"  Total Shinigami fetched: {len(shngm_items)} items")
    return shngm_items

def parse_date_score(item):
    val = item.get("last_updated") or item.get("updated") or item.get("updated_at") or ""
    if not val:
        return 0
    try:
        # ISO parse
        clean_val = str(val).replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_val)
        return dt.timestamp()
    except Exception:
        pass
    if len(str(val)) >= 10:
        try:
            dt = datetime.strptime(str(val)[:10], "%Y-%m-%d")
            return dt.timestamp()
        except Exception:
            pass
    return 0

def run_deep_sync():
    catalog = load_existing()
    by_slug = {}
    by_title = {}
    
    for item in catalog:
        s = item.get("slug")
        t = item.get("title", "").strip().lower()
        if s:
            by_slug[s] = item
        if t:
            by_title[t] = item

    kc_items = fetch_komikcast_deep(30)
    shngm_items = fetch_shinigami_deep(30)

    updated_count = 0
    added_count = 0

    # Merge Komikcast
    for k in kc_items:
        slug = "kc-" + k.get("slug", "")
        title = k.get("title", "").strip()
        ch_idx = k.get("latestChapterIndex") or k.get("chapterCount") or 1
        cover = k.get("coverUrl") or ""
        updated_at = k.get("updatedAt") or ""
        t_type = (k.get("type") or "Manhwa").capitalize()

        existing = by_slug.get(slug) or by_title.get(title.lower())
        if existing:
            existing["latest_chapter"] = str(ch_idx)
            if updated_at:
                existing["last_updated"] = updated_at
                existing["updated"] = updated_at
            if cover and not existing.get("cover_image_url"):
                existing["cover_image_url"] = cover
            existing["type"] = t_type
            updated_count += 1
        else:
            new_item = {
                "id": slug,
                "slug": slug,
                "title": title,
                "alternative_title": title,
                "synopsis": k.get("synopsis") or f"Baca komik {title} Bahasa Indonesia di OniVerse.",
                "cover_image_url": cover,
                "type": t_type,
                "status": "Ongoing",
                "rating": 9.5,
                "latest_chapter": str(ch_idx),
                "last_updated": updated_at or datetime.now(timezone.utc).isoformat(),
                "updated": updated_at or datetime.now(timezone.utc).isoformat(),
                "genres": ["Action", "Adventure"],
                "source": "Komikcast"
            }
            catalog.append(new_item)
            by_slug[slug] = new_item
            by_title[title.lower()] = new_item
            added_count += 1

    # Merge Shinigami
    for d in shngm_items:
        s_id = str(d.get("manga_id") or d.get("id") or "")
        title = (d.get("title") or "").strip()
        ch_num = str(d.get("latest_chapter_number") or d.get("chapter_count") or 1)
        cover = d.get("cover_image_url") or d.get("cover_portrait_url") or ""
        up_at = d.get("updated_at") or d.get("latest_chapter_time") or ""

        existing = by_slug.get(s_id) or by_title.get(title.lower())
        if existing:
            existing["latest_chapter"] = ch_num
            if up_at and not existing.get("last_updated"):
                existing["last_updated"] = up_at
            if cover and not existing.get("cover_image_url"):
                existing["cover_image_url"] = cover
            updated_count += 1
        else:
            new_item = {
                "id": s_id,
                "slug": s_id,
                "title": title,
                "alternative_title": d.get("alternative_title") or title,
                "synopsis": d.get("synopsis") or f"Baca komik {title} Bahasa Indonesia di OniVerse.",
                "cover_image_url": cover,
                "type": "Manhwa",
                "status": "Ongoing",
                "rating": round(float(d.get("user_rate_average") or 9.5), 1),
                "latest_chapter": ch_num,
                "last_updated": up_at or "2026-08-01",
                "updated": up_at or "2026-08-01",
                "genres": ["Action", "Adventure"],
                "source": "Shinigami"
            }
            catalog.append(new_item)
            by_slug[s_id] = new_item
            by_title[title.lower()] = new_item
            added_count += 1

    # Clean catalog: remove invalid items without title or valid slug
    catalog = [s for s in catalog if s.get("title") and s.get("title").strip() != "" and s.get("slug") and s.get("slug") != "kc-"]

    # Sort descending by date score
    catalog.sort(key=parse_date_score, reverse=True)

    print(f"\nMerge Complete! {updated_count} series updated, {added_count} new series added.")
    print(f"Total catalog size: {len(catalog)} series.")
    print(f"Top 5 Items:")
    for i, s in enumerate(catalog[:5]):
        print(f"   {i+1}. {s.get('title')} -> Ch: {s.get('latest_chapter')} | Date: {s.get('last_updated')}")

    # Save to all target files
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, separators=(',', ':'))

    with open(ROOT_SERIES_FILE, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, separators=(',', ':'))

    with open(DATA_JS_FILE, "w", encoding="utf-8") as f:
        f.write("window.SERIES_DATA = " + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ";")

    size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    print(f"\nSUCCESS! Files updated ({size_mb:.2f} MB)")

if __name__ == "__main__":
    run_deep_sync()
