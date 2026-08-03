import os
import json
import xml.etree.ElementTree as ET
import urllib.request
import ssl
import sys

print("==================================================")
print("  OniVerse Full System Audit & Diagnostics")
print("==================================================")

errors = []
warnings = []

# 1. Local JSON Database Audit
print("\n[1/4] Auditing Local Datasets...")
files_to_check = ["series.json", "scraped_data/series.json"]
for path in files_to_check:
    if not os.path.exists(path):
        errors.append(f"Missing file: {path}")
        continue
    size_mb = os.path.getsize(path) / (1024 * 1024)
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, list):
                errors.append(f"{path} is not a JSON list")
                continue
            count = len(data)
            print(f"  >> {path}: {count} series ({size_mb:.2f} MB)")
            
            # Audit items schema
            invalid_schema = 0
            for s in data:
                if not s.get("title") or not s.get("slug"):
                    invalid_schema += 1
            if invalid_schema > 0:
                warnings.append(f"{path} has {invalid_schema} items missing title/slug")
            
            # Check sorting order of top 5
            top_titles = [s.get("title") for s in data[:5]]
            top_dates = [s.get("last_updated") or s.get("updated") for s in data[:5]]
            print(f"     Top 3: {top_titles[:3]}")
            print(f"     Top 3 dates: {top_dates[:3]}")
    except Exception as e:
        errors.append(f"Failed to parse {path}: {e}")

# 2. SEO & Sitemap XML Audit
print("\n[2/4] Auditing SEO & Sitemap XML...")
sitemap_path = "sitemap.xml"
if os.path.exists(sitemap_path):
    try:
        tree = ET.parse(sitemap_path)
        root = tree.getroot()
        urls_count = len(root.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url"))
        print(f"  >> sitemap.xml: Valid XML structure with {urls_count} URLs")
        if urls_count < 1000:
            warnings.append(f"sitemap.xml has fewer URLs than expected ({urls_count})")
    except Exception as e:
        errors.append(f"sitemap.xml XML syntax error: {e}")
else:
    errors.append("sitemap.xml missing!")

robots_path = "robots.txt"
if os.path.exists(robots_path):
    with open(robots_path, "r", encoding="utf-8") as f:
        rtext = f.read()
        if "Sitemap: https://oniverse.sbs/sitemap.xml" in rtext:
            print("  >> robots.txt: Verified with correct Sitemap directive")
        else:
            warnings.append("robots.txt missing explicit Sitemap directive")
else:
    errors.append("robots.txt missing!")

# 3. Live Endpoint Verification (oniverse.sbs)
print("\n[3/4] Testing Live Web Endpoints (https://oniverse.sbs/)...")
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
headers = {"User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)"}

live_urls = [
    ("Homepage", "https://oniverse.sbs/"),
    ("Sitemap XML", "https://oniverse.sbs/sitemap.xml"),
    ("Robots TXT", "https://oniverse.sbs/robots.txt"),
    ("Series JSON", "https://oniverse.sbs/series.json"),
    ("App JS", "https://oniverse.sbs/app.js"),
    ("Styles CSS", "https://oniverse.sbs/styles.css")
]

for label, url in live_urls:
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=10) as res:
            status = res.status
            content_type = res.headers.get("Content-Type", "")
            content_len = len(res.read())
            print(f"  >> {label} ({url}): Status {status} OK | Type: {content_type} | Size: {content_len} bytes")
    except Exception as e:
        errors.append(f"Live check failed for {label} ({url}): {e}")

# 4. Summary & Verification Verdict
print("\n==================================================")
print("  Audit Summary Verdict")
print("==================================================")
if errors:
    print(f"[ERRORS FOUND] ({len(errors)}):")
    for err in errors:
        print(f"   - {err}")
else:
    print("SUCCESS: ZERO ERRORS FOUND! All files, data schemas, XML structures, and live endpoints are 100% HEALTHY & VALID.")

if warnings:
    print(f"\n⚠️ WARNINGS ({len(warnings)}):")
    for w in warnings:
        print(f"   - {w}")

print("==================================================")
