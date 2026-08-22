import urllib.request
import json
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')

ids = [
    "4751525f-359c-423a-9fdb-44d40ac8105d",
    "c8077427-0ad6-4358-9497-98fd338f6425"
]

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/html'
}

for series_id in ids:
    print(f"\n=======================================================")
    print(f"Testing ID: {series_id}")
    detail_url = f"https://api.shngm.io/v1/manga/detail/{series_id}"
    req = urllib.request.Request(detail_url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            d_json = json.loads(resp.read().decode('utf-8'))
            print("Detail retcode:", d_json.get("retcode"))
            data = d_json.get("data", {})
            print("Title:", data.get("title"))
            print("Cover:", data.get("cover_portrait_url") or data.get("cover_image_url"))
            print("Country ID:", data.get("country_id"))
            print("Latest Chapter:", data.get("latest_chapter_number"))
    except Exception as e:
        print(f"Error detail: {e}")

    ch_list_url = f"https://api.shngm.io/v1/chapter/{series_id}/list?page=1&page_size=500&sort_by=chapter_number&sort_order=desc"
    req_ch = urllib.request.Request(ch_list_url, headers=headers)
    try:
        with urllib.request.urlopen(req_ch, context=ctx, timeout=10) as resp:
            c_json = json.loads(resp.read().decode('utf-8'))
            print("Chapter list retcode:", c_json.get("retcode"))
            ch_data = c_json.get("data", [])
            print("Chapter count:", len(ch_data))
            if ch_data:
                print("First chapter:", ch_data[0].get("chapter_number"), ch_data[0].get("chapter_title"))
                print("Last chapter:", ch_data[-1].get("chapter_number"), ch_data[-1].get("chapter_title"))
    except Exception as e:
        print(f"Error chapter list: {e}")
