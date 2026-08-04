import urllib.request
import ssl
import re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

mirror_urls = [
    'https://komikcast.cz/chapter/first-time-as-a-loved-youngest-child-chapter-101-bahasa-indonesia/',
    'https://komikcast.bz/chapter/first-time-as-a-loved-youngest-child-chapter-101-bahasa-indonesia/',
    'https://v3.komikcast.cz/chapter/first-time-as-a-loved-youngest-child-chapter-101-bahasa-indonesia/',
    'https://komikcast.fit/chapter/first-time-as-a-loved-youngest-child-chapter-101-bahasa-indonesia/'
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

for u in mirror_urls:
    try:
        req = urllib.request.Request(u, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=8) as r:
            html = r.read().decode('utf-8', errors='ignore')
            imgs = re.findall(r'src=["\']([^"\']+\.(?:jpg|jpeg|png|webp)[^"\']*)["\']', html, re.IGNORECASE)
            reader_imgs = [i for i in imgs if any(cdn in i.lower() for cdn in ['imgkc', 'wp-content/uploads', 'minio', 'cdn'])]
            print(f"SUCCESS ({u}): found {len(reader_imgs)} reader images!")
            if reader_imgs:
                for img in reader_imgs[:3]:
                    print("  Sample Image:", img)
                break
    except Exception as e:
        print(f"FAILED ({u}): {e}")
