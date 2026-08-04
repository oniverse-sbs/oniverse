import urllib.request
import re

url = 'https://wurmz.net/?s=bungsu'
headers = {'User-Agent': 'Mozilla/5.0'}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, timeout=8) as r:
        html = r.read().decode('utf-8', errors='ignore')
        links = re.findall(r'href=["\']([^"\']+)["\']', html)
        detail_links = [l for l in set(links) if '/detail/' in l]
        print("Wurmz search detail links for bungsu:")
        for l in detail_links:
            print("  -", l)
except Exception as e:
    print("Wurmz search error:", e)
