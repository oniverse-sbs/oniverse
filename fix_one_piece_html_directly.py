import os
import re
import subprocess

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
ONE_PIECE_HTML = os.path.join(SHINIGAMI_APP_DIR, "komik", "one-piece", "index.html")
COVER_URL = "https://cdn.myanimelist.net/images/manga/2/253146.jpg"

print("=== FIXING ONE PIECE COVER IMAGE IN KOMIK/ONE-PIECE/INDEX.HTML ===")

with open(ONE_PIECE_HTML, "r", encoding="utf-8") as f:
    html = f.read()

# Replace empty src in img tag for One Piece cover
html_fixed = re.sub(r'<img\s+src=""\s+alt="Cover One Piece', f'<img src="{COVER_URL}" alt="Cover One Piece', html)
html_fixed = re.sub(r'<meta\s+property="og:image"\s+content=""', f'<meta property="og:image" content="{COVER_URL}"', html_fixed)
html_fixed = re.sub(r'<meta\s+name="twitter:image"\s+content=""', f'<meta name="twitter:image" content="{COVER_URL}"', html_fixed)
html_fixed = re.sub(r'"image":\s*""', f'"image": "{COVER_URL}"', html_fixed)

with open(ONE_PIECE_HTML, "w", encoding="utf-8") as f:
    f.write(html_fixed)

print("Successfully replaced img src in komik/one-piece/index.html!")

# Git add, commit, push
subprocess.run(["git", "add", "komik/one-piece/index.html"], cwd=SHINIGAMI_APP_DIR, check=True)
subprocess.run(["git", "commit", "-m", "Fix One Piece cover image URL in komik/one-piece/index.html"], cwd=SHINIGAMI_APP_DIR, check=True)
push_res = subprocess.run(["git", "push", "origin", "main"], cwd=SHINIGAMI_APP_DIR, capture_output=True, text=True)

print("Git Push Output:", push_res.stdout)
if push_res.stderr:
    print("Git Push Stderr:", push_res.stderr)

print("=== ONE PIECE COVER FIX COMPLETE ===")
