import os
import glob
import re

html_files = glob.glob('komik/*/index.html')
print(f"Fixing script & css paths in {len(html_files)} subfolder landing pages...")

updated_count = 0

for fpath in html_files:
    try:
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()

        new_content = content
        new_content = re.sub(r'src=["\']data-initial\.js', 'src="/data-initial.js', new_content)
        new_content = re.sub(r'src=["\']app\.js', 'src="/app.js', new_content)
        new_content = re.sub(r'href=["\']styles\.css', 'href="/styles.css', new_content)
        new_content = re.sub(r'src=["\']logo\.png', 'src="/logo.png', new_content)
        new_content = re.sub(r'href=["\']logo\.png', 'href="/logo.png', new_content)

        if new_content != content:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            updated_count += 1
    except Exception as e:
        pass

print(f"Successfully fixed root asset paths in {updated_count} subfolder landing pages!")
