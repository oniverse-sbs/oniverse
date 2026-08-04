"""
Fast chapter fetcher — fetches chapter lists for all series in parallel-ish batches.
Uses threading for speed.
"""
import urllib.request
import json
import ssl
import os
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

PROJECT_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
INPUT_FILE = os.path.join(PROJECT_DIR, "scraped_data", "series.json")
DATA_JS = os.path.join(PROJECT_DIR, "data.js")
SERIES_JSON = os.path.join(PROJECT_DIR, "series.json")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Origin": "https://shinigami.id",
    "Referer": "https://shinigami.id/",
    "Accept": "application/json",
}

def fetch_chapters(manga_id, max_ch=30):
    """Fetch chapters for a single manga"""
    try:
        url = f"https://api.shngm.io/v1/chapter/{manga_id}/list?page=1&page_size={max_ch}&sort_by=chapter_number&sort_order=desc"
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx, timeout=10) as r:
            data = json.loads(r.read().decode("utf-8"))
        
        if data and data.get("retcode") == 0:
            raw_chaps = data.get("data", [])
            return [{
                "chapter_id": c.get("chapter_id"),
                "number": str(c.get("chapter_number", "")),
                "chapter": str(c.get("chapter_number", "")),
                "title": c.get("chapter_title") or "",
                "date": (c.get("release_date") or c.get("created_at") or "")[:10],
                "released": (c.get("release_date") or c.get("created_at") or "")[:10],
            } for c in raw_chaps]
    except:
        pass
    return []


def main():
    # Load series
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        series = json.load(f)
    
    print(f"Loaded {len(series)} series. Fetching chapters with 5 threads...")
    
    lock = threading.Lock()
    success_count = [0]
    
    def process(idx_entry):
        idx, entry = idx_entry
        chapters = fetch_chapters(entry["id"])
        if chapters:
            with lock:
                entry["chapters"] = chapters
                entry["total_chapters"] = max(entry.get("total_chapters", 0), len(chapters))
                if chapters:
                    entry["latest_chapter"] = chapters[0].get("number", entry.get("latest_chapter", ""))
                success_count[0] += 1
        return idx
    
    start = time.time()
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(process, (i, s)): i for i, s in enumerate(series)}
        done = 0
        for future in as_completed(futures):
            done += 1
            if done % 100 == 0 or done == len(series):
                elapsed = time.time() - start
                print(f"  >> {done}/{len(series)} processed ({success_count[0]} with chapters) [{elapsed:.1f}s]")
    
    elapsed = time.time() - start
    print(f"\nDone in {elapsed:.1f}s! {success_count[0]}/{len(series)} series have chapters.")
    
    # Save
    series.sort(key=lambda s: s.get("last_updated", ""), reverse=True)
    
    with open(INPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(series, f, ensure_ascii=False, separators=(',', ':'))
    
    with open(SERIES_JSON, "w", encoding="utf-8") as f:
        json.dump(series, f, ensure_ascii=False, separators=(',', ':'))
    
    with open(DATA_JS, "w", encoding="utf-8") as f:
        f.write("window.SERIES_DATA = " + json.dumps(series, ensure_ascii=False, separators=(',', ':')) + ";")
    
    size_mb = os.path.getsize(DATA_JS) / (1024 * 1024)
    print(f"Saved! data.js = {size_mb:.2f} MB")


if __name__ == "__main__":
    main()
