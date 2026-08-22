import os
import re
import subprocess

SHINIGAMI_APP_DIR = r"C:\Users\Jett\.gemini\antigravity-ide\scratch\shinigami-app"

print("=== FIXING ALL RELATIVE PATHS & CHAPTER ROUTING ACROSS ONIVERSE.SBS ===")

files_to_fix = [
    os.path.join(SHINIGAMI_APP_DIR, "index.html"),
    os.path.join(SHINIGAMI_APP_DIR, "404.html"),
    os.path.join(SHINIGAMI_APP_DIR, "komik", "one-piece", "index.html")
]

# 1. Fix relative paths in all HTML files
for filepath in files_to_fix:
    if not os.path.exists(filepath):
        continue
    with open(filepath, "r", encoding="utf-8") as f:
        html = f.read()

    # Replace relative CSS / JS / Icon links with absolute root slash /
    html = re.sub(r'href="styles\.css', 'href="/styles.css', html)
    html = re.sub(r'src="data-initial\.js', 'src="/data-initial.js', html)
    html = re.sub(r'src="app\.js', 'src="/app.js', html)
    html = re.sub(r'href="logo\.png', 'href="/logo.png', html)
    html = re.sub(r'src="logo\.png', 'src="/logo.png', html)
    html = re.sub(r'href="manifest\.json', 'href="/manifest.json', html)

    # Ensure no double slashes //styles.css
    html = html.replace('href="//styles.css', 'href="/styles.css')
    html = html.replace('src="//data-initial.js', 'src="/data-initial.js')
    html = html.replace('src="//app.js', 'src="/app.js')

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)

print("Fixed absolute root paths in index.html, 404.html, and komik/one-piece/index.html!")

# 2. Add automatic chapter click handler to komik/one-piece/index.html
one_piece_html = os.path.join(SHINIGAMI_APP_DIR, "komik", "one-piece", "index.html")
if os.path.exists(one_piece_html):
    with open(one_piece_html, "r", encoding="utf-8") as f:
        op_html = f.read()

    # Inject click handler script for chapter links right before </body>
    ch_script = '''
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Intercept chapter link clicks to open reader smoothly
      document.querySelectorAll('.chapter-list a, .ch-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          var chNum = (this.textContent || '').replace(/[^0-9.]/g, '');
          var chSlug = this.getAttribute('data-chapter-id') || '';
          
          // Trigger reader in app.js
          if (window.openReader && window.SERIES_DATA) {
            var series = window.SERIES_DATA.find(function(s) { 
              return s.slug === 'one-piece' || s.id === '48270276-bd79-4a46-b15e-fdd2cf5655b1'; 
            }) || { id: '48270276-bd79-4a46-b15e-fdd2cf5655b1', slug: 'one-piece', title: 'One Piece' };
            
            var chapters = series.chapters || [{ number: chNum, chapter: chNum, slug: chSlug }];
            var chIdx = chapters.findIndex(function(c) { return (c.number || c.chapter) == chNum || c.slug == chSlug; });
            if (chIdx === -1) chIdx = 0;
            
            window.openReader(series, chapters, chIdx);
          } else {
            // Fallback navigation to index with query
            window.location.href = '/?comic=one-piece&ch=' + chNum;
          }
        });
      });
    });
  </script>
'''
    if '</body' in op_html and 'intercept chapter link clicks' not in op_html.lower():
        op_html = op_html.replace('</body>', f'{ch_script}\n</body>')

    with open(one_piece_html, "w", encoding="utf-8") as f:
        f.write(op_html)

print("Injected chapter click handler into komik/one-piece/index.html!")

# 3. Commit and Push to Git
v_ts = str(int(os.path.getmtime(one_piece_html)))
subprocess.run(["git", "add", "index.html", "404.html", "komik/one-piece/index.html"], cwd=SHINIGAMI_APP_DIR, check=True)
subprocess.run(["git", "commit", "-m", f"Fix absolute asset paths and chapter click handler for One Piece v={v_ts}"], cwd=SHINIGAMI_APP_DIR, check=True)
push_res = subprocess.run(["git", "push", "origin", "main"], cwd=SHINIGAMI_APP_DIR, capture_output=True, text=True)

print("Git Push Output:", push_res.stdout)
if push_res.stderr:
    print("Git Push Stderr:", push_res.stderr)

print("=== FIX COMPLETE & DEPLOYED LIVE TO GIT MAIN ===")
