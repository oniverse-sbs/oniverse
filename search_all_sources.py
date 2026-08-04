import urllib.request
import ssl
import json
import re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

sites = [
    ('Komikindo', 'https://komikindo.tv/?s=First+Time+as+a+Loved+Youngest+Child'),
    ('Kiryuu', 'https://kiryuu.org/?s=First+Time+as+a+Loved+Youngest+Child'),
    ('WestManga', 'https://westmanga.fun/?s=First+Time+as+a+Loved+Youngest+Child'),
    ('Wurmz', 'https://wurmz.net/?s=First+Time+as+a+Loved+Youngest+Child'),
    ('Bacakomik', 'https://bacakomik.co.id/?s=First+Time+as+a+Loved+Youngest+Child'),
]

for name, url in sites:
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=6) as r:
            html = r.read().decode('utf-8', errors='ignore')
            links = re.findall(r'href=["\']([^"\']+)["\']', html)
            links = [l for l in set(links) if any(x in l for x in ['manga', 'komik', 'detail', 'series'])]
            print(f"[{name}] Found {len(links)} matching links:")
            for l in links[:3]:
                print(f"   - {l}")
    except Exception as e:
        print(f"[{name}] Error: {e}")
