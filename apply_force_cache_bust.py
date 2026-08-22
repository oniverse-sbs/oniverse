import json
import re
import os
import subprocess
import time

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
INDEX_HTML = os.path.join(SHINIGAMI_APP_DIR, "index.html")

# Read index.html
with open(INDEX_HTML, "r", encoding="utf-8") as f:
    html = f.read()

# Force cache busting query parameter for all CSS/JS scripts
v_timestamp = str(int(time.time()))

html_updated = re.sub(r'data-initial\.js\?v=[^"]+', f'data-initial.js?v={v_timestamp}', html)
html_updated = re.sub(r'styles\.css\?v=[^"]+', f'styles.css?v={v_timestamp}', html_updated)
html_updated = re.sub(r'app\.js\?v=[^"]+', f'app.js?v={v_timestamp}', html_updated)

with open(INDEX_HTML, "w", encoding="utf-8") as f:
    f.write(html_updated)

print(f"Force cache-busted index.html with v={v_timestamp}")

# Commit and Push to Git
subprocess.run(["git", "add", "index.html", "_headers"], cwd=SHINIGAMI_APP_DIR, check=True)
subprocess.run(["git", "commit", "-m", f"Force Cache Bust v={v_timestamp} and disable CDN caching in _headers"], cwd=SHINIGAMI_APP_DIR, check=True)
push_res = subprocess.run(["git", "push", "origin", "main"], cwd=SHINIGAMI_APP_DIR, capture_output=True, text=True)

print("Git Push Output:", push_res.stdout)
if push_res.stderr:
    print("Git Push Stderr:", push_res.stderr)

print("=== FORCE CACHE BUST DEPLOYED TO GIT MAIN ===")
