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

# Find all http/https URLs
urls = re.findall(r'https?://[a-zA-Z0-9\.\-_/]+', jcode)
print("All URLs in JS:", set(urls))
