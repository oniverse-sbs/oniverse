import json, sys
sys.stdout.reconfigure(encoding='utf-8')
data = json.load(open('scraped_data/series.json', 'r', encoding='utf-8'))

default = [["Action", "Adventure"], ["Action"], ["Fantasy"], []]
remaining = [s for s in data if s.get("genres", []) in default or not s.get("genres")]

for s in remaining[:10]:
    title = s.get("title", "?")
    genres = s.get("genres", [])
    print(f"  {title} -> {genres}")

print(f"\nTotal still default: {len(remaining)}")

rich = [s for s in data if len(s.get("genres", [])) > 2]
two = [s for s in data if len(s.get("genres", [])) == 2]
one = [s for s in data if len(s.get("genres", [])) == 1]
zero = [s for s in data if not s.get("genres")]

print(f"3+ genres: {len(rich)}")
print(f"2 genres: {len(two)}")
print(f"1 genre: {len(one)}")
print(f"0 genres: {len(zero)}")
print(f"Total: {len(data)}")
