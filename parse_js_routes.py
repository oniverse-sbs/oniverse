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

# Find quotes containing slashes like "/v1/..." or "be.komikcast.cc..."
paths = re.findall(r'"(/[a-zA-Z0-9_\-/]+)"', jcode)
print("Found relative paths:", list(set(p for p in paths if len(p) > 3 and not p.endswith(".js")))[:30])

# Find axios/fetch endpoints
matches = re.findall(r'(\.get|\.post|fetch)\(["\']([^"\']+)["\']', jcode)
print("Axios/Fetch calls:", set(matches))
