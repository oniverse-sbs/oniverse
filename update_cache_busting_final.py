import os
import glob
import re

new_v = "20260804_vFINAL_SUPER_FIX"

print(f"Updating cache buster to {new_v} in index.html and all subfolder landing pages...")

# 1. Update index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

new_html = re.sub(r'app\.js\?v=[^"\'\s>]+', f'app.js?v={new_v}', html)
new_html = re.sub(r'data-initial\.js\?v=[^"\'\s>]+', f'data-initial.js?v={new_v}', new_html)
new_html = re.sub(r'data-catalog\.json\?v=[^"\'\s>]+', f'data-catalog.json?v={new_v}', new_html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

# 2. Update subfolder landing pages
html_files = glob.glob('komik/*/index.html') + glob.glob('genre/*/index.html')
updated_count = 0

for fpath in html_files:
    try:
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()

        nc = re.sub(r'app\.js\?v=[^"\'\s>]+', f'app.js?v={new_v}', content)
        nc = re.sub(r'data-initial\.js\?v=[^"\'\s>]+', f'data-initial.js?v={new_v}', nc)
        nc = re.sub(r'data-catalog\.json\?v=[^"\'\s>]+', f'data-catalog.json?v={new_v}', nc)

        if nc != content:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(nc)
            updated_count += 1
    except Exception as e:
        pass

print(f"Updated cache busters in index.html and {updated_count} subfolder landing pages!")
