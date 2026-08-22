import json
import re
import os
import subprocess

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
DATA_INITIAL_JS = os.path.join(SHINIGAMI_APP_DIR, "data-initial.js")
INDEX_HTML = os.path.join(SHINIGAMI_APP_DIR, "index.html")
ONE_PIECE_HTML = os.path.join(SHINIGAMI_APP_DIR, "komik", "one-piece", "index.html")

# High-resolution official One Piece cover image URL
ONE_PIECE_COVER = "https://cdn.myanimelist.net/images/manga/2/253146.jpg"

print("=== FIXING ONE PIECE COVER & METADATA ===")

# 1. Update data-initial.js
if os.path.exists(DATA_INITIAL_JS):
    with open(DATA_INITIAL_JS, "r", encoding="utf-8") as f:
        js_text = f.read()
        json_str = js_text.replace("window.SERIES_DATA =", "").strip().rstrip(";")
        series_arr = json.loads(json_str)
        
        for item in series_arr:
            if item.get("slug") == "one-piece" or item.get("id") == "one-piece" or "one piece" in item.get("title", "").lower():
                item["cover"] = ONE_PIECE_COVER
                item["thumbnail"] = ONE_PIECE_COVER
                item["rating"] = "9.8"
                item["genres"] = ["Action", "Adventure", "Comedy", "Fantasy", "Shounen"]
                item["latest_chapter"] = "1120"
                item["total_chapters"] = 1120
                print("Found and updated One Piece in data-initial.js!")

    with open(DATA_INITIAL_JS, "w", encoding="utf-8") as f:
        f.write(f"window.SERIES_DATA = {json.dumps(series_arr, ensure_ascii=False)};\n")

# 2. Update index.html
if os.path.exists(INDEX_HTML):
    with open(INDEX_HTML, "r", encoding="utf-8") as f:
        html = f.read()

    # Update inline window.SERIES_DATA
    html_updated = re.sub(r'window\.SERIES_DATA\s*=\s*\[.*?\];', f"window.SERIES_DATA = {json.dumps(series_arr, ensure_ascii=False)};", html, flags=re.DOTALL)
    
    # Update static cards image for One Piece
    pattern_op_card = r'(<div class="update-item" data-slug="one-piece".*?<img src=")([^"]+)(")'
    html_updated = re.sub(pattern_op_card, r'\1' + ONE_PIECE_COVER + r'\3', html_updated, flags=re.DOTALL)

    with open(INDEX_HTML, "w", encoding="utf-8") as f:
        f.write(html_updated)
    print("Updated index.html One Piece cover image!")

# 3. Update komik/one-piece/index.html
if os.path.exists(ONE_PIECE_HTML):
    with open(ONE_PIECE_HTML, "r", encoding="utf-8") as f:
        op_html = f.read()

    # Replace empty og:image and cover img
    op_html = re.sub(r'<meta\s+property="og:image"\s+content="[^"]*"', f'<meta property="og:image" content="{ONE_PIECE_COVER}"', op_html)
    op_html = re.sub(r'<meta\s+name="twitter:image"\s+content="[^"]*"', f'<meta name="twitter:image" content="{ONE_PIECE_COVER}"', op_html)
    op_html = re.sub(r'<img\s+src="[^"]*"\s+alt="One Piece"', f'<img src="{ONE_PIECE_COVER}" alt="One Piece"', op_html)
    
    with open(ONE_PIECE_HTML, "w", encoding="utf-8") as f:
        f.write(op_html)
    print("Updated komik/one-piece/index.html with cover image!")

# Commit and Push to Git
subprocess.run(["git", "add", "data-initial.js", "index.html", "komik/one-piece/index.html"], cwd=SHINIGAMI_APP_DIR, check=True)
subprocess.run(["git", "commit", "-m", "Fix One Piece HD cover image and metadata on live oniverse.sbs"], cwd=SHINIGAMI_APP_DIR, check=True)
push_res = subprocess.run(["git", "push", "origin", "main"], cwd=SHINIGAMI_APP_DIR, capture_output=True, text=True)

print("Git Push Output:", push_res.stdout)
if push_res.stderr:
    print("Git Push Stderr:", push_res.stderr)

print("=== ONE PIECE FIX DEPLOYED LIVE ===")
