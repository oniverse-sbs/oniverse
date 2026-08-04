---
name: anti-banned-security
description: Best practices, techniques, and automated safeguards for protecting comic reader sites (OniVerse) against domain bans, rate-limiting, IP blocks, DMCA strikes, and anti-scraping countermeasures.
---

# Anti-Banned & Security Safeguards Skill for Comic Reader Platforms

Guide and operational procedures for securing comic reading platforms (e.g., OniVerse) against IP bans, rate-limiting from upstream APIs, domain blocks, DMCA strikes, and scraper abuse.

---

## 1. Upstream API Protection & Anti-Rate Limiting

When fetching comic chapters or series metadata from upstream APIs (Shinigami, Komikcast, MangaDex):

### A. Dynamic User-Agent & Header Spoofing
- **Never use default library headers** (e.g. `python-urllib`, `requests`, `axios`). Always mimic real browser headers:
  ```python
  HEADERS = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "Origin": "https://shinigami.id",
      "Referer": "https://shinigami.id/",
      "Sec-Ch-Ua": '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
  }
  ```

### B. Request Throttling & Jitter Delay
- Add randomized delays between batch API calls (50ms – 300ms) to simulate natural browsing:
  ```python
  import time, random
  time.sleep(random.uniform(0.1, 0.35))
  ```

### C. Multi-Mirror & API Fallback Chain
- Maintain a fallback chain of alternative API endpoints in case one domain gets blocked:
  ```javascript
  const API_MIRRORS = [
    'https://api.shngm.io/v1',
    'https://be.komikcast.cc',
    'https://api.mangadex.org'
  ];
  ```

---

## 2. Client-Side Anti-Inspection & Asset Shielding

Protect website assets, API endpoints, and images from being scraped or hotlinked by third-party bots:

1. **Disable Context Menu & Inspection Shortcuts**:
   - Block `F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+U`, `Ctrl+S`.
   - Implement anti-debugging using performance timing check (`debugger;`).
2. **Image Hotlink & Drag Protection**:
   - Apply `user-drag: none;` and transparent click overlay on image canvas.
   - Serve comic pages via Cloudflare Image Resizer or encrypted proxy paths if direct CDN links expire.

---

## 3. DMCA & Domain Resilience (Anti-Domain Ban)

### A. Non-Hosting Architecture (Proxy / Indexer Model)
- Ensure the platform operates strictly as an **indexer/aggregator** and does NOT host copyrighted manga image files directly on primary server storage.
- All image URLs are loaded dynamically via reader proxy or upstream CDN.

### B. Automated DMCA Takedown Compliance
- Keep a clean, accessible `/dmca` or DMCA modal where copyright holders can submit notice requests.
- Soft-delete or hide requested series by ID instantly via blacklist in `seo_fix_all.py` / `data-catalog.json`:
  ```python
  DMCA_BLACKLIST = {"blocked_slug_1", "blocked_slug_2"}
  ```

### C. Cloudflare Domain Failover & CNAME Aliases
- Use Cloudflare Pages / Edge Workers with multiple CNAME domain aliases (`oniverse.sbs`, `oniverse.site`, `oniverse.me`).
- In case of domain DNS blocks, automatically redirect traffic via Cloudflare Worker script.

---

## 4. Local Caching Strategy to Reduce Upstream Load

- Store scraped data in local JSON chunks (`data-initial.js`, `data-catalog.json`, `/data/detail/<slug>.json`).
- Avoid live `no-cache` API fetches on client page loads; serve static JSON from Cloudflare Edge CDN to reduce origin requests to 0.
