import json

with open("scraped_data/series.json", "r", encoding="utf-8") as f:
    d = json.load(f)

print(f"Total: {len(d)} series")
print(f"With chapters: {sum(1 for s in d if s.get('chapters') and len(s['chapters']) > 0)}")
print(f"With cover: {sum(1 for s in d if s.get('cover'))}")
print(f"With rating: {sum(1 for s in d if s.get('rating') and s['rating'] != 'N/A')}")
print(f"With genres: {sum(1 for s in d if s.get('genres') and len(s['genres']) > 0)}")

types = {}
for s in d:
    t = s.get("type", "?")
    types[t] = types.get(t, 0) + 1
print(f"Types: {types}")

print("\n--- Top 10 Latest ---")
for i, s in enumerate(d[:10]):
    print(f"  {i+1}. {s['title']} [{s['type']}] rating={s['rating']} ch={s.get('latest_chapter','?')} updated={s.get('last_updated','?')}")

print("\n--- Sample genres ---")
genre_count = {}
for s in d:
    for g in s.get("genres", []):
        genre_count[g] = genre_count.get(g, 0) + 1
for g, c in sorted(genre_count.items(), key=lambda x: -x[1])[:15]:
    print(f"  {g}: {c}")
