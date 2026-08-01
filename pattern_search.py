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

patterns = ["v1", "v2", "manga", "chapter", "series", "komik", "list"]
for p in patterns:
    matches = re.findall(r'["\']([^"\']*{}[^"\']*)["\']'.format(p), jcode)
    clean = set(m for m in matches if len(m) < 60 and not m.endswith(".js") and not m.endswith(".css"))
    print(f"Matches for '{p}':", list(clean)[:15])
