import urllib.request
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://oniverse.sbs/"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache'})

try:
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        print("HTML Size:", len(html))
        print("Occurrences of 'Chapter N/A':", html.count("Chapter N/A"))
        print("Occurrences of '>N/A':", html.count(">N/A"))
        print("Contains Overgeared Chapter 335:", "Overgeared" in html and "335" in html)
        print("Contains Demonic Emperor Chapter 896:", "Demonic Emperor" in html and "896" in html)
except Exception as e:
    print("Error:", e)
