import urllib.request
import re
import ssl
import json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://v3.komikcast.fit/"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})

with urllib.request.urlopen(req, context=ctx) as r:
    html = r.read().decode("utf-8", errors="ignore")

js_files = re.findall(r'src="([^"]+\.js)"', html)
print("JS files found:", js_files)

for js in js_files:
    js_url = js if js.startswith("http") else "https://v3.komikcast.fit" + js
    print(f"\nInspecting {js_url}...")
    try:
        jreq = urllib.request.Request(js_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(jreq, context=ctx) as jr:
            jcode = jr.read().decode("utf-8", errors="ignore")
            # Search for API URLs
            apis = re.findall(r'https?://[a-zA-Z0-9\.\-_/]+api[a-zA-Z0-9\.\-_/]*', jcode)
            print("  Found API endpoints:", set(apis))
            # Search for base URLs
            base_urls = re.findall(r'https?://[a-zA-Z0-9\.\-_]+', jcode)
            domains = set(b for b in base_urls if "komikcast" in b or "shngm" in b or "api" in b)
            print("  Related domains:", domains)
    except Exception as e:
        print("  Error:", e)
