"""
Enrich series with only 1-2 generic genres by adding more specific ones via keyword analysis.
"""
import json, sys, os

sys.stdout.reconfigure(encoding='utf-8')

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
SCRAPED_FILE = os.path.join(PROJECT_DIR, "scraped_data", "series.json")
ROOT_FILE = os.path.join(PROJECT_DIR, "series.json")
DATA_JS_FILE = os.path.join(PROJECT_DIR, "data.js")

# Keywords -> additional genres to add
KEYWORDS = {
    "reincarn": "Isekai",
    "regress": "Isekai",
    "rebirth": "Isekai",
    "isekai": "Isekai",
    "transmigr": "Isekai",
    "another world": "Isekai",
    "fallen world": "Isekai",
    "demon king": "Demons",
    "demon lord": "Demons",
    "demonic": "Demons",
    "devil": "Demons",
    "sword": "Martial Arts",
    "martial": "Martial Arts",
    "murim": "Murim",
    "heavenly demon": "Murim",
    "wuxia": "Murim",
    "cultivation": "Murim",
    "mage": "Magic",
    "magic": "Magic",
    "wizard": "Magic",
    "sorcerer": "Magic",
    "dragon": "Fantasy",
    "dungeon": "Adventure",
    "hunter": "Adventure",
    "quest": "Adventure",
    "knight": "Adventure",
    "mercenary": "Adventure",
    "barbarian": "Adventure",
    "wandering": "Adventure",
    "survival": "Adventure",
    "prince": "Drama",
    "princess": "Drama",
    "duke": "Drama",
    "noble": "Drama",
    "kingdom": "Drama",
    "royal": "Drama",
    "family": "Drama",
    "patron": "Drama",
    "villain": "Drama",
    "revenge": "Revenge",
    "vengeance": "Revenge",
    "zombie": "Horror",
    "undead": "Horror",
    "death": "Horror",
    "apocalypse": "Supernatural",
    "ghost": "Supernatural",
    "vampire": "Supernatural",
    "school": "School Life",
    "academy": "School Life",
    "student": "School Life",
    "cadet": "School Life",
    "blacksmith": "Game",
    "crafter": "Game",
    "level up": "Game",
    "level UP": "Game",
    "player": "Game",
    "system": "Game",
    "skill": "Game",
    "trait": "Game",
    "summon": "Fantasy",
    "genius": "Fantasy",
    "prodigy": "Fantasy",
    "secret": "Mystery",
    "mystery": "Mystery",
    "stream": "Sci-fi",
    "creator": "Comedy",
    "hiatus": "Comedy",
    "retire": "Slice of Life",
    "quiet life": "Slice of Life",
}

def main():
    data = json.load(open(SCRAPED_FILE, "r", encoding="utf-8"))
    
    thin = [s for s in data if len(s.get("genres", [])) <= 2]
    print(f"Series with <=2 genres: {len(thin)}")
    
    enriched = 0
    for s in thin:
        title = s.get("title", "").lower()
        synopsis = (s.get("synopsis") or s.get("description") or "").lower()
        text = title + " " + synopsis
        
        current = set(s.get("genres", []))
        added = set()
        
        for keyword, genre in KEYWORDS.items():
            if keyword in text and genre not in current:
                added.add(genre)
        
        if added:
            s["genres"] = sorted(current | added)
            enriched += 1
    
    print(f"Enriched: {enriched} series")
    
    # Stats
    all_genres = set()
    for s in data:
        for g in s.get("genres", []):
            all_genres.add(g)
    
    thin_after = [s for s in data if len(s.get("genres", [])) <= 2]
    rich = [s for s in data if len(s.get("genres", [])) >= 3]
    
    print(f"\nAfter enrichment:")
    print(f"  3+ genres: {len(rich)}")
    print(f"  <=2 genres: {len(thin_after)}")
    print(f"  Total genres: {len(all_genres)}")
    print(f"  All: {sorted(all_genres)}")
    
    # Save
    for p in [SCRAPED_FILE, ROOT_FILE]:
        with open(p, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    with open(DATA_JS_FILE, "w", encoding="utf-8") as f:
        f.write("window.SERIES_DATA = " + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ";")
    
    print(f"\nSaved! ({os.path.getsize(SCRAPED_FILE)/1024/1024:.2f} MB)")

if __name__ == "__main__":
    main()
