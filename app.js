/* ==========================================================================
   OniVerse.SBS — Main Application Script
   ========================================================================== */

// ============================================================
// STATE
// ============================================================
let allSeries = [];
let rawDataset = null;
let bookmarks = JSON.parse(localStorage.getItem('oniverse_bookmarks') || '[]');
let readHistory = JSON.parse(localStorage.getItem('oniverse_history') || '[]');
let selectedSeries = null;
let currentChapterIdx = -1;
let currentFilter = { search: '', type: 'all', genre: 'all', sort: 'latest', view: 'home' };
let heroSlides = [];
let heroIdx = 0;
let heroTimer = null;

// ============================================================
// DOM REFS
// ============================================================
const searchInput      = document.getElementById('search-input');
const clearSearchBtn   = document.getElementById('clear-search-btn');
const filterType       = document.getElementById('filter-type');
const filterGenre      = document.getElementById('filter-genre');
const sortBy           = document.getElementById('sort-by');
const comicGrid        = document.getElementById('comic-grid');
const updateList       = document.getElementById('update-list');
const emptyState       = document.getElementById('empty-state');
const resetFilterBtn   = document.getElementById('reset-filter-btn');
const catalogCount     = document.getElementById('catalog-count');
const catalogTitle     = document.getElementById('catalog-title');

const heroTitle        = document.getElementById('hero-title');
const heroRating       = document.getElementById('hero-rating');
const heroChapter      = document.getElementById('hero-chapter');
const heroViews        = document.getElementById('hero-views');
const heroGenres       = document.getElementById('hero-genres');
const heroSynopsis     = document.getElementById('hero-synopsis');
const heroReadBtn      = document.getElementById('hero-read-btn');
const heroBookmarkBtn  = document.getElementById('hero-bookmark-btn');
const heroSliderDots   = document.getElementById('slider-dots');
const heroSlidesEl     = document.getElementById('hero-slides');
const sliderPrev       = document.getElementById('slider-prev');
const sliderNext       = document.getElementById('slider-next');

const trendingRow      = document.getElementById('trending-row');
const trendingPrev     = document.getElementById('trending-prev');
const trendingNext     = document.getElementById('trending-next');
const continueGrid     = document.getElementById('continue-grid');
const emptyContinue    = document.getElementById('empty-continue');
const rankingList      = document.getElementById('ranking-list');
const bookmarkCount    = document.getElementById('bookmark-count');
const footerTotal      = document.getElementById('footer-total');
const footerUpdated    = document.getElementById('footer-updated');

const detailModal      = document.getElementById('detail-modal');
const modalBody        = document.getElementById('modal-body');
const closeModalBtn    = document.getElementById('close-modal-btn');

const readerOverlay    = document.getElementById('reader-overlay');
const closeReaderBtn   = document.getElementById('close-reader-btn');
const readerSeriesTitle= document.getElementById('reader-series-title');
const readerChTitle    = document.getElementById('reader-chapter-title');
const prevChBtn        = document.getElementById('prev-chapter-btn');
const nextChBtn        = document.getElementById('next-chapter-btn');
const readerContent    = document.getElementById('reader-content');

const mobileMenuBtn    = document.getElementById('mobile-menu-btn');
const sidebarLeft      = document.getElementById('sidebar-left');
const themeToggle      = document.getElementById('theme-toggle');
const btnRankingFull   = document.getElementById('btn-ranking-full');

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  updateBookmarkBadge();
  loadData();
});

async function loadData() {
  try {
    const res = await fetch('scraped_data/series.json');
    if (!res.ok) throw new Error('Data tidak ditemukan');
    rawDataset = await res.json();
    allSeries = rawDataset.series || [];

    // Footer stats
    if (footerTotal) footerTotal.textContent = allSeries.length.toLocaleString() + '+';
    if (footerUpdated && rawDataset.metadata) {
      footerUpdated.textContent = 'Data: ' + (rawDataset.metadata.scraped_at || '');
    }

    // Populate genre dropdown
    populateGenreDropdown();

    // Render all sections
    renderHeroSlider();
    renderTrending();
    renderContinueReading();
    renderUpdateList();
    renderRanking();

  } catch (err) {
    console.error('Gagal memuat data:', err);
    showDataError();
  }
}

