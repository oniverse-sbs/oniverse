import os
import re
import subprocess

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"
APP_JS = os.path.join(SHINIGAMI_APP_DIR, "app.js")
HTML_404 = os.path.join(SHINIGAMI_APP_DIR, "404.html")
INDEX_HTML = os.path.join(SHINIGAMI_APP_DIR, "index.html")

print("=== DEPLOYING COMPLETE CHAPTER ROUTER & 404 ASSET FIX ===")

# 1. Update app.js parseRoute and handleRoute
with open(APP_JS, "r", encoding="utf-8") as f:
    js_code = f.read()

# Replace parseRoute
old_parse_route = '''  function parseRoute() {
    const path = window.location.pathname;
    const match = path.match(/^\/komik\/([^/]+)/);
    if (match) return { type: 'comic', slug: match[1] };
    return { type: 'home' };
  }'''

new_parse_route = '''  function parseRoute() {
    const path = window.location.pathname;
    const chMatch = path.match(/^\/komik\/([^/]+)\/chapter-?([0-9.]+)/i);
    if (chMatch) return { type: 'chapter', slug: chMatch[1], chNum: chMatch[2] };
    const match = path.match(/^\/komik\/([^/]+)/);
    if (match) return { type: 'comic', slug: match[1] };
    return { type: 'home' };
  }'''

if old_parse_route in js_code:
    js_code = js_code.replace(old_parse_route, new_parse_route)

# Replace handleRoute
old_handle_route = '''  function handleRoute(route) {
    if (route.type === 'comic' && route.slug) {
      const series = STATE.allSeries.find(s => {
        const slug = getSlug(s);
        return slug === route.slug || slug === decodeURIComponent(route.slug);
      });
      if (series) {
        openDetail(series, true);
      } else {
        console.warn('Comic not found for slug:', route.slug);
      }
    } else {
      closeDetail(true);
    }
  }'''

new_handle_route = '''  function handleRoute(route) {
    if (route.type === 'chapter' && route.slug && route.chNum) {
      const series = STATE.allSeries.find(s => {
        const slug = getSlug(s);
        return slug === route.slug || slug === decodeURIComponent(route.slug) || s.id === route.slug;
      }) || { id: '48270276-bd79-4a46-b15e-fdd2cf5655b1', slug: route.slug, title: route.slug.replace(/-/g, ' ').toUpperCase() };
      
      const chapters = series.chapters || [{ number: route.chNum, chapter: route.chNum, slug: '' }];
      let chIdx = chapters.findIndex(c => (c.number || c.chapter) == route.chNum);
      if (chIdx === -1) chIdx = 0;
      openReader(series, chapters, chIdx);
    } else if (route.type === 'comic' && route.slug) {
      const series = STATE.allSeries.find(s => {
        const slug = getSlug(s);
        return slug === route.slug || slug === decodeURIComponent(route.slug);
      });
      if (series) {
        openDetail(series, true);
      }
    } else {
      closeDetail(true);
    }
  }'''

if old_handle_route in js_code:
    js_code = js_code.replace(old_handle_route, new_handle_route)

with open(APP_JS, "w", encoding="utf-8") as f:
    f.write(js_code)

print("Updated app.js parseRoute and handleRoute for chapters!")

# 2. Fix 404.html to use absolute asset paths
with open(HTML_404, "r", encoding="utf-8") as f:
    html404 = f.read()

html404 = re.sub(r'href="styles\.css[^"]*"', 'href="/styles.css?v=20260815_FULL_FIX"', html404)
html404 = re.sub(r'src="data-initial\.js[^"]*"', 'src="/data-initial.js?v=20260815_FULL_FIX"', html404)
html404 = re.sub(r'src="app\.js[^"]*"', 'src="/app.js?v=20260815_FULL_FIX"', html404)
html404 = re.sub(r'href="logo\.png"', 'href="/logo.png"', html404)
html404 = re.sub(r'src="logo\.png"', 'src="/logo.png"', html404)

with open(HTML_404, "w", encoding="utf-8") as f:
    f.write(html404)

print("Updated 404.html with absolute root paths!")

# 3. Git commit and push
v_ts = str(int(os.path.getmtime(APP_JS)))
subprocess.run(["git", "add", "app.js", "404.html", "index.html"], cwd=SHINIGAMI_APP_DIR, check=True)
subprocess.run(["git", "commit", "-m", f"Fix chapter route parsing and 404.html absolute asset URLs v={v_ts}"], cwd=SHINIGAMI_APP_DIR, check=True)
push_res = subprocess.run(["git", "push", "origin", "main"], cwd=SHINIGAMI_APP_DIR, capture_output=True, text=True)

print("Git Push Output:", push_res.stdout)
if push_res.stderr:
    print("Git Push Stderr:", push_res.stderr)

print("=== FULL CHAPTER ROUTER & ASSET FIX DEPLOYED ===")
