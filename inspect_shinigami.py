import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Origin": "https://shinigami.id",
    "Referer": "https://shinigami.id/"
}

def check(url):
    try:
        req = urllib.request.Request(url, headers=headers)
        res = urllib.request.urlopen(req, context=ctx, timeout=10)
        data = json.loads(res.read().decode("utf-8"))
        items = data.get("data", [])
        print(f"URL: {url} => {len(items)} items")
        if items and isinstance(items, list):
            print("Sample item:", json.dumps(items[0], indent=2)[:300])
        elif isinstance(data, dict):
            print("Dict keys:", list(data.keys()))
    except Exception as e:
        print(f"URL: {url} => Error: {e}")

check("https://api.shngm.io/v1/manga/list?page=1&page_size=50")
check("https://api.shngm.io/v1/manga/list?page=2&page_size=50")