function showDataError() {
  if (updateList) updateList.innerHTML = `
    <div class="empty-state">
      <i class="fa-solid fa-triangle-exclamation" style="color:#ef4444"></i>
      <h3>Gagal Memuat Data</h3>
      <p>File scraped_data/series.json tidak ditemukan.</p>
    </div>`;
}

// ============================================================
// HERO SLIDER
// ============================================================
function renderHeroSlider() {
  if (!allSeries.length) return;

  // Ambil 5 komik terpopuler untuk slide
  heroSlides = [...allSeries]
    .sort((a, b) => (b.bookmark_count || 0) - (a.bookmark_count || 0))
    .slice(0, 5);

  // Build slides HTML
  heroSlidesEl.innerHTML = heroSlides.map((s, i) => {
    const cover = s.cover_landscape_url || s.cover_image_url || s.cover_portrait_url || '';
    return `
      <div class="hero-slide ${i === 0 ? 'active' : ''}" data-idx="${i}">
        <div class="hero-bg" style="background-image:url('${cover}')"></div>
        <div class="hero-overlay"></div>
      </div>`;
  }).join('');

  // Build dots
  heroSliderDots.innerHTML = heroSlides.map((_, i) =>
    `<span class="dot ${i === 0 ? 'active' : ''}" data-dot="${i}"></span>`
  ).join('');

  // Render hero content for first slide
  renderHeroContent(0);

  // Dot click
  heroSliderDots.querySelectorAll('.dot').forEach(dot => {
    dot.addEventListener('click', () => goToSlide(parseInt(dot.dataset.dot)));
  });

  // Auto-slide
  startHeroTimer();
}

function goToSlide(idx) {
  const slides = heroSlidesEl.querySelectorAll('.hero-slide');
  const dots   = heroSliderDots.querySelectorAll('.dot');

  slides[heroIdx]?.classList.remove('active');
  dots[heroIdx]?.classList.remove('active');

  heroIdx = (idx + heroSlides.length) % heroSlides.length;

  slides[heroIdx]?.classList.add('active');
  dots[heroIdx]?.classList.add('active');

  renderHeroContent(heroIdx);
  resetHeroTimer();
}

function renderHeroContent(idx) {
  const s = heroSlides[idx];
  if (!s) return;

  heroTitle.textContent   = s.title || 'Judul Tidak Tersedia';
  heroRating.textContent  = s.user_rate ? s.user_rate.toFixed(1) : 'N/A';
  heroChapter.textContent = s.latest_chapter_number ? s.latest_chapter_number + ' Chapter' : 'Ongoing';
  heroViews.textContent   = formatCount(s.view_count || 0) + ' Views';
  heroSynopsis.textContent = s.description || 'Tidak ada deskripsi tersedia.';

  // Genre tags
  heroGenres.innerHTML = (s.genres || []).slice(0, 4).map(g =>
    `<span class="hero-genre-tag">${g}</span>`
  ).join('');

  // Bookmark state
  updateHeroBookmarkBtn(s.id);

  heroReadBtn.onclick = () => openDetailModal(s);
  heroBookmarkBtn.onclick = () => {
    toggleBookmark(s.id);
    updateHeroBookmarkBtn(s.id);
  };
}

function updateHeroBookmarkBtn(id) {
  const isBkm = bookmarks.includes(id);
  heroBookmarkBtn.innerHTML = isBkm
    ? `<i class="fa-solid fa-bookmark"></i> Bookmarked`
    : `<i class="fa-regular fa-bookmark"></i> Bookmark`;
  heroBookmarkBtn.classList.toggle('bookmarked', isBkm);
}

function startHeroTimer() {
  heroTimer = setInterval(() => goToSlide(heroIdx + 1), 5000);
}

