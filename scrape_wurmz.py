import urllib.request
import re
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://wurmz.net/'
}

with open('scratch_wurmz.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Extract Title
title = ''
m_title = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.DOTALL | re.IGNORECASE)
if m_title:
    title = re.sub(r'<[^>]+>', '', m_title.group(1)).strip()

if not title:
    title = "Aku Menjadi Ibu Pemeran Utama Laki-Laki"

# Extract Cover
cover = ''
m_cover = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
if m_cover:
    cover = m_cover.group(1)
if not cover:
    m_cover2 = re.search(r'src=["\']([^"\']+(?:jpg|jpeg|png|webp))["\'][^>]*class=["\'][^"\']*cover', html, re.IGNORECASE)
    if m_cover2:
        cover = m_cover2.group(1)

# Extract Synopsis
synopsis = ''
m_syn = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
if m_syn:
    synopsis = m_syn.group(1)

# Extract Genres
genres = []
m_genres = re.findall(r'href=["\'][^"\']*/genre/[^"\']+["\'][^>]*>(.*?)</a>', html, re.IGNORECASE)
if m_genres:
    genres = [re.sub(r'<[^>]+>', '', g).strip() for g in m_genres if g.strip()]
if not genres:
    genres = ['Romance', 'Fantasy', 'Isekai']

# Extract Chapter links
# Look for any chapter URL pattern: href=".../chapter-..."
raw_links = re.findall(r'href=["\'](https?://wurmz\.net/[^"\']*(?:chapter|ch|read)[^"\']*)["\']', html, re.IGNORECASE)
if not raw_links:
    raw_links = re.findall(r'href=["\'](/[^"\']*(?:chapter|ch|read)[^"\']*)["\']', html, re.IGNORECASE)
    raw_links = ['https://wurmz.net' + l if l.startswith('/') else l for l in raw_links]

# De-duplicate links
unique_chaps = []
seen = set()
for l in raw_links:
    if l not in seen:
        seen.add(l)
        # Extract chapter number from URL
        m_num = re.search(r'chapter[-_]?(\d+(?:\.\d+)?)', l, re.IGNORECASE)
        num = m_num.group(1) if m_num else ''
        if not num:
            m_num2 = re.search(r'\b(\d+)\b', l.split('/')[-1])
            num = m_num2.group(1) if m_num2 else '1'
        unique_chaps.append({'url': l, 'number': num})

print(f"Scraped Comic Meta:")
print(f"  Title: {title}")
print(f"  Cover: {cover}")
print(f"  Synopsis: {synopsis[:120]}...")
print(f"  Genres: {genres}")
print(f"  Found {len(unique_chaps)} chapters!")

# Function to fetch chapter images
def fetch_chapter_images(ch):
    url = ch['url']
    num = ch['number']
    imgs = []
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=8) as r:
            ch_html = r.read().decode('utf-8', errors='ignore')
            # Extract images inside reader container or ts-main-image / reader-area
            matches = re.findall(r'src=["\']([^"\']+\.(?:jpg|jpeg|png|webp)[^"\']*)["\']', ch_html, re.IGNORECASE)
            # Filter out icons, logo, avatars, covers
            for img in matches:
                img_clean = img.split('?')[0]
                if not any(x in img_clean.lower() for x in ['logo', 'icon', 'avatar', 'banner', 'cover', 'loader', 'facebook', 'discord']):
                    imgs.append(img)
    except Exception as e:
        print(f"  Failed Ch.{num} ({url}): {e}")

    return {
        'id': f"wurmz_ch_{num}",
        'number': str(num),
        'chapter': str(num),
        'title': f"Chapter {num}",
        'date': '2026-08-04',
        'images': imgs
    }

print("Fetching chapter images in parallel (5 workers)...")
chapters_data = []

with ThreadPoolExecutor(max_workers=5) as executor:
    futures = [executor.submit(fetch_chapter_images, ch) for ch in unique_chaps]
    for fut in as_completed(futures):
        res = fut.result()
        if res:
            chapters_data.append(res)

# Sort chapters descending by chapter number
def get_num(ch):
    try:
        return float(ch['number'])
    except:
        return 0.0

chapters_data.sort(key=get_num, reverse=True)

slug = "aku-menjadi-ibu-pemeran-utama-laki-laki"
comic_id = f"wurmz_{slug}"

new_comic = {
    "id": comic_id,
    "slug": slug,
    "title": title,
    "alternative_title": "I Became the Hero's Mom / I Became the Male Lead's Mother",
    "author": "wurmz",
    "artist": "wurmz",
    "cover": cover or "https://wurmz.net/wp-content/uploads/2023/05/Aku-Menjadi-Ibu-Pemeran-Utama-Laki-Laki.jpg",
    "type": "Manhwa",
    "status": "Ongoing",
    "rating": "8.8",
    "views": 15000,
    "genres": genres,
    "synopsis": synopsis or "Aku terbangun di dunia novel sebagai karakter tambahan yang ditakdirkan mati. Untuk bertahan hidup, aku menjadi ibu angkat dari pemeran utama laki-laki saat dia masih kecil...",
    "latest_chapter": chapters_data[0]['number'] if chapters_data else "1",
    "total_chapters": len(chapters_data),
    "last_updated": "2026-08-04T18:06:00",
    "chapters": chapters_data
}

# Update series.json, data-catalog.json, data.js
with open('series.json', 'r', encoding='utf-8') as f:
    catalog = json.load(f)

# Check if exists
catalog = [c for c in catalog if c.get('slug') != slug and c.get('id') != comic_id]
catalog.insert(0, new_comic)

with open('series.json', 'w', encoding='utf-8') as f:
    json.dump(catalog, f, ensure_ascii=False, separators=(',', ':'))

with open('data-catalog.json', 'w', encoding='utf-8') as f:
    json.dump(catalog, f, ensure_ascii=False, separators=(',', ':'))

with open('data.js', 'w', encoding='utf-8') as f:
    f.write('window.SERIES_DATA = ' + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ';')

# Write static detail JSON
detail_dir = os.path.join('data', 'detail')
os.makedirs(detail_dir, exist_ok=True)
detail_payload = {
    'title': new_comic['title'],
    'synopsis': new_comic['synopsis'],
    'alternative_title': new_comic['alternative_title'],
    'author': new_comic['author'],
    'artist': new_comic['artist'],
    'chapters': new_comic['chapters']
}
with open(os.path.join(detail_dir, f"{slug}.json"), 'w', encoding='utf-8') as f:
    json.dump(detail_payload, f, ensure_ascii=False, separators=(',', ':'))

print(f"🎉 SUCCESS! Scraped '{title}' with {len(chapters_data)} chapters and updated catalog!")
