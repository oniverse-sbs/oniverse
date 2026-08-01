import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Test common API endpoints on backend
endpoints = [
    "https://be.komikcast.cc/v1/manga/list",
    "https://be.komikcast.cc/v1/manga?page=1",
    "https://be.komikcast.cc/api/v1/manga",
    "https://be.komikcast.cc/api/manga",
    "https://be.komikcast.cc/manga",
    "https://be.komikcast.cc/v1/chapter",
]

for ep in endpoints:
    print(f"Testing {ep}...")
    try:
        req = urllib.request.Request(ep, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Origin": "https://v3.komikcast.fit",
            "Referer": "https://v3.komikcast.fit/"
        })
        with urllib.request.urlopen(req, context=ctx) as r:
            body = r.read().decode("utf-8")
            print(f"  Status: {r.status}, Length: {len(body)}")
            print("  First 200 chars:", body[:200])
    except Exception as e:
        print("  Error:", e)