function resetHeroTimer() {
  clearInterval(heroTimer);
  startHeroTimer();
}

// ============================================================
// TRENDING
// ============================================================
function renderTrending() {
  if (!allSeries.length) return;

  const trending = [...allSeries]
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 15);

  trendingRow.innerHTML = trending.map((s, i) => {
    const cover  = s.cover_portrait_url || s.cover_image_url || '';
    const rating = s.user_rate ? s.user_rate.toFixed(1) : '8.5';
    return `
      <div class="trending-card" data-id="${s.id}" title="${s.title}">
        <span class="trending-rank">${i + 1}</span>
        <div class="trending-poster">
          <img src="${cover}" alt="${s.title}" loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300'">
        </div>
        <div class="trending-info">
          <div class="trending-title">${s.title}</div>
          <div class="trending-rating"><i class="fa-solid fa-star"></i> ${rating}</div>
        </div>
      </div>`;
  }).join('');

  // Click
  trendingRow.querySelectorAll('.trending-card').forEach(card => {
    card.addEventListener('click', () => {
      const found = allSeries.find(s => s.id === card.dataset.id);
      if (found) openDetailModal(found);
    });
  });
}

// ============================================================
// CONTINUE READING
// ============================================================
function renderContinueReading() {
  if (!readHistory.length) {
    emptyContinue.classList.remove('hidden');
    return;
  }

  emptyContinue.classList.add('hidden');
  const items = readHistory.slice(0, 5).map(h => {
    const s = allSeries.find(x => x.id === h.id);
    if (!s) return '';
    const cover = s.cover_portrait_url || s.cover_image_url || '';
    return `
      <div class="continue-card" data-id="${s.id}">
        <div class="continue-poster">
          <img src="${cover}" alt="${s.title}" loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300'">
        </div>
        <div class="continue-progress-wrap">
          <div class="continue-title">${s.title}</div>
          <div class="continue-chapter">Ch. ${h.chapter || 1}</div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width:${h.progress || 30}%"></div>
          </div>
        </div>
      </div>`;
  }).join('');

  continueGrid.innerHTML = items + continueGrid.innerHTML;

  continueGrid.querySelectorAll('.continue-card').forEach(card => {
    card.addEventListener('click', () => {
      const found = allSeries.find(s => s.id === card.dataset.id);
      if (found) openDetailModal(found);
    });
  });
}

// ============================================================
// UPDATE LIST (Baru Diupdate)
// ============================================================
function renderUpdateList(series) {
  const list = series || [...allSeries]
    .sort((a, b) => (b.latest_chapter_number || 0) - (a.latest_chapter_number || 0))
    .slice(0, 12);

  updateList.innerHTML = list.map(s => {
    const cover   = s.cover_portrait_url || s.cover_image_url || '';
    const chNum   = s.latest_chapter_number ? `Chapter ${s.latest_chapter_number}` : 'Ongoing';
    const timeAgo = randomTimeAgo();
    const isNew   = Math.random() > 0.4;
    return `
      <div class="update-item" data-id="${s.id}">
        <img class="update-thumb" src="${cover}" alt="${s.title}" loading="lazy"
             onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200'">
        <div class="update-info">
          <div class="update-title">${s.title}</div>
          <div class="update-chapter">${chNum}</div>
          <div class="update-time">${timeAgo}</div>
        </div>
        ${isNew ? '<span class="update-new-badge">NEW</span>' : ''}
      </div>`;
  }).join('');

  updateList.querySelectorAll('.update-item').forEach(item => {
    item.addEventListener('click', () => {
      const found = allSeries.find(s => s.id === item.dataset.id);
      if (found) openDetailModal(found);
    });
  });
}

