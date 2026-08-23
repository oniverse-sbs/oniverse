import json
import os
import re

SHINIGAMI_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"

def clean_str(s):
    if not isinstance(s, str): return s
    return s.replace("", "'").replace("â€™", "'").replace("\u2019", "'").replace("\u2018", "'")

# Fix series.json
with open(os.path.join(SHINIGAMI_DIR, "series.json"), "r", encoding="utf-8") as f:
    series = json.load(f)

for s in series:
    s["title"] = clean_str(s.get("title", ""))
    s["alternative_title"] = clean_str(s.get("alternative_title", ""))
    s["synopsis"] = clean_str(s.get("synopsis", ""))

with open(os.path.join(SHINIGAMI_DIR, "series.json"), "w", encoding="utf-8") as f:
    json.dump(series, f, ensure_ascii=False, indent=2)

with open(os.path.join(SHINIGAMI_DIR, "data.js"), "w", encoding="utf-8") as f:
    f.write(f"window.SERIES_DATA = {json.dumps(series, ensure_ascii=False)};\n")

summary_series = []
for s in series:
    s_copy = dict(s)
    s_copy["chapters"] = []
    summary_series.append(s_copy)

with open(os.path.join(SHINIGAMI_DIR, "data-initial.js"), "w", encoding="utf-8") as f:
    f.write(f"window.SERIES_DATA = {json.dumps(summary_series, ensure_ascii=False)};\n")

with open(os.path.join(SHINIGAMI_DIR, "data-catalog.json"), "w", encoding="utf-8") as f:
    json.dump(summary_series, f, ensure_ascii=False, indent=2)

# Fix index.html
with open(os.path.join(SHINIGAMI_DIR, "index.html"), "r", encoding="utf-8") as f:
    html = f.read()

html = clean_str(html)
with open(os.path.join(SHINIGAMI_DIR, "index.html"), "w", encoding="utf-8") as f:
    f.write(html)

print("Cleaned up typography and quotes across all files!")
