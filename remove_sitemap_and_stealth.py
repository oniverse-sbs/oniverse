import os
import re
import subprocess
from datetime import datetime

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
INDEX_HTML = os.path.join(SHINIGAMI_APP_DIR, "index.html")
HTML_404 = os.path.join(SHINIGAMI_APP_DIR, "404.html")
ONE_PIECE_HTML = os.path.join(SHINIGAMI_APP_DIR, "komik", "one-piece", "index.html")
ROBOTS_TXT = os.path.join(SHINIGAMI_APP_DIR, "robots.txt")
SITEMAP_XML = os.path.join(SHINIGAMI_APP_DIR, "sitemap.xml")

print("=== REMOVING SITEMAP & STEALTH OPTIMIZATION FOR DMCA PROTECTION ===")

# 1. Remove sitemap.xml if exists
if os.path.exists(SITEMAP_XML):
    os.remove(SITEMAP_XML)
    print("Deleted sitemap.xml!")

# 2. Update robots.txt to remove Sitemap lines
robots_content = '''# OniVerse.SBS Robots.txt
User-agent: *
Allow: /

Disallow: /data/
Disallow: /scraped_data/
Disallow: /*.json$
Disallow: /*.py$
'''
with open(ROBOTS_TXT, "w", encoding="utf-8") as f:
    f.write(robots_content)

print("Updated robots.txt (removed Sitemap links)!")

# 3. Remove sitemap references from HTML files
for filepath in [INDEX_HTML, HTML_404, ONE_PIECE_HTML]:
    if not os.path.exists(filepath):
        continue
    with open(filepath, "r", encoding="utf-8") as f:
        html = f.read()

    html = re.sub(r'<link\s+rel="sitemap"[^>]*>', '', html, flags=re.IGNORECASE)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)

print("Removed sitemap link tags from index.html, 404.html, and komik/one-piece/index.html!")

# 4. Commit and Push to Git
v_ts = str(int(datetime.now().timestamp()))
subprocess.run(["git", "rm", "--ignore-unmatch", "sitemap.xml"], cwd=SHINIGAMI_APP_DIR, check=True)
subprocess.run(["git", "add", "robots.txt", "index.html", "404.html", "komik/one-piece/index.html"], cwd=SHINIGAMI_APP_DIR, check=True)
subprocess.run(["git", "commit", "-m", f"Remove sitemap.xml and enable stealth mode for DMCA protection v={v_ts}"], cwd=SHINIGAMI_APP_DIR, check=True)
push_res = subprocess.run(["git", "push", "origin", "main"], cwd=SHINIGAMI_APP_DIR, capture_output=True, text=True)

print("Git Push Output:", push_res.stdout)
if push_res.stderr:
    print("Git Push Stderr:", push_res.stderr)

print("=== STEALTH DMCA PROTECTION COMPLETE & DEPLOYED ===")