// ============================================================
// RANKING (Sidebar)
// ============================================================
function renderRanking() {
  if (!allSeries.length) return;

  const top10 = [...allSeries]
    .sort((a, b) => (b.user_rate || 0) - (a.user_rate || 0))
    .slice(0, 10);

  rankingList.innerHTML = top10.map((s, i) => {
    const cover  = s.cover_portrait_url || s.cover_image_url || '';
    const rating = s.user_rate ? s.user_rate.toFixed(1) : '8.5';
    const chNum  = s.latest_chapter_number ? s.latest_chapter_number + ' Chapter' : 'Ongoing';
    const cls    = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
    return `
      <li class="ranking-item" data-id="${s.id}">
        <span class="rank-num ${cls}">${i + 1}</span>
        <img class="rank-thumb" src="${cover}" alt="${s.title}" loading="lazy"
             onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200'">
        <div class="rank-info">
          <div class="rank-title">${s.title}</div>
          <div class="rank-chapter">${chNum}</div>
          <div class="rank-score"><i class="fa-solid fa-star"></i> ${rating}</div>
        </div>
      </li>`;
  }).join('');

  rankingList.querySelectorAll('.ranking-item').forEach(item => {
    item.addEventListener('click', () => {
      const found = allSeries.find(s => s.id === item.dataset.id);
      if (found) openDetailModal(found);
    });
  });
}

