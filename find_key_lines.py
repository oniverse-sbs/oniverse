import re

# Search for specific patterns in app.js
with open(r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app\app.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the catalog loading / chapter lookup logic
keywords = [
    "loadCatalog", "loadDetail", "fetch.*detail", "getChapters", "sortedChapters",
    "renderDetail", "renderComicDetail", "openDetail", "loadComicDetail",
    "All Hail", "ch_548", "chapter-", "getSlug",
    "history.pushState", "chapters.find", "chapter_number"
]

print("=== KEY LINE SEARCH ===")
for i, line in enumerate(lines, 1):
    for kw in keywords:
        if re.search(kw, line, re.IGNORECASE):
            print(f"Line {i}: {line.rstrip()[:200]}")
            break
