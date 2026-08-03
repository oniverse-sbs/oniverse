"""
Generate comprehensive sitemap.xml from series.json data
+ Submit to IndexNow (Bing, Yandex instant indexing)
"""
import json
import os
import urllib.request
import ssl
import uuid
import time

BASE_URL = "https://oniverse.sbs"
PROJECT_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def generate_sitemap():
    """Generate sitemap.xml with all comic pages."""
    print("[1/3] Loading series data...")
    with open(os.path.join(PROJECT_DIR, "scraped_data", "series.json"), "r", encoding="utf-8") as f:
        series = json.load(f)
    
    # Handle both array and object format
    if isinstance(series, dict):
        series = series.get("series", [])
    
    print(f"  >> {len(series)} series loaded")
    
    today = time.strftime("%Y-%m-%d")
    
    urls = []
    
    # Homepage - highest priority
    urls.append({
        "loc": f"{BASE_URL}/",
        "lastmod": today,
        "changefreq": "daily",
        "priority": "1.0"
    })
    
    # Each comic gets a URL entry with properly encoded query param
    for s in series:
        slug = s.get("slug", "") or s.get("id", "") or s.get("title", "").lower().replace(" ", "-")
        if not slug or slug in ("kc-", "", "undefined"):
            continue
        title = s.get("title", "")
        updated = s.get("last_updated", "") or s.get("updated_at", "") or today
        
        # Normalize date
        if "T" in updated:
            updated = updated[:10]
        elif not updated:
            updated = today
        
        # Use clean slug URL (no query params in sitemap for better GSC compatibility)
        clean_slug = slug.replace(" ", "-").lower()
        # Remove UUID-only slugs (not meaningful for SEO)
        if len(clean_slug) == 36 and clean_slug.count("-") == 4:
            # It's a UUID, use title-based slug instead
            clean_slug = title.lower().strip().replace(" ", "-").replace("'", "").replace(",", "")[:60] if title else None
            if not clean_slug:
                continue
            
        urls.append({
            "loc": f"{BASE_URL}/komik/{clean_slug}/",
            "lastmod": updated[:10] if len(updated) >= 10 else today,
            "changefreq": "weekly",
            "priority": "0.8"
        })
    
    print(f"[2/3] Generating sitemap with {len(urls)} URLs...")
    
    xml_parts = ['<?xml version="1.0" encoding="UTF-8"?>']
    xml_parts.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    
    for u in urls:
        xml_parts.append("  <url>")
        xml_parts.append(f"    <loc>{u['loc']}</loc>")
        xml_parts.append(f"    <lastmod>{u['lastmod']}</lastmod>")
        xml_parts.append(f"    <changefreq>{u['changefreq']}</changefreq>")
        xml_parts.append(f"    <priority>{u['priority']}</priority>")
        xml_parts.append("  </url>")
    
    xml_parts.append("</urlset>")
    
    sitemap_path = os.path.join(PROJECT_DIR, "sitemap.xml")
    with open(sitemap_path, "w", encoding="utf-8") as f:
        f.write("\n".join(xml_parts))

    # Also generate sitemap_index.xml
    index_xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <sitemap>',
        f'    <loc>{BASE_URL}/sitemap.xml</loc>',
        f'    <lastmod>{today}</lastmod>',
        '  </sitemap>',
        '</sitemapindex>'
    ]
    index_path = os.path.join(PROJECT_DIR, "sitemap_index.xml")
    with open(index_path, "w", encoding="utf-8") as f:
        f.write("\n".join(index_xml))
    
    print(f"  >> Sitemap saved ({len(urls)} URLs) + sitemap_index.xml generated")
    return urls

def generate_indexnow_key():
    """Generate IndexNow verification key."""
    key = uuid.uuid4().hex[:32]
    
    # Save key as text file (required by IndexNow)
    key_path = os.path.join(PROJECT_DIR, f"{key}.txt")
    with open(key_path, "w") as f:
        f.write(key)
    
    print(f"  >> IndexNow key: {key}")
    return key

def submit_indexnow(urls, key):
    """Submit URLs to IndexNow API for Bing/Yandex instant indexing."""
    print(f"[3/3] Submitting {min(len(urls), 100)} URLs to IndexNow (Bing + Yandex)...")
    
    # IndexNow accepts max 10000 URLs per batch
    url_list = [u["loc"] for u in urls[:100]]  # Submit first 100
    
    payload = json.dumps({
        "host": "oniverse.sbs",
        "key": key,
        "keyLocation": f"https://oniverse.sbs/{key}.txt",
        "urlList": url_list
    }).encode("utf-8")
    
    # Submit to multiple engines
    engines = [
        "https://api.indexnow.org/indexnow",
        "https://www.bing.com/indexnow",
        "https://yandex.com/indexnow",
    ]
    
    for engine in engines:
        try:
            req = urllib.request.Request(
                engine,
                data=payload,
                headers={
                    "Content-Type": "application/json; charset=utf-8",
                    "User-Agent": "OniVerse-SEO/1.0"
                },
                method="POST"
            )
            resp = urllib.request.urlopen(req, context=ctx, timeout=10)
            print(f"  >> {engine}: {resp.status} OK [Success]")
        except urllib.error.HTTPError as e:
            print(f"  >> {engine}: HTTP {e.code} ({e.reason})")
        except Exception as e:
            print(f"  >> {engine}: {e}")

def main():
    print("=" * 50)
    print("  OniVerse SEO Optimizer")
    print("=" * 50)
    
    urls = generate_sitemap()
    key = generate_indexnow_key()
    submit_indexnow(urls, key)
    
    print(f"\n{'=' * 50}")
    print("  SEO DONE!")
    print(f"  - Sitemap: {len(urls)} URLs")
    print(f"  - IndexNow key file: {key}.txt")
    print(f"  - Submitted to: Bing, Yandex, IndexNow API")
    print(f"\n  NEXT: Submit sitemap to Google Search Console:")
    print(f"  https://search.google.com/search-console")
    print(f"{'=' * 50}")

if __name__ == "__main__":
    main()
