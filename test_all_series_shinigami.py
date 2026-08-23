import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
headers = {'User-Agent': 'Mozilla/5.0'}

series_to_check = [
    ("a5d0bb1f-bfe4-4a5a-a72d-b7fa3695b202", "A Mercenary's Rebirth Among Nobles"),
    ("e4e70fb1-c2eb-4b84-be6a-42c1cbe5220c", "Return Of Frozen Player"),
    ("8ac46849-b4e0-4d3f-9e7e-f9a291502252", "Dark And Light Martial Emperor"),
    ("5b4a479f-37ed-41b3-8cb0-0358f4b8fdfc", "Trash Of The Count's Family"),
    ("9d0ec5d4-321d-4914-a692-250f64553f9c", "I Am Player Who Suck Alone"),
    ("e9f8b5dd-8558-4e9d-9fe9-e2bf2fe6f165", "Maxed Strength Necromancer"),
    ("c0f1d049-ff7f-474d-8c6a-3a55e4c44147", "Demonic Emperor"),
    ("16778db0-17c0-43c4-aa4a-3a4a0df5ec0b", "Overgeared"),
    ("48270276-bd79-4a46-b15e-fdd2cf5655b1", "One Piece"),
    ("f33095cb-4bae-42f3-bad0-a80106f2962b", "Marriage with a Suspiciously Demure Husband"),
    ("b6c97721-c026-4e02-bf1f-d443caadda8f", "Gachiakuta"),
]

for sid, sname in series_to_check:
    url = f"https://api.shngm.io/v1/chapter/{sid}/list?page=1&page_size=5"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=8) as r:
            res = json.loads(r.read().decode('utf-8'))
            chaps = res.get('data', [])
            total = len(chaps)
            first_ch = chaps[0] if chaps else {}
            print(f"[OK] {sname} ({sid}): {total} sample chaps, top Ch.{first_ch.get('chapter_number')} ID={first_ch.get('chapter_id')}")
    except Exception as e:
        print(f"[ERROR] {sname} ({sid}): {e}")
