import re

with open(r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app\app.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines, 1):
    if "api.shngm.io" in line or "Disinkronkan" in line or "openReader" in line or "fetchChapter" in line or "chapter/detail" in line:
        print(f"Line {i}: {line.strip()[:150]}")
