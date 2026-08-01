import json

with open('scraped_data/series.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    '    <loc>https://oniverse.sbs/</loc>',
    '    <changefreq>daily</changefreq>',
    '    <priority>1.0</priority>',
    '  </url>'
]

for s in data:
    slug = s.get('slug','') or s.get('kc_slug','') or s.get('title','').lower().replace(' ','-')
    lines.append('  <url>')
    lines.append(f'    <loc>https://oniverse.sbs/?comic={slug}</loc>')
    lines.append('    <changefreq>daily</changefreq>')
    lines.append('    <priority>0.8</priority>')
    lines.append('  </url>')

lines.append('</urlset>')

with open('sitemap.xml', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f'Updated sitemap.xml with {len(data)} comic URLs!')
