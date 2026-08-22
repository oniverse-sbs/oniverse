import urllib.request
import json
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/html'
}

ch_id = "06c8d497-0993-4731-9990-1a941d0c2c38" # Ch 210 of Crazy Demon
url = f"https://api.shngm.io/v1/chapter/detail/{ch_id}"

print("Testing Shinigami Chapter Detail API:", url)
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        d = json.loads(resp.read().decode('utf-8'))
        print("Retcode:", d.get("retcode"))
        data = d.get("data", {})
        print("Data keys:", list(data.keys()))
        base_url = data.get("base_url") or data.get("base_url_low") or "https://assets.shngm.id"
        ch_data = data.get("chapter", {})
        print("Chapter keys:", list(ch_data.keys()))
        path = ch_data.get("path", "")
        filenames = ch_data.get("data") or ch_data.get("images") or ch_data.get("chapter_data_data") or []
        print("Base URL:", base_url)
        print("Path:", path)
        print("Filenames count:", len(filenames))
        if filenames:
            print("First image sample:", filenames[0])
            first_url = filenames[0] if filenames[0].startswith('http') else base_url + path + filenames[0]
            print("Full URL sample:", first_url)
except Exception as e:
    print("Error:", e)
