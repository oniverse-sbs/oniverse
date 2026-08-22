import json
import os
import re

print("=========================================================")
print("  MASTER DATABASE BUILDER (Clean Real Chapters Only)")
print("=========================================================")

source_file = os.path.join('scraped_data', 'series.json')
if not os.path.exists(source_file):
    source_file = 'series.json'

with open(source_file, 'r', encoding='utf-8') as f:
    raw_catalog = json.load(f)

print(f"Loaded {len(raw_catalog)} series from {source_file}")

master_catalog = []
detail_dir = os.path.join('data', 'detail')
os.makedirs(detail_dir, exist_ok=True)

total_valid_chapters = 0
total_valid_images = 0

for item in raw_catalog:
    sid = str(item.get('id', ''))
    title = item.get('title') or item.get('name') or 'Komik'
    slug = item.get('slug') or sid.replace('kc_', '').replace('kc-', '')
    clean_slug = re.sub(r'[^a-zA-Z0-9_-]', '-', slug.lower()).strip('-')

    # 1. Komik Metadata
    cover = item.get('cover') or item.get('cover_url') or item.get('image') or ''
    syn = item.get('synopsis') or item.get('description') or f'Baca komik {title} Bahasa Indonesia gratis.'
    
    # 2. Genre Normalization
    raw_genres = item.get('genres')
    if not raw_genres:
        genre_str = item.get('genre') or 'Action, Fantasy'
        raw_genres = [g.strip() for g in genre_str.split(',') if g.strip()]
    
    clean_genres = sorted(list(set(raw_genres)))

    # 3. Chapter & Gambar Normalization
    raw_chaps = item.get('chapters') or []
    
    # Filter chapters: if any chapter has valid images, keep only chapters that have valid images or real dates
    chaps_with_images = [c for c in raw_chaps if isinstance(c.get('images'), list) and len(c.get('images')) > 0]
    
    # If we have chapters with real images, filter out empty dummy placeholders!
    if len(chaps_with_images) > 0:
        target_chaps = chaps_with_images
    else:
        target_chaps = raw_chaps

    unified_chaps = []
    for c in target_chaps:
        ch_num = str(c.get('number') or c.get('chapter') or '')
        ch_id = c.get('id') or c.get('chapter_id') or c.get('slug') or f'ch_{ch_num}'

        raw_imgs = c.get('images', [])
        valid_imgs = []
        if isinstance(raw_imgs, list):
            for img in raw_imgs:
                if isinstance(img, str) and img.strip():
                    valid_imgs.append(img.strip())

        total_valid_images += len(valid_imgs)

        unified_chaps.append({
            'id': str(ch_id),
            'number': ch_num,
            'title': c.get('title') or f'Chapter {ch_num}',
            'date': (c.get('date') or c.get('released') or c.get('created_at') or '')[:10],
            'images': valid_imgs
        })

    total_valid_chapters += len(unified_chaps)

    # Sort chapters descending by chapter number
    def parse_ch_num(ch):
        m = re.search(r'\d+(\.\d+)?', ch.get('number', '0'))
        return float(m.group(0)) if m else 0.0

    unified_chaps.sort(key=parse_ch_num, reverse=True)

    master_item = {
        'id': sid,
        'slug': clean_slug,
        'title': title,
        'alternative_title': item.get('alternative_title', ''),
        'author': item.get('author', 'Unknown'),
        'artist': item.get('artist', 'Unknown'),
        'cover': cover,
        'type': item.get('type', 'Manhwa'),
        'status': item.get('status', 'Ongoing'),
        'rating': str(item.get('rating', '7.5')),
        'views': int(item.get('views') or 0),
        'genres': clean_genres,
        'synopsis': syn,
        'latest_chapter': unified_chaps[0]['number'] if unified_chaps else str(item.get('latest_chapter', '1')),
        'total_chapters': len(unified_chaps) or int(item.get('total_chapters') or 1),
        'last_updated': (item.get('last_updated') or item.get('updated_at') or '')[:19],
        'chapters': unified_chaps
    }

       # Strip images from chapters in master item catalog to prevent 100MB+ files
    clean_master_chaps = []
    for c in unified_chaps:
        clean_master_chaps.append({
            'id': str(c.get('id', '')),
            'number': str(c.get('number', '')),
            'title': c.get('title') or f"Chapter {c.get('number', '')}",
            'date': (c.get('date') or '')[:10]
        })

    master_item['chapters'] = clean_master_chaps
    master_catalog.append(master_item)

    # 4. Save to Static Detail Database (data/detail/<slug>.json & sid.json)
    detail_payload = {
        'title': master_item['title'],
        'synopsis': master_item['synopsis'],
        'alternative_title': master_item['alternative_title'],
        'author': master_item['author'],
        'artist': master_item['artist'],
        'genres': master_item['genres'],
        'chapters': unified_chaps
    }

    detail_path = os.path.join(detail_dir, f"{clean_slug}.json")
    with open(detail_path, 'w', encoding='utf-8') as df:
        json.dump(detail_payload, df, ensure_ascii=False, separators=(',', ':'))

    if sid and sid != clean_slug:
        sid_clean = re.sub(r'[^a-zA-Z0-9_-]', '_', sid)
        sid_path = os.path.join(detail_dir, f"{sid_clean}.json")
        with open(sid_path, 'w', encoding='utf-8') as df:
            json.dump(detail_payload, df, ensure_ascii=False, separators=(',', ':'))

# Sort master catalog by last_updated score
def get_update_score(s):
    return s.get('last_updated') or ''

master_catalog.sort(key=get_update_score, reverse=True)

# 5. Save Master Catalog files
print("Saving Master Database files...")
with open('series.json', 'w', encoding='utf-8') as f:
    json.dump(master_catalog, f, ensure_ascii=False, separators=(',', ':'))

with open('data-catalog.json', 'w', encoding='utf-8') as f:
    json.dump(master_catalog, f, ensure_ascii=False, separators=(',', ':'))

with open('data.js', 'w', encoding='utf-8') as f:
    f.write('window.SERIES_DATA = ' + json.dumps(master_catalog, ensure_ascii=False, separators=(',', ':')) + ';')

with open('data-initial.js', 'w', encoding='utf-8') as f:
    f.write('window.SERIES_DATA = ' + json.dumps(master_catalog[:30], ensure_ascii=False, separators=(',', ':')) + ';')

print("=========================================================")
print(f"  [OK] MASTER DATABASE SUCCESSFULLY GENERATED!")
print(f"  - Total Komik: {len(master_catalog)}")
print(f"  - Total Chapter: {total_valid_chapters}")
print(f"  - Total Gambar Valid: {total_valid_images}")
print("=========================================================")
