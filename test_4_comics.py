import urllib.request
import json
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')

ids = [
    ("cae262f8-ae2c-4626-a9b3-8f2dc6b72117", "The Wind Mage"),
    ("d4e9983e-69eb-4370-b93a-f310b6e81faa", "Face Genius, 0 Year-Old Top Star"),
    ("7701ba39-f6b3-46ab-873f-cbc1fe93fb10", "Player Who Cant Level UP"),
    ("a2ba8fcf-f554-4568-95ea-f0cc997ab394", "All Hail the Sect Leaders")
]

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'application/json, text/html'
}

for series_id, name in ids:
    print(f"\n=======================================================")
    print(f"Testing Series: {name} (ID: {series_id})")
    detail_url = f"https://api.shngm.io/v1/manga/detail/{series_id}"
    req = urllib.request.Request(detail_url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            d_json = json.loads(resp.read().decode('utf-8'))
            print("Detail retcode:", d_json.get("retcode"))
            data = d_json.get("data", {})
            print("Title:", data.get("title"))
            print("Cover:", data.get("cover_portrait_url") or data.get("cover_image_url"))
    except Exception as e:
        print("Detail Error:", e)

    ch_url = f"https://api.shngm.io/v1/chapter/{series_id}/list?page=1&page_size=500&sort_by=chapter_number&sort_order=desc"
    req_ch = urllib.request.Request(ch_url, headers=headers)
    try:
        with urllib.request.urlopen(req_ch, context=ctx, timeout=10) as resp:
            c_json = json.loads(resp.read().decode('utf-8'))
            print("Chapter List retcode:", c_json.get("retcode"))
            ch_data = c_json.get("data", [])
            print("Chapter count:", len(ch_data))
            if ch_data:
                sample_ch = ch_data[0]
                ch_id = sample_ch.get("chapter_id") or sample_ch.get("id")
                print(f"Sample Ch #{sample_ch.get('chapter_number')} ID: {ch_id}")
                # Test fetching images for sample chapter
                ch_detail_url = f"https://api.shngm.io/v1/chapter/detail/{ch_id}"
                req_cd = urllib.request.Request(ch_detail_url, headers=headers)
                try:
                    with urllib.request.urlopen(req_cd, context=ctx, timeout=10) as resp_cd:
                        cd_json = json.loads(resp_cd.read().decode('utf-8'))
                        cd_data = cd_json.get("data", {})
                        ch_obj = cd_data.get("chapter", {})
                        imgs = ch_obj.get("data") or ch_obj.get("images") or cd_data.get("images") or []
                        base_u = cd_data.get("base_url") or "https://assets.shngm.id"
                        path_u = ch_obj.get("path") or ""
                        print(f"Sample Ch Images count: {len(imgs)}")
                        if imgs:
                            print(f"Sample Image URL: {imgs[0] if imgs[0].startswith('http') else base_u + path_u + imgs[0]}")
                except Exception as e_cd:
                    print("Sample Ch Detail Error:", e_cd)
    except Exception as e:
        print("Chapter List Error:", e)
