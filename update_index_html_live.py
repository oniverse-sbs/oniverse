import json
import re
import os
import subprocess

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
INDEX_HTML = os.path.join(SHINIGAMI_APP_DIR, "index.html")
DATA_INITIAL_JS = os.path.join(SHINIGAMI_APP_DIR, "data-initial.js")

# Read updated data-initial.js
with open(DATA_INITIAL_JS, "r", encoding="utf-8") as f:
    js_content = f.read()
    series_json_str = js_content.replace("window.SERIES_DATA =", "").strip().rstrip(";")

# Read index.html
with open(INDEX_HTML, "r", encoding="utf-8") as f:
    html_content = f.read()

# Replace inline window.SERIES_DATA = [...] inside index.html
pattern = r'window\.SERIES_DATA\s*=\s*\[.*?\];'
replacement = f"window.SERIES_DATA = {series_json_str};"

new_html = re.sub(pattern, replacement, html_content, flags=re.DOTALL)

with open(INDEX_HTML, "w", encoding="utf-8") as f:
    f.write(new_html)

print(f"Updated inline window.SERIES_DATA in {INDEX_HTML}!")

# Commit and Push to git
subprocess.run(["git", "add", "index.html", "data-initial.js"], cwd=SHINIGAMI_APP_DIR, check=True)
subprocess.run(["git", "commit", "-m", "Deploy inline SERIES_DATA update for oniverse.sbs"], cwd=SHINIGAMI_APP_DIR, check=True)
push_res = subprocess.run(["git", "push", "origin", "main"], cwd=SHINIGAMI_APP_DIR, capture_output=True, text=True)

print("Git Push Result:", push_res.stdout)
if push_res.stderr:
    print("Git Push Error:", push_res.stderr)

print("=== INLINE INDEX.HTML LIVE DEPLOYMENT COMPLETE ===")
