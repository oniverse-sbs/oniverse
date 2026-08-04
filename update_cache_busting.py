import os
import re

files_to_update = [
    'index.html',
    '404.html',
    os.path.join('komik', 'aku-menjadi-ibu-pemeran-utama-laki-laki', 'index.html')
]

for fpath in files_to_update:
    if os.path.exists(fpath):
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
        content = re.sub(r'data-initial\.js\?v=[^"\']+', 'data-initial.js?v=20260804_wurmz_v2', content)
        content = re.sub(r'app\.js\?v=[^"\']+', 'app.js?v=20260804_wurmz_v2', content)
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)

print("Successfully updated cache busters in html files!")