// ============================================================
// COMIC GRID (Browse / Search)
// ============================================================
function renderComicGrid(series) {
  // Switch to grid view
  updateList.classList.add('hidden');
  comicGrid.classList.remove('hidden');

  catalogCount.textContent = `${series.length} dari ${allSeries.length} Series`;

  if (!series.length) {
    comicGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  comicGrid.innerHTML = series.map(s => {
    const cover  = s.cover_portrait_url || s.cover_image_url || '';
    const rating = s.user_rate ? s.user_rate.toFixed(1) : '8.5';
    const chNum  = s.latest_chapter_number ? `Ch. ${s.latest_chapter_number}` : 'Ongoing';
    const type   = s.type || 'Manhwa';
    return `
      <div class="comic-card" data-id="${s.id}">
        <div class="card-poster">
          <img src="${cover}" alt="${s.title}" loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300'">
          <div class="poster-overlay">
            <span class="card-badge">${type}</span>
            <span class="card-rating"><i class="fa-solid fa-star"></i> ${rating}</span>
          </div>
        </div>
        <div class="card-content">
          <h3 class="card-title">${s.title}</h3>
          <div class="card-meta">
            <span class="card-chapter">${chNum}</span>
            <i class="fa-${bookmarks.includes(s.id) ? 'solid' : 'regular'} fa-bookmark"
               style="color:${bookmarks.includes(s.id) ? 'var(--pink)' : 'var(--text-dim)'}"></i>
          </div>
        </div>
      </div>`;
  }).join('');

  comicGrid.querySelectorAll('.comic-card').forEach(card => {
    card.addEventListener('click', () => {
      const found = allSeries.find(s => s.id === card.dataset.id);
      if (found) openDetailModal(found);
    });
  });
}

function switchToHomeView() {
  catalogTitle.innerHTML = '<i class="fa-solid fa-layer-group"></i> Baru Diupdate';
  catalogCount.textContent = '';
  comicGrid.classList.add('hidden');
  emptyState.classList.add('hidden');
  updateList.classList.remove('hidden');
  renderUpdateList();
}

function switchToBrowseView(title = 'Semua Komik', icon = 'fa-grid-2') {
  catalogTitle.innerHTML = `<i class="fa-solid ${icon}"></i> ${title}`;
  const filtered = getFilteredSeries();
  renderComicGrid(filtered);
}

// ============================================================
// FILTER / SORT ENGINE
// ============================================================
function getFilteredSeries() {
  return allSeries.filter(item => {
    if (currentFilter.search) {
      const q = currentFilter.search;
      const m = (item.title || '').toLowerCase().includes(q)
             || (item.alternative_title || '').toLowerCase().includes(q)
             || (item.genres || []).some(g => g.toLowerCase().includes(q));
      if (!m) return false;
    }
    if (currentFilter.type !== 'all' && item.type !== currentFilter.type) return false;
    if (currentFilter.genre !== 'all' && !(item.genres || []).includes(currentFilter.genre)) return false;
    return true;
  }).sort((a, b) => {
    if (currentFilter.sort === 'rating') return (b.user_rate || 0) - (a.user_rate || 0);
    if (currentFilter.sort === 'views')  return (b.view_count || 0) - (a.view_count || 0);
    if (currentFilter.sort === 'latest') return (b.latest_chapter_number || 0) - (a.latest_chapter_number || 0);
    return 0;
  });
}

function populateGenreDropdown() {
  const genreSet = new Set();
  allSeries.forEach(s => (s.genres || []).forEach(g => genreSet.add(g)));
  const sorted = Array.from(genreSet).sort();
  filterGenre.innerHTML = `<option value="all">Semua Genre</option>`
    + sorted.map(g => `<option value="${g}">${g}</option>`).join('');
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function setupEventListeners() {
  // Search
  searchInput.addEventListener('input', e => {
    currentFilter.search = e.target.value.toLowerCase().trim();
    clearSearchBtn.classList.toggle('hidden', !currentFilter.search);
    if (currentFilter.search) {
      switchToBrowseView('Hasil Pencarian: "' + e.target.value + '"', 'fa-magnifying-glass');
    } else {
      switchToHomeView();
    }
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentFilter.search = '';
    clearSearchBtn.classList.add('hidden');
    switchToHomeView();
  });

  // "/" shortcut for search
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
    if (e.key === 'Escape') {
      if (!readerOverlay.classList.contains('hidden')) {
        readerOverlay.classList.add('hidden');
      } else if (!detailModal.classList.contains('hidden')) {
        detailModal.classList.add('hidden');
      }
    }
  });

  // Filters
  filterType.addEventListener('change', e => {
    currentFilter.type = e.target.value;
    switchToBrowseView();
  });

  filterGenre.addEventListener('change', e => {
    currentFilter.genre = e.target.value;
    if (e.target.value !== 'all') {
      switchToBrowseView(e.target.value, 'fa-tag');
    } else {
      switchToHomeView();
    }
  });

  sortBy.addEventListener('change', e => {
    currentFilter.sort = e.target.value;
    if (!comicGrid.classList.contains('hidden')) switchToBrowseView();
  });

  resetFilterBtn.addEventListener('click', () => {
    currentFilter = { search: '', type: 'all', genre: 'all', sort: 'latest', view: 'home' };
    searchInput.value = '';
    filterType.value = 'all';
    filterGenre.value = 'all';
    sortBy.value = 'latest';
    clearSearchBtn.classList.add('hidden');
    switchToHomeView();
  });

  // Hero slider
  sliderPrev.addEventListener('click', () => goToSlide(heroIdx - 1));
  sliderNext.addEventListener('click', () => goToSlide(heroIdx + 1));

  // Trending scroll
  trendingPrev.addEventListener('click', () => {
    trendingRow.scrollBy({ left: -400, behavior: 'smooth' });
  });
  trendingNext.addEventListener('click', () => {
    trendingRow.scrollBy({ left: 400, behavior: 'smooth' });
  });

  // Sidebar Nav
  document.getElementById('sb-beranda').addEventListener('click', e => {
    e.preventDefault();
    setSidebarActive('sb-beranda');
    switchToHomeView();
  });
  document.getElementById('sb-semua').addEventListener('click', e => {
    e.preventDefault();
    setSidebarActive('sb-semua');
    currentFilter = { ...currentFilter, genre: 'all', type: 'all', sort: 'rating' };
    switchToBrowseView('Semua Komik', 'fa-grid-2');
  });
  document.getElementById('sb-populer').addEventListener('click', e => {
    e.preventDefault();
    setSidebarActive('sb-populer');
    currentFilter = { ...currentFilter, sort: 'views' };
    switchToBrowseView('Paling Populer', 'fa-fire-flame-curved');
  });
  document.getElementById('sb-ranking').addEventListener('click', e => {
    e.preventDefault();
    setSidebarActive('sb-ranking');
    currentFilter = { ...currentFilter, sort: 'rating' };
    switchToBrowseView('Top Ranking', 'fa-trophy');
  });
  document.getElementById('sb-update').addEventListener('click', e => {
    e.preventDefault();
    setSidebarActive('sb-update');
    currentFilter = { ...currentFilter, sort: 'latest' };
    switchToBrowseView('Update Terbaru', 'fa-clock');
  });
  document.getElementById('sb-bookmark').addEventListener('click', e => {
    e.preventDefault();
    setSidebarActive('sb-bookmark');
    const bkmSeries = allSeries.filter(s => bookmarks.includes(s.id));
    catalogTitle.innerHTML = '<i class="fa-solid fa-bookmark"></i> Bookmark Saya';
    renderComicGrid(bkmSeries);
  });

  // Genre sidebar items
  document.querySelectorAll('.sidebar-genre-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const genre = item.dataset.genre;
      currentFilter.genre = genre;
      filterGenre.value = genre;
      switchToBrowseView(genre, 'fa-tag');
      document.querySelectorAll('.sidebar-genre-item').forEach(g => g.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // Ranking full button
  btnRankingFull.addEventListener('click', () => {
    setSidebarActive('sb-ranking');
    currentFilter.sort = 'rating';
    switchToBrowseView('Top Ranking', 'fa-trophy');
  });

  // Nav links
  document.getElementById('nav-komik').addEventListener('click', e => {
    e.preventDefault(); switchToBrowseView();
  });
  document.getElementById('nav-ranking').addEventListener('click', e => {
    e.preventDefault();
    currentFilter.sort = 'rating';
    switchToBrowseView('Top Ranking', 'fa-trophy');
  });
  document.getElementById('nav-update').addEventListener('click', e => {
    e.preventDefault();
    currentFilter.sort = 'latest';
    switchToBrowseView('Update Terbaru', 'fa-clock');
  });
  document.getElementById('nav-beranda').addEventListener('click', e => {
    e.preventDefault(); switchToHomeView();
  });

  // Modal close
  closeModalBtn.addEventListener('click', () => detailModal.classList.add('hidden'));
  detailModal.addEventListener('click', e => {
    if (e.target === detailModal) detailModal.classList.add('hidden');
  });

  // Reader close
  closeReaderBtn.addEventListener('click', () => readerOverlay.classList.add('hidden'));

  // Mobile sidebar toggle
  mobileMenuBtn.addEventListener('click', () => {
    sidebarLeft.classList.toggle('open');
  });

  // Theme toggle (cosmetic for now)
  themeToggle.addEventListener('click', () => {
    const icon = document.getElementById('theme-icon');
    icon.classList.toggle('fa-moon');
    icon.classList.toggle('fa-sun');
  });
}

function setSidebarActive(id) {
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// ============================================================
// DETAIL MODAL
// ============================================================
function openDetailModal(item) {
  selectedSeries = item;
  const cover    = item.cover_portrait_url || item.cover_image_url || '';
  const rating   = item.user_rate ? item.user_rate.toFixed(1) : 'N/A';
  const views    = formatCount(item.view_count || 0);
  const bks      = formatCount(item.bookmark_count || 0);
  const chapters = item.chapters || [];
  const isBkm    = bookmarks.includes(item.id);
  const genresHTML = (item.genres || []).map(g =>
    `<span class="detail-badge genre">${g}</span>`).join('');

  modalBody.innerHTML = `
    <div class="detail-grid">
      <div>
        <img src="${cover}" alt="${item.title}" class="detail-cover"
             onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400'">
        <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:0.85rem">
          <button class="btn-baca" id="modal-read-btn" style="justify-content:center">
            <i class="fa-solid fa-book-open"></i> Baca Sekarang
          </button>
          <button class="btn-bookmark-hero ${isBkm ? 'bookmarked' : ''}" id="modal-bkm-btn"
                  style="justify-content:center;border-radius:var(--radius-full)">
            <i class="fa-${isBkm ? 'solid' : 'regular'} fa-bookmark"></i>
            ${isBkm ? 'Di-bookmark' : 'Tambah Bookmark'}
          </button>
        </div>
      </div>

      <div class="detail-info">
        <h2>${item.title}</h2>
        ${item.alternative_title ? `<p class="detail-alt"><i class="fa-solid fa-globe"></i> ${item.alternative_title}</p>` : ''}

        <div class="detail-tags">
          <span class="detail-badge status">${item.status || 'Ongoing'}</span>
          <span class="detail-badge type">${item.type || 'Manhwa'}</span>
          <span class="detail-badge rating"><i class="fa-solid fa-star"></i> ${rating}</span>
          <span class="detail-badge views"><i class="fa-solid fa-eye"></i> ${views} Views</span>
          <span class="detail-badge views"><i class="fa-solid fa-bookmark"></i> ${bks} Bookmark</span>
        </div>

        <div class="detail-tags">${genresHTML}</div>

        <p class="detail-synopsis">${item.description || 'Tidak ada sinopsis tersedia.'}</p>
      </div>
    </div>

    <div class="chapter-section">
      <div class="chapter-header">
        <h3><i class="fa-solid fa-list-ol"></i> Daftar Chapter (${chapters.length || 0})</h3>
        <input type="text" id="ch-search" class="chapter-search" placeholder="Cari chapter...">
      </div>
      <div class="chapter-grid" id="chapter-grid">
        ${chapters.length > 0
          ? chapters.map((ch, idx) => `
              <div class="chapter-item" data-idx="${idx}">
                <span class="ch-num">Chapter ${ch.chapter_number}</span>
                <span class="ch-date">${ch.release_date ? new Date(ch.release_date).toLocaleDateString('id-ID') : ''}</span>
              </div>`).join('')
          : '<p style="color:var(--text-dim);padding:1rem;grid-column:1/-1">Baca langsung via tombol Baca Sekarang.</p>'
        }
      </div>
    </div>`;

  // Handlers
  document.getElementById('modal-read-btn').addEventListener('click', () => {
    if (chapters.length > 0) openReader(0);
  });

  const bkmBtn = document.getElementById('modal-bkm-btn');
  bkmBtn.addEventListener('click', () => {
    toggleBookmark(item.id);
    const now = bookmarks.includes(item.id);
    bkmBtn.innerHTML = `<i class="fa-${now ? 'solid' : 'regular'} fa-bookmark"></i> ${now ? 'Di-bookmark' : 'Tambah Bookmark'}`;
    bkmBtn.classList.toggle('bookmarked', now);
    updateHeroBookmarkBtn(item.id);
  });

  // Chapter search
  const chSearch = document.getElementById('ch-search');
  if (chSearch) {
    chSearch.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.chapter-item').forEach(el => {
        el.style.display = el.innerText.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  // Chapter click
  document.querySelectorAll('.chapter-item').forEach(el => {
    el.addEventListener('click', () => openReader(parseInt(el.dataset.idx)));
  });

  detailModal.classList.remove('hidden');

  // Save to history
  addToHistory(item.id, 1);
}

// ============================================================
// READER
// ============================================================
async function openReader(chapterIdx) {
  if (!selectedSeries || !selectedSeries.chapters?.length) return;

  currentChapterIdx = chapterIdx;
  const ch = selectedSeries.chapters[chapterIdx];

  readerSeriesTitle.textContent = selectedSeries.title;
  readerChTitle.textContent     = `Chapter ${ch.chapter_number}`;
  readerOverlay.classList.remove('hidden');
  detailModal.classList.add('hidden');

  prevChBtn.disabled = currentChapterIdx >= selectedSeries.chapters.length - 1;
  nextChBtn.disabled = currentChapterIdx <= 0;

  prevChBtn.onclick = () => { if (currentChapterIdx < selectedSeries.chapters.length - 1) openReader(currentChapterIdx + 1); };
  nextChBtn.onclick = () => { if (currentChapterIdx > 0) openReader(currentChapterIdx - 1); };

  // Loading
  readerContent.innerHTML = `
    <div class="reader-loading">
      <div class="spinner"></div>
      <p>Memuat Chapter ${ch.chapter_number}...</p>
    </div>`;

  try {
    const res  = await fetch(`https://api.shngm.io/v1/chapter/detail/${ch.chapter_id}`);
    const data = await res.json();

    if (data.retcode === 0 && data.data?.chapter) {
      const cdata     = data.data;
      const baseUrl   = cdata.base_url || 'https://assets.shngm.id';
      const cpath     = cdata.chapter.path || '';
      const imgFiles  = cdata.chapter.data || [];

      if (!imgFiles.length) {
        readerContent.innerHTML = `
          <div class="reader-placeholder">
            <i class="fa-solid fa-image-slash"></i>
            <h3>Gambar Tidak Tersedia</h3>
            <p>Gambar chapter ini belum tersedia dari server.</p>
          </div>`;
        return;
      }

      const imgsHTML = imgFiles.map((f, i) =>
        `<img class="reader-page-img" src="${baseUrl}${cpath}${f}" alt="Page ${i+1}" loading="lazy" referrerpolicy="no-referrer">`
      ).join('');

      readerContent.innerHTML = `
        <div class="reader-images-wrap">
          ${imgsHTML}
          <div class="reader-footer-nav">
            <p style="color:var(--text-muted)">Selesai membaca Chapter ${ch.chapter_number}</p>
            <div class="reader-nav-row">
              ${currentChapterIdx < selectedSeries.chapters.length - 1
                ? `<button class="btn-baca" onclick="openReader(${currentChapterIdx + 1})"><i class="fa-solid fa-chevron-left"></i> Sebelumnya</button>` : ''}
              ${currentChapterIdx > 0
                ? `<button class="btn-baca" onclick="openReader(${currentChapterIdx - 1})">Selanjutnya <i class="fa-solid fa-chevron-right"></i></button>` : ''}
            </div>
          </div>
        </div>`;

      readerContent.scrollTop = 0;

      // Update history
      addToHistory(selectedSeries.id, ch.chapter_number);

    } else {
      throw new Error('Gagal mendapatkan data chapter');
    }
  } catch (err) {
    console.error(err);
    readerContent.innerHTML = `
      <div class="reader-placeholder">
        <i class="fa-solid fa-triangle-exclamation" style="color:var(--red)"></i>
        <h3>Gagal Memuat Chapter</h3>
        <p>${err.message || 'Terjadi kesalahan jaringan.'}</p>
      </div>`;
  }
}

// ============================================================
// BOOKMARK & HISTORY
// ============================================================
function toggleBookmark(id) {
  const idx = bookmarks.indexOf(id);
  if (idx > -1) bookmarks.splice(idx, 1);
  else bookmarks.push(id);
  localStorage.setItem('oniverse_bookmarks', JSON.stringify(bookmarks));
  updateBookmarkBadge();
}

function updateBookmarkBadge() {
  if (bookmarkCount) bookmarkCount.textContent = bookmarks.length;
}

function addToHistory(id, chapter, progress = 30) {
  readHistory = readHistory.filter(h => h.id !== id);
  readHistory.unshift({ id, chapter, progress, time: Date.now() });
  readHistory = readHistory.slice(0, 20);
  localStorage.setItem('oniverse_history', JSON.stringify(readHistory));
}

// ============================================================
// UTILS
// ============================================================
function formatCount(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function randomTimeAgo() {
  const units = [
    [1, 'menit'],
    [2, 'menit'],
    [5, 'menit'],
    [10, 'menit'],
    [15, 'menit'],
    [20, 'menit'],
  ];
  const [val, unit] = units[Math.floor(Math.random() * units.length)];
  return `${val} ${unit} lalu`;
}
