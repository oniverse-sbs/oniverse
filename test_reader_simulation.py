import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
headers = {'User-Agent': 'Mozilla/5.0'}

with open(r'C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app\series.json', 'r', encoding='utf-8') as f:
    series = json.load(f)

print("=" * 70)
print("TESTING READER FETCH SIMULATION FOR SAMPLE CHAPTERS")
print("=" * 70)

for s in series:
    chaps = s.get('chapters', [])
    if not chaps:
        print(f"[FAIL] {s['title']} has no chapters!")
        continue
    ch0 = chaps[0]
    ch_uuid = ch0.get('chapter_id')
    url = f"https://api.shngm.io/v1/chapter/detail/{ch_uuid}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=8) as r:
            d = json.loads(r.read().decode('utf-8'))
            cdata = d.get('data', {})
            base = cdata.get('base_url', '')
            ch_path = cdata.get('chapter', {}).get('path', '')
            imgs = cdata.get('chapter', {}).get('data', [])
            sample_img = (base + ch_path + imgs[0]) if imgs else 'None'
            print(f"[OK] {s['title']} Ch.{ch0['number']}: {len(imgs)} panels. First panel: {sample_img}")
    except Exception as e:
        print(f"[ERROR] {s['title']} Ch.{ch0['number']}: {e}")
