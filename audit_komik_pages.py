import glob
import os
import re

shinigami_dir = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
komik_pages = glob.glob(os.path.join(shinigami_dir, "komik", "*", "index.html"))
print(f"Total komik detail HTML pages: {len(komik_pages)}")

for kp in komik_pages:
    rel = os.path.relpath(kp, shinigami_dir)
    with open(kp, "r", encoding="utf-8") as f:
        content = f.read()
        issues = []
        if "styles.css" not in content:
            issues.append("Missing styles.css")
        if "app.js" not in content:
            issues.append("Missing app.js")
        if ">NaN<" in content:
            issues.append("Contains >NaN<")
        if ">undefined<" in content:
            issues.append("Contains >undefined<")
        if "Chapter N/A" in content:
            issues.append("Contains Chapter N/A")
        if issues:
            print(f"Issues in {rel}: {', '.join(issues)}")
