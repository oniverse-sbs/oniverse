import urllib.request
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request("https://oniverse.sbs/", headers={
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
})

try:
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        print("Fetched oniverse.sbs live! HTML length:", len(html))
        print("Contains 'Crazy Demon':", "Crazy Demon" in html)
        print("Contains 'Strongest Under Heaven':", "Strongest Under Heaven" in html)
        print("Contains '4751525f':", "4751525f" in html)
        print("Contains 'c8077427':", "c8077427" in html)
except Exception as e:
    print("Error:", e)

print("\nTesting static pages...")
for path in ["/komik/4751525f-359c-423a-9fdb-44d40ac8105d/", "/komik/c8077427-0ad6-4358-9497-98fd338f6425/"]:
    url = "https://oniverse.sbs" + path
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            print(f"URL {path} Status:", resp.status)
    except Exception as e:
        print(f"URL {path} Error:", e)
