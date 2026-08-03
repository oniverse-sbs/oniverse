---
name: auto-sync-comics
description: Automated real-time comic catalog scraper, sorter, SEO submitter, and GitHub push workflow. Use whenever updating latest comic chapters.
---

# Auto Sync & Scrape Latest Comics Workflow

When executing this skill to fetch and push latest comic updates:

1. **Run Scraper**:
   Execute `python fast_update.py` to fetch page 1..15 from Komikcast & Shinigami APIs, sort descending by ISO timestamp, and update `series.json`, `scraped_data/series.json`, and `data.js`.

2. **Generate SEO & Sitemap**:
   Execute `python seo_submit.py` to update `sitemap.xml`, `sitemap_index.xml`, and submit URLs to IndexNow APIs.

3. **Run System Audit**:
   Execute `python full_audit.py` to verify local datasets, XML structure, and live HTTP endpoint responses.

4. **Git Commit & Push**:
   Run `git add .`, `git commit -m "Auto-sync latest comic releases"`, and `git push` to deploy live changes to GitHub Pages instantly.
