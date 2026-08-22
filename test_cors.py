import urllib.request
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://api.shngm.io/v1/chapter/detail/06c8d497-0993-4731-9990-1a941d0c2c38"
print("Testing CORS headers for:", url)

req = urllib.request.Request(url, headers={
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Origin': 'https://oniverse.sbs',
    'Referer': 'https://oniverse.sbs/'
})

try:
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        print("Status:", resp.status)
        print("Access-Control-Allow-Origin:", resp.headers.get('Access-Control-Allow-Origin'))
        print("Access-Control-Allow-Methods:", resp.headers.get('Access-Control-Allow-Methods'))
        print("All headers:", dict(resp.headers))
except Exception as e:
    print("Error:", e)
