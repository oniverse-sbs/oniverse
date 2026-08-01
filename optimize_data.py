import json
import os

PROJECT_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
INPUT_FILE = os.path.join(PROJECT_DIR, "scraped_data", "series.json")

def optimize():
    print("Optimizing series.json for ultra-fast web loading...")
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    if isinstance(data, dict):
        data = data.get("series", [])
        
    print(f"Loaded {len(data)} series.")
    
    optimized_series = []
    for s in data:
        # Keep up to 30 chapters per series in main dataset for fast load
        chaps = s.get("chapters", [])[:30]
        clean_chaps = []
        for c in chaps:
            clean_chaps.append({
                "number": c.get("number") or c.get("chapter_number") or "",
                "chapter": c.get("chapter") or c.get("chapter_number") or "",
                "slug": c.get("slug") or c.get("chapter_id") or "",
                "date": c.get("date") or c.get("release_date") or ""
            })
            
        entry = {
            "id": s.get("id", ""),
            "slug": s.get("slug") or s.get("id") or "",
            "title": s.get("title", ""),
            "alternative_title": s.get("alternative_title", ""),
            "synopsis": s.get("synopsis") or s.get("description") or "",
            "cover": s.get("cover") or s.get("cover_image_url") or "",
            "thumbnail": s.get("thumbnail") or s.get("cover_portrait_url") or s.get("cover") or "",
            "rating": str(s.get("rating", "8.0")),
            "views": s.get("views") or s.get("view_count") or 0,
            "status": s.get("status") or "Ongoing",
            "type": s.get("type") or "Manhwa",
            "genres": s.get("genres", []),
            "latest_chapter": str(s.get("latest_chapter") or s.get("latest_chapter_number") or (clean_chaps[0]["number"] if clean_chaps else "")),
            "last_updated": str(s.get("last_updated") or s.get("updated_at") or ""),
            "total_chapters": s.get("total_chapters") or len(s.get("chapters", [])),
            "chapters": clean_chaps
        }
        optimized_series.append(entry)
        
    with open(INPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(optimized_series, f, ensure_ascii=False, separators=(',', ':'))
        
    size_mb = os.path.getsize(INPUT_FILE) / (1024 * 1024)
    print(f"SUCCESS! Optimized file size: {size_mb:.2f} MB")

if __name__ == "__main__":
    optimize()
