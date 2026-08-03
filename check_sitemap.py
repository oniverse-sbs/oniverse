import urllib.request, ssl, xml.etree.ElementTree as ET

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"}

urls = [
    "https://oniverse.sbs/sitemap.xml",
    "https://oniverse.sbs/sitemap_index.xml",
]

for url in urls:
    print(f"\n=== {url} ===")
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        res = urllib.request.urlopen(req, context=ctx, timeout=10)
        body = res.read()
        ct = res.headers.get("Content-Type", "N/A")
        print(f"Status: {res.status}")
        print(f"Content-Type: {ct}")
        print(f"Size: {len(body)} bytes")
        
        decoded = body.decode("utf-8", errors="replace")
        print(f"First 300 chars:\n{decoded[:300]}")
        
        # Try parsing XML
        try:
            ET.fromstring(body)
            print("XML Parse: VALID")
        except ET.ParseError as pe:
            print(f"XML Parse ERROR: {pe}")
            
    except Exception as e:
        print(f"FETCH ERROR: {e}")
