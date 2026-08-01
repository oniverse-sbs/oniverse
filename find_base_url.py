import urllib.request
import re
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

js_url = "https://v3.komikcast.fit/assets/DQuUjfaO.js"
req = urllib.request.Request(js_url, headers={"User-Agent": "Mozilla/5.0"})

with urllib.request.urlopen(req, context=ctx) as r:
    jcode = r.read().decode("utf-8", errors="ignore")

# Find baseURL definitions
base_urls = re.findall(r'baseURL\s*:\s*["\']([^"\']+)["\']', jcode)
print("baseURL matches:", base_urls)

# Find any strings containing "be.komikcast"
be_matches = re.findall(r'["\'](https?://be\.komikcast[^\'"]+)["\']', jcode)
print("be.komikcast matches:", set(be_matches))

# Find api routes
api_routes = re.findall(r'["\'](/api/[^\'"]+)["\']', jcode)
print("api routes:", list(set(api_routes))[:20])
