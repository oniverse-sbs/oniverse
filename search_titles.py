import urllib.request
import urllib.parse
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

titles = ['Marriage With A Suspiciously Demure Husband', 'Gachiakuta', 'One Piece', 'Demonic Emperor', 'Overgeared']

print("=== SEARCHING SHINIGAMI API ===")
for t in titles:
    q = urllib.parse.quote(t)
    url = f'https://api.shngm.io/v1/manga/list?page=1&page_size=5&q={q}'
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=8) as r:
            res = json.loads(r.read().decode('utf-8'))
            results = res.get('data', [])
            titles_found = [r.get('title') for r in results]
            print(f"{t}: found {len(results)} in Shinigami -> {titles_found}")
            for r in results:
                print(f"   ID: {r.get('manga_id')}, Title: {r.get('title')}, Cover: {r.get('cover_image_url') or r.get('cover_portrait_url')}")
    except Exception as e:
        print(f"{t} Shinigami error: {e}")
