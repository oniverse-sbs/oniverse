/* ==========================================================================
   OniVerse.SBS — Application Logic
   ========================================================================== */

(function() {
  'use strict';

  // ==========================================================================
  //  STATE
  // ==========================================================================
  const STATE = {
    allSeries: [],
    filtered: [],
    displayCount: 12,
    perPage: 12,
    currentSlide: 0,
    sliderTimer: null,
    currentDetail: null,
    currentReader: { series: null, chapterIdx: -1, chapters: [] },
    bookmarks: JSON.parse(localStorage.getItem('oniverse_bookmarks') || '[]'),
    history: JSON.parse(localStorage.getItem('oniverse_history') || '[]'),
    readingStats: JSON.parse(localStorage.getItem('oniverse_stats') || '{"read":0,"chapters":0,"streak":0,"lastDate":""}'),
  };

  // ==========================================================================
  //  UTILITY
  // ==========================================================================
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const fmtNum = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n);

  function getSlug(s) {
    if (s.slug) return s.slug;
    if (s.id) return s.id;
    return (s.title || s.name || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function saveBookmarks() { localStorage.setItem('oniverse_bookmarks', JSON.stringify(STATE.bookmarks)); }
  function saveHistory() { localStorage.setItem('oniverse_history', JSON.stringify(STATE.history)); }
  function saveStats() { localStorage.setItem('oniverse_stats', JSON.stringify(STATE.readingStats)); }

  function getCover(s) {
    if (s.cover) return s.cover;
    if (s.thumbnail) return s.thumbnail;
    if (s.cover_image_url) return s.cover_image_url;
    if (s.cover_portrait_url) return s.cover_portrait_url;
    if (s.image) return s.image;
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" fill="%2314122c"><rect width="200" height="280"/><text x="50%" y="50%" fill="%235b21b6" font-size="14" text-anchor="middle" dominant-baseline="middle">No Cover</text></svg>';
  }

  // ==========================================================================
  //  TOAST NOTIFICATIONS
  // ==========================================================================
  function showToast(message, type = 'info') {
    const container = $('#toast-container');
    const icons = { success: 'fa-circle-check', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3100);
  }

  // ==========================================================================
  //  READING STATS
  // ==========================================================================
  function updateStreak() {
    const today = new Date().toDateString();
    const s = STATE.readingStats;
    if (s.lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      s.streak = (s.lastDate === yesterday) ? s.streak + 1 : 1;
      s.lastDate = today;
      saveStats();
    }
  }

  function trackRead(seriesTitle) {
    const s = STATE.readingStats;
    s.read++;
    s.chapters++;
    updateStreak();
    saveStats();
    renderStats();
  }

  function renderStats() {
    const s = STATE.readingStats;
    const el = (id) => document.getElementById(id);
    if (el('stat-read')) el('stat-read').textContent = s.read;
    if (el('stat-chapters')) el('stat-chapters').textContent = s.chapters;
    if (el('stat-streak')) el('stat-streak').innerHTML = `${s.streak}<i class="fa-solid fa-fire"></i>`;
  }

  // ==========================================================================
  //  DATA LOAD
  // ==========================================================================
  async function loadData() {
    if (window.SERIES_DATA && Array.isArray(window.SERIES_DATA) && window.SERIES_DATA.length > 0) {
      console.log('Loaded data instantly from window.SERIES_DATA:', window.SERIES_DATA.length);
      STATE.allSeries = window.SERIES_DATA;
      STATE.filtered = [...STATE.allSeries];
      onDataReady();
      return;
    }

    const candidates = [
      'series.json',
      'data/series.json',
      'scraped_data/series.json',
      '/series.json',
      '/data/series.json',
      '/scraped_data/series.json',
      'https://oniverse.sbs/series.json'
    ];
    
    let loadedData = null;
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (res.ok) {
          const data = await res.json();
          if (data && (Array.isArray(data) ? data.length > 0 : (data.series && data.series.length > 0))) {
            loadedData = Array.isArray(data) ? data : data.series;
            console.log(`Loaded data successfully from ${url} (${loadedData.length} items)`);
            break;
          }
        }
      } catch (err) {
        console.warn(`Attempt failed for ${url}:`, err);
      }
    }

    if (loadedData && loadedData.length > 0) {
      STATE.allSeries = loadedData;
      STATE.filtered = [...STATE.allSeries];
      onDataReady();
    } else {
      console.error('All data load candidates failed.');
      showToast('Gagal memuat data komik. Coba refresh halaman.', 'warning');
    }
  }

  function safeExec(fn, name) {
    try { fn(); } catch(err) { console.error(`Error rendering ${name}:`, err); }
  }

  function onDataReady() {
    safeExec(populateGenreFilter, 'GenreFilter');
    safeExec(renderHero, 'Hero');
    safeExec(renderTrending, 'Trending');
    safeExec(renderContinue, 'Continue');
    safeExec(renderUpdateList, 'UpdateList');
    safeExec(renderRanking, 'Ranking');
    safeExec(updateBookmarkCount, 'BookmarkCount');
    safeExec(renderStats, 'Stats');

    const totalEl = $('#footer-total');
    if (totalEl) totalEl.textContent = STATE.allSeries.length + '+';
    const updatedEl = $('#footer-updated');
    if (updatedEl) updatedEl.textContent = 'Data terakhir diperbarui: ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    showToast(`${STATE.allSeries.length} komik berhasil dimuat!`, 'success');
  }

  // ==========================================================================
  //  GENRE FILTER POPULATE
  // ==========================================================================
  function populateGenreFilter() {
    const genreSet = new Set();
    STATE.allSeries.forEach(s => {
      if (s.genres) s.genres.forEach(g => genreSet.add(g));
      if (s.genre) s.genre.split(',').forEach(g => genreSet.add(g.trim()));
    });
    const sel = $('#filter-genre');
    if (!sel) return;
    [...genreSet].sort().forEach(g => {
      if (g) {
        const opt = document.createElement('option');
        opt.value = g; opt.textContent = g;
        sel.appendChild(opt);
      }
    });
  }

  function getGenres(s) {
    if (Array.isArray(s.genres)) return s.genres;
    if (typeof s.genre === 'string') return s.genre.split(',').map(g => g.trim()).filter(Boolean);
    return [];
  }

  // ==========================================================================
  //  HERO SLIDER
  // ==========================================================================
  function renderHero() {
    const featured = STATE.allSeries
      .filter(s => parseFloat(s.rating) >= 8)
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);

    if (!featured.length) return;

    const dotsC = $('#slider-dots');
    dotsC.innerHTML = featured.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></span>`).join('');

    function setSlide(idx) {
      STATE.currentSlide = idx;
      const s = featured[idx];
      const bg = $('#hero-bg-0');
      bg.style.backgroundImage = `url(${getCover(s)})`;
      bg.style.transform = 'scale(1)';
      void bg.offsetWidth;
      bg.style.transform = 'scale(1.06)';

      $('#hero-title').textContent = s.title || s.name || 'Unknown';
      $('#hero-rating').textContent = s.rating || 'N/A';
      $('#hero-chapter').textContent = (s.total_chapters || s.chapters?.length || '?') + ' Chapter';
      $('#hero-views').textContent = fmtNum(s.views || rand(100000, 5000000)) + ' Views';
      $('#hero-synopsis').textContent = s.synopsis || s.description || 'Belum ada deskripsi.';

      const genres = getGenres(s);
      $('#hero-genres').innerHTML = genres.slice(0, 4).map(g => `<span class="hero-genre-tag">${g}</span>`).join('');

      const isBookmarked = STATE.bookmarks.includes(getSlug(s));
      const bbtn = $('#hero-bookmark-btn');
      bbtn.className = 'btn-bookmark-hero' + (isBookmarked ? ' bookmarked' : '');
      bbtn.innerHTML = `<i class="fa-${isBookmarked ? 'solid' : 'regular'} fa-bookmark"></i> ${isBookmarked ? 'Tersimpan' : 'Bookmark'}`;

      $$('.dot', dotsC).forEach((d, i) => d.classList.toggle('active', i === idx));
    }

    setSlide(0);

    $('#slider-prev').onclick = () => { setSlide((STATE.currentSlide - 1 + featured.length) % featured.length); resetSliderTimer(); };
    $('#slider-next').onclick = () => { setSlide((STATE.currentSlide + 1) % featured.length); resetSliderTimer(); };
    dotsC.addEventListener('click', e => { const d = e.target.dataset.idx; if (d !== undefined) { setSlide(+d); resetSliderTimer(); } });

    $('#hero-read-btn').onclick = () => openDetail(featured[STATE.currentSlide]);
    $('#hero-bookmark-btn').onclick = () => {
      toggleBookmark(featured[STATE.currentSlide]);
      setSlide(STATE.currentSlide);
    };

    function resetSliderTimer() {
      clearInterval(STATE.sliderTimer);
      STATE.sliderTimer = setInterval(() => setSlide((STATE.currentSlide + 1) % featured.length), 6000);
    }
    resetSliderTimer();
  }

  // ==========================================================================
  //  TRENDING ROW
  // ==========================================================================
  function renderTrending() {
    const trending = STATE.allSeries
      .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
      .slice(0, 15);

    const container = $('#trending-row');
    container.innerHTML = trending.map((s, i) => `
      <div class="trending-card" data-slug="${s.slug || ''}" data-idx="${i}">
        <span class="trending-rank">${i + 1}</span>
        <div class="trending-poster">
          <img src="${getCover(s)}" alt="${s.title || s.name}" loading="lazy" onerror="this.style.background='#14122c'">
        </div>
        <div class="trending-info">
          <div class="trending-title">${s.title || s.name || 'Unknown'}</div>
          <div class="trending-rating"><i class="fa-solid fa-star"></i> ${s.rating || 'N/A'}</div>
        </div>
      </div>
    `).join('');

    container.addEventListener('click', e => {
      const card = e.target.closest('.trending-card');
      if (card) openDetail(trending[+card.dataset.idx]);
    });

    // Scroll arrows
    const wrap = container;
    const prevBtn = $('#trending-prev');
    const nextBtn = $('#trending-next');
    if (prevBtn) prevBtn.onclick = () => wrap.scrollBy({ left: -240, behavior: 'smooth' });
    if (nextBtn) nextBtn.onclick = () => wrap.scrollBy({ left: 240, behavior: 'smooth' });
  }

  // ==========================================================================
  //  CONTINUE READING
  // ==========================================================================
  function renderContinue() {
    const grid = $('#continue-grid');
    const history = STATE.history.slice(0, 5);
    if (!history.length) {
      grid.innerHTML = `<div class="empty-continue" id="empty-continue"><i class="fa-solid fa-book-open"></i><p>Belum ada riwayat baca. Mulai baca komik sekarang!</p></div>`;
      return;
    }

    grid.innerHTML = history.map(h => {
      const series = STATE.allSeries.find(s => (getSlug(s)) === h.slug);
      if (!series) return '';
      const progress = h.progress || rand(20, 85);
      return `
        <div class="continue-card" data-slug="${h.slug}">
          <div class="continue-poster">
            <img src="${getCover(series)}" alt="${series.title || series.name}" loading="lazy">
          </div>
          <div class="continue-progress-wrap">
            <div class="continue-title">${series.title || series.name}</div>
            <div class="continue-chapter">Ch. ${h.chapter || '?'}</div>
            <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${progress}%"></div></div>
          </div>
        </div>`;
    }).join('');

    grid.addEventListener('click', e => {
      const card = e.target.closest('.continue-card');
      if (card) {
        const series = STATE.allSeries.find(s => (getSlug(s)) === card.dataset.slug);
        if (series) openDetail(series);
      }
    });
  }

  // ==========================================================================
  //  UPDATE LIST
  // ==========================================================================
  function renderUpdateList() {
    const sorted = [...STATE.allSeries].sort((a, b) => {
      const da = a.last_updated || a.updated || '';
      const db = b.last_updated || b.updated || '';
      return db.localeCompare(da);
    });

    STATE.filtered = sorted;
    STATE.displayCount = STATE.perPage;

    renderUpdateItems();
  }

  function renderUpdateItems() {
    const container = $('#update-list');
    const slice = STATE.filtered.slice(0, STATE.displayCount);

    container.innerHTML = slice.map((s, i) => {
      const ch = s.chapters?.length ? s.chapters[0] : null;
      const chText = ch ? `Chapter ${ch.number || ch.chapter || '?'}` : (s.total_chapters ? `${s.total_chapters} Chapter` : 'N/A');
      const timeText = s.last_updated || s.updated || '';
      const isNew = i < 5;
      return `
        <div class="update-item" data-idx="${i}">
          <img src="${getCover(s)}" class="update-thumb" alt="${s.title || s.name}" loading="lazy" onerror="this.style.background='#14122c'">
          <div class="update-info">
            <div class="update-title">${s.title || s.name || 'Unknown'}</div>
            <div class="update-chapter">${chText}</div>
            <div class="update-time">${timeText}</div>
          </div>
          ${isNew ? '<span class="update-new-badge">NEW</span>' : ''}
        </div>`;
    }).join('');

    container.addEventListener('click', e => {
      const item = e.target.closest('.update-item');
      if (item) openDetail(STATE.filtered[+item.dataset.idx]);
    });

    // Load more
    const wrap = $('#load-more-wrap');
    if (STATE.displayCount < STATE.filtered.length) {
      wrap.classList.remove('hidden');
    } else {
      wrap.classList.add('hidden');
    }

    $('#catalog-count').textContent = `(${STATE.filtered.length} komik)`;
  }

  // ==========================================================================
  //  RANKING SIDEBAR
  // ==========================================================================
  function renderRanking() {
    const ranked = [...STATE.allSeries]
      .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
      .slice(0, 10);

    const list = $('#ranking-list');
    if (!list) return;

    list.innerHTML = ranked.map((s, i) => {
      const cls = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
      return `
        <li class="ranking-item" data-idx="${i}">
          <span class="rank-num ${cls}">${i + 1}</span>
          <img src="${getCover(s)}" class="rank-thumb" alt="${s.title || s.name}" loading="lazy">
          <div class="rank-info">
            <div class="rank-title">${s.title || s.name}</div>
            <div class="rank-chapter">${s.total_chapters || s.chapters?.length || '?'} Ch</div>
          </div>
          <span class="rank-score"><i class="fa-solid fa-star"></i> ${s.rating || 'N/A'}</span>
        </li>`;
    }).join('');

    list.addEventListener('click', e => {
      const item = e.target.closest('.ranking-item');
      if (item) openDetail(ranked[+item.dataset.idx]);
    });
  }

  // ==========================================================================
  //  BOOKMARK
  // ==========================================================================
  function toggleBookmark(s) {
    const key = getSlug(s);
    const idx = STATE.bookmarks.indexOf(key);
    if (idx >= 0) {
      STATE.bookmarks.splice(idx, 1);
      showToast(`"${s.title || s.name}" dihapus dari bookmark`, 'info');
    } else {
      STATE.bookmarks.push(key);
      showToast(`"${s.title || s.name}" disimpan ke bookmark!`, 'success');
    }
    saveBookmarks();
    updateBookmarkCount();
  }

  function updateBookmarkCount() {
    const c = STATE.bookmarks.length;
    const el = $('#bookmark-count');
    if (el) el.textContent = c;
    const bel = $('#bottom-bkm-badge');
    if (bel) { bel.textContent = c; bel.style.display = c > 0 ? '' : 'none'; }
  }

  // ==========================================================================
  //  DETAIL MODAL
  // ==========================================================================
  function openDetail(s) {
    STATE.currentDetail = s;
    const modal = $('#detail-modal');
    const body = $('#modal-body');
    const genres = getGenres(s);
    const isBookmarked = STATE.bookmarks.includes(getSlug(s));
    const chapters = s.chapters || [];
    const sortedChapters = [...chapters].sort((a, b) => parseFloat(b.number || b.chapter || 0) - parseFloat(a.number || a.chapter || 0));

    body.innerHTML = `
      <div class="detail-grid">
        <img src="${getCover(s)}" class="detail-cover" alt="${s.title || s.name}">
        <div class="detail-info">
          <h2>${s.title || s.name || 'Unknown'}</h2>
          <p class="detail-alt">${s.alternative_title || s.author || ''}</p>
          <div class="detail-tags">
            <span class="detail-badge status"><i class="fa-solid fa-circle" style="font-size:0.45rem"></i> ${s.status || 'Ongoing'}</span>
            <span class="detail-badge type">${s.type || 'Manhwa'}</span>
            <span class="detail-badge rating"><i class="fa-solid fa-star"></i> ${s.rating || 'N/A'}</span>
            <span class="detail-badge views"><i class="fa-solid fa-eye"></i> ${fmtNum(s.views || 0)}</span>
          </div>
          <div class="detail-tags">${genres.map(g => `<span class="detail-badge genre">${g}</span>`).join('')}</div>
          <p class="detail-synopsis">${s.synopsis || s.description || 'Belum ada deskripsi.'}</p>
          <div class="detail-action-row">
            <button class="btn-baca" id="detail-read-first"><i class="fa-solid fa-book-open"></i> Baca Chapter 1</button>
            <button class="btn-bookmark-hero ${isBookmarked ? 'bookmarked' : ''}" id="detail-bookmark-btn">
              <i class="fa-${isBookmarked ? 'solid' : 'regular'} fa-bookmark"></i> ${isBookmarked ? 'Tersimpan' : 'Bookmark'}
            </button>
          </div>
        </div>
      </div>
      <!-- Modal Sponsored Ad Slot #3 -->
      <div style="margin: 0.85rem 0; text-align: center; min-height: 80px;" id="modal-ad-slot">
        <script src="https://pl30628279.effectivecpmnetwork.com/e1/22/4e/e1224e58d177272cb8d6f83b09dd728c.js"></script>
      </div>
      <div class="chapter-section">
        <div class="chapter-header">
          <h3 style="font-family:'Outfit';font-weight:700;font-size:1rem"><i class="fa-solid fa-list"></i> Daftar Chapter (${sortedChapters.length})</h3>
          <input type="text" class="chapter-search" placeholder="Cari chapter..." id="ch-search">
        </div>
        <div class="chapter-grid" id="chapter-grid">
          ${sortedChapters.map((ch, i) => `
            <div class="chapter-item" data-ch-idx="${i}">
              <span class="ch-num">Ch. ${ch.number || ch.chapter || i + 1}</span>
              <span class="ch-date">${ch.date || ch.released || ''}</span>
            </div>`).join('')}
          ${sortedChapters.length === 0 ? '<p style="color:var(--text-dim);font-size:0.82rem;grid-column:1/-1;text-align:center;padding:1rem">Belum ada chapter tersedia.</p>' : ''}
        </div>
      </div>`;

    // Events
    $('#detail-read-first').onclick = () => {
      if (sortedChapters.length) openReader(s, sortedChapters, sortedChapters.length - 1);
    };

    $('#detail-bookmark-btn').onclick = () => {
      toggleBookmark(s);
      openDetail(s);
    };

    const chSearch = $('#ch-search');
    if (chSearch) {
      chSearch.oninput = () => {
        const q = chSearch.value.toLowerCase();
        $$('.chapter-item', modal).forEach(ci => {
          ci.style.display = ci.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
      };
    }

    $$('.chapter-item', modal).forEach(ci => {
      ci.onclick = () => openReader(s, sortedChapters, +ci.dataset.chIdx);
    });

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Fetch full chapters from API if available
    if (s.id && (!s.chapters || s.chapters.length < (s.total_chapters || 30))) {
      fetch(`https://api.shngm.io/v1/chapter/${s.id}/list?page=1&page_size=500&sort_by=chapter_number&sort_order=desc`)
        .then(r => r.json())
        .then(d => {
          if (d && d.retcode === 0 && Array.isArray(d.data)) {
            s.chapters = d.data.map(c => ({
              number: String(c.chapter_number || ''),
              chapter: String(c.chapter_number || ''),
              slug: c.chapter_id || '',
              date: c.release_date || c.created_at || ''
            }));
            if (STATE.currentDetail === s) openDetail(s);
          }
        }).catch(e => console.warn('Chapter API fetch error:', e));
    }
  }

  function closeDetail() {
    $('#detail-modal').classList.add('hidden');
    document.body.style.overflow = '';
  }

  // ==========================================================================
  //  READER
  // ==========================================================================
  async function openReader(series, chapters, idx) {
    closeDetail();
    STATE.currentReader = { series, chapterIdx: idx, chapters };

    const overlay = $('#reader-overlay');
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const ch = chapters[idx];
    $('#reader-series-title').textContent = series.title || series.name;
    $('#reader-chapter-title').textContent = `Chapter ${ch.number || ch.chapter || idx + 1}`;
    $('#prev-chapter-btn').disabled = idx <= 0;
    $('#next-chapter-btn').disabled = idx >= chapters.length - 1;
    $('#reader-progress-fill').style.width = '0%';

    const content = $('#reader-content');
    content.innerHTML = '<div class="reader-loading"><div class="spinner"></div><span>Memuat chapter...</span></div>';
    content.scrollTop = 0;

    // Track reading
    const slug = getSlug(series);
    const historyEntry = { slug, chapter: ch.number || ch.chapter || idx + 1, progress: rand(30, 80), timestamp: Date.now() };
    STATE.history = [historyEntry, ...STATE.history.filter(h => h.slug !== slug)].slice(0, 20);
    saveHistory();
    trackRead(series.title);

    // Fetch chapter images
    const chSlug = ch.slug || ch.chapter_slug || '';
    try {
      const res = await fetch(`https://api.shngm.io/v1/chapter/detail/${chSlug}`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const images = data.data?.chapter?.images || data.images || data.data?.images || [];

      if (!images.length) throw new Error('No images');

      content.innerHTML = `
        <div class="reader-images-wrap">
          ${images.map((img, i) => `<img src="${typeof img === 'string' ? img : img.url || img.src}" class="reader-page-img" alt="Page ${i + 1}" loading="lazy" onerror="this.alt='Gagal memuat halaman ${i + 1}'">`).join('')}
        </div>
        <div class="reader-footer-nav">
          <p style="color:var(--text-muted);font-size:0.85rem">— Akhir Chapter ${ch.number || ch.chapter || idx + 1} —</p>
          <!-- Reader End Sponsored Ad (Non-Intrusive) -->
          <div style="margin: 1rem 0; min-height: 90px; text-align: center;" id="reader-ad-slot">
            <script src="https://pl30628279.effectivecpmnetwork.com/e1/22/4e/e1224e58d177272cb8d6f83b09dd728c.js"></script>
          </div>
          <div class="reader-nav-row">
            <button class="btn-baca" id="reader-footer-prev" ${idx <= 0 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i> Prev</button>
            <button class="btn-baca" id="reader-footer-next" ${idx >= chapters.length - 1 ? 'disabled' : ''}>Next <i class="fa-solid fa-chevron-right"></i></button>
          </div>
        </div>`;

      const fp = $('#reader-footer-prev');
      const fn = $('#reader-footer-next');
      if (fp) fp.onclick = () => openReader(series, chapters, idx - 1);
      if (fn) fn.onclick = () => openReader(series, chapters, idx + 1);

    } catch (err) {
      content.innerHTML = `
        <div class="reader-placeholder">
          <i class="fa-solid fa-exclamation-triangle" style="color:var(--gold)"></i>
          <h3>Gagal Memuat Chapter</h3>
          <p style="color:var(--text-muted)">Server sedang tidak tersedia. Coba lagi nanti.</p>
          <button class="btn-baca" onclick="location.reload()"><i class="fa-solid fa-rotate-right"></i> Coba Lagi</button>
        </div>`;
    }
  }

  function closeReader() {
    $('#reader-overlay').classList.add('hidden');
    document.body.style.overflow = '';
    renderContinue();
  }

  // Reader progress bar on scroll
  function setupReaderProgress() {
    const content = $('#reader-content');
    content.addEventListener('scroll', () => {
      const scrollTop = content.scrollTop;
      const scrollHeight = content.scrollHeight - content.clientHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      $('#reader-progress-fill').style.width = `${progress}%`;
    });
  }

  // ==========================================================================
  //  FILTERING & SORTING
  // ==========================================================================
  function applyFilters() {
    const type = $('#filter-type')?.value || 'all';
    const genre = $('#filter-genre')?.value || 'all';
    const sort = $('#sort-by')?.value || 'latest';
    const search = ($('#search-input')?.value || $('#mobile-search-input')?.value || '').toLowerCase().trim();

    let results = [...STATE.allSeries];

    if (search) {
      results = results.filter(s => {
        const title = (s.title || s.name || '').toLowerCase();
        const alt = (s.alternative_title || '').toLowerCase();
        const g = getGenres(s).join(' ').toLowerCase();
        return title.includes(search) || alt.includes(search) || g.includes(search);
      });
    }

    if (type !== 'all') results = results.filter(s => (s.type || '').toLowerCase() === type.toLowerCase());
    if (genre !== 'all') results = results.filter(s => getGenres(s).some(g => g.toLowerCase() === genre.toLowerCase()));

    if (sort === 'rating') results.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
    else if (sort === 'views') results.sort((a, b) => (b.views || 0) - (a.views || 0));
    else results.sort((a, b) => (b.last_updated || b.updated || '').localeCompare(a.last_updated || a.updated || ''));

    STATE.filtered = results;
    STATE.displayCount = STATE.perPage;

    if (results.length) {
      $('#update-list').classList.remove('hidden');
      $('#empty-state').classList.add('hidden');
      renderUpdateItems();
    } else {
      $('#update-list').classList.add('hidden');
      $('#empty-state').classList.remove('hidden');
      $('#load-more-wrap').classList.add('hidden');
    }
  }

  // ==========================================================================
  //  EVENT BINDINGS
  // ==========================================================================
  function bindEvents() {
    // Close modal
    $('#close-modal-btn').onclick = closeDetail;
    $('#detail-modal').addEventListener('click', e => { if (e.target.id === 'detail-modal') closeDetail(); });

    // Close reader
    $('#close-reader-btn').onclick = closeReader;
    $('#prev-chapter-btn').onclick = () => {
      const r = STATE.currentReader;
      if (r.chapterIdx > 0) openReader(r.series, r.chapters, r.chapterIdx - 1);
    };
    $('#next-chapter-btn').onclick = () => {
      const r = STATE.currentReader;
      if (r.chapterIdx < r.chapters.length - 1) openReader(r.series, r.chapters, r.chapterIdx + 1);
    };

    // Filters
    ['filter-type', 'filter-genre', 'sort-by'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', applyFilters);
    });

    // Search
    let searchTimeout;
    const searchHandler = () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(applyFilters, 300); };
    $('#search-input')?.addEventListener('input', searchHandler);
    $('#mobile-search-input')?.addEventListener('input', searchHandler);

    // Search shortcut
    document.addEventListener('keydown', e => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        const input = $('#search-input');
        if (input && getComputedStyle(input.closest('.nav-search')).display !== 'none') {
          input.focus();
        } else {
          const mob = $('#mobile-search-expanded');
          mob.classList.remove('hidden');
          setTimeout(() => $('#mobile-search-input')?.focus(), 50);
        }
      }
      if (e.key === 'Escape') {
        closeDetail();
        closeReader();
        $('#mobile-search-expanded').classList.add('hidden');
        closeMobileSidebar();
      }
    });

    // Clear search
    const clearBtn = $('#clear-search-btn');
    if (clearBtn) {
      clearBtn.onclick = () => {
        $('#search-input').value = '';
        clearBtn.classList.add('hidden');
        applyFilters();
      };
      $('#search-input')?.addEventListener('input', () => {
        clearBtn.classList.toggle('hidden', !$('#search-input').value);
      });
    }

    // Mobile search
    $('#mobile-search-btn')?.addEventListener('click', () => {
      const mob = $('#mobile-search-expanded');
      mob.classList.remove('hidden');
      setTimeout(() => $('#mobile-search-input')?.focus(), 50);
    });
    $('#close-mobile-search')?.addEventListener('click', () => {
      $('#mobile-search-expanded').classList.add('hidden');
    });

    // Mobile sidebar
    const menuBtn = $('#mobile-menu-btn');
    const sidebar = $('#sidebar-left');
    const overlay = $('#sidebar-overlay');

    menuBtn?.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('hidden', !sidebar.classList.contains('open'));
    });

    overlay?.addEventListener('click', closeMobileSidebar);

    // Load more
    $('#load-more-btn')?.addEventListener('click', () => {
      STATE.displayCount += STATE.perPage;
      renderUpdateItems();
    });

    // Reset filter
    $('#reset-filter-btn')?.addEventListener('click', () => {
      $('#filter-type').value = 'all';
      $('#filter-genre').value = 'all';
      $('#sort-by').value = 'latest';
      $('#search-input').value = '';
      applyFilters();
    });

    // Genre chips
    $$('.genre-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        $$('.genre-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const genre = chip.dataset.genre;
        if (genre === 'all') {
          $('#filter-genre').value = 'all';
        } else {
          $('#filter-genre').value = genre;
        }
        applyFilters();
      });
    });

    // Sidebar genre items
    $$('.sidebar-genre-item').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        const genre = item.dataset.genre;
        $$('.sidebar-genre-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        $('#filter-genre').value = genre;
        applyFilters();
        closeMobileSidebar();
        document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    // Mobile bottom nav
    $$('.bottom-nav-item').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        $$('.bottom-nav-item').forEach(b => b.classList.remove('active'));
        item.classList.add('active');
        const nav = item.dataset.nav;
        handleNav(nav);
      });
    });

    // Navigation click bindings
    $('#nav-beranda')?.addEventListener('click', e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    $('#sb-beranda')?.addEventListener('click', e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); closeMobileSidebar(); });

    $('#nav-komik')?.addEventListener('click', e => { e.preventDefault(); document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' }); });
    $('#sb-semua')?.addEventListener('click', e => { e.preventDefault(); $('#filter-type').value = 'all'; applyFilters(); document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' }); closeMobileSidebar(); });

    $('#nav-update')?.addEventListener('click', e => { e.preventDefault(); $('#sort-by').value = 'latest'; applyFilters(); document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' }); });
    $('#sb-update')?.addEventListener('click', e => { e.preventDefault(); $('#sort-by').value = 'latest'; applyFilters(); document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' }); closeMobileSidebar(); });

    $('#sb-populer')?.addEventListener('click', e => { e.preventDefault(); $('#sort-by').value = 'views'; applyFilters(); document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' }); closeMobileSidebar(); });

    $('#nav-ranking')?.addEventListener('click', e => { e.preventDefault(); document.getElementById('trending-section')?.scrollIntoView({ behavior: 'smooth' }); });
    $('#sb-ranking')?.addEventListener('click', e => { e.preventDefault(); document.getElementById('trending-section')?.scrollIntoView({ behavior: 'smooth' }); closeMobileSidebar(); });
    $('#see-ranking')?.addEventListener('click', e => { e.preventDefault(); document.getElementById('trending-section')?.scrollIntoView({ behavior: 'smooth' }); });
    $('#btn-ranking-full')?.addEventListener('click', e => { e.preventDefault(); document.getElementById('trending-section')?.scrollIntoView({ behavior: 'smooth' }); });

    $('#sb-bookmark')?.addEventListener('click', e => { e.preventDefault(); showBookmarkList(); closeMobileSidebar(); });
    $('#sb-history')?.addEventListener('click', e => { e.preventDefault(); document.getElementById('continue-section')?.scrollIntoView({ behavior: 'smooth' }); closeMobileSidebar(); });

    // Buttons
    $('#login-btn')?.addEventListener('click', () => showToast('Fitur Akun / Login segera hadir!', 'info'));
    $('#notif-btn')?.addEventListener('click', () => showToast('Belum ada notifikasi baru.', 'info'));
    $('#donasi-btn')?.addEventListener('click', () => showToast('Terima kasih atas dukunganmu pada OniVerse! 💜', 'success'));
    $('#discord-btn')?.addEventListener('click', e => { e.preventDefault(); showToast('Komunitas Discord OniVerse segera dibuka!', 'info'); });

    // Logo home
    $('#logo-home')?.addEventListener('click', e => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Theme toggle
    $('#theme-toggle')?.addEventListener('click', () => {
      showToast('Fitur dark/light mode segera hadir!', 'info');
    });

    setupReaderProgress();
  }

  function closeMobileSidebar() {
    $('#sidebar-left').classList.remove('open');
    $('#sidebar-overlay').classList.add('hidden');
  }

  function handleNav(nav) {
    closeMobileSidebar();
    switch (nav) {
      case 'beranda':
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'komik':
        document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'update':
        document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'bookmark':
        showBookmarkList();
        break;
      case 'ranking':
        document.getElementById('trending-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
    }
  }

  function showBookmarkList() {
    if (!STATE.bookmarks.length) {
      showToast('Belum ada bookmark. Simpan komik favoritmu!', 'info');
      return;
    }

    const bookmarked = STATE.allSeries.filter(s => STATE.bookmarks.includes(getSlug(s)));
    STATE.filtered = bookmarked;
    STATE.displayCount = STATE.perPage;

    $('#catalog-title').innerHTML = '<i class="fa-solid fa-bookmark"></i> Bookmark Kamu';
    renderUpdateItems();
    document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
    showToast(`${bookmarked.length} komik di bookmark kamu`, 'info');
  }

  // ==========================================================================
  //  INIT
  // ==========================================================================
  function init() {
    bindEvents();
    loadData();
    updateBookmarkCount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
