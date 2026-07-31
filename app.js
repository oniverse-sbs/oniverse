/* ==========================================================================
   Shinigami Verse - Application Frontend Script
   ========================================================================== */

let rawDataset = null;
let allSeries = [];
let bookmarks = JSON.parse(localStorage.getItem('shinigami_bookmarks') || '[]');
let currentFilter = {
  search: '',
  type: 'all',
  genre: 'all',
  status: 'all',
  sort: 'rating',
  view: 'explore' // 'explore' or 'bookmarks'
};
let selectedSeries = null;
let currentChapterIdx = -1;

// DOM Elements
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const filterType = document.getElementById('filter-type');
const filterGenre = document.getElementById('filter-genre');
const filterStatus = document.getElementById('filter-status');
const sortBy = document.getElementById('sort-by');
const comicGrid = document.getElementById('comic-grid');
const emptyState = document.getElementById('empty-state');
const resetFilterBtn = document.getElementById('reset-filter-btn');
const catalogCount = document.getElementById('catalog-count');

const navExplore = document.getElementById('nav-explore');
const navBookmarks = document.getElementById('nav-bookmarks');
const bookmarkBadge = document.getElementById('bookmark-badge');

const heroSection = document.getElementById('hero-section');
const heroBg = document.getElementById('hero-bg');
const heroTitle = document.getElementById('hero-title');
const heroSynopsis = document.getElementById('hero-synopsis');
const heroType = document.getElementById('hero-type');
const heroRating = document.getElementById('hero-rating');
const heroReadBtn = document.getElementById('hero-read-btn');
const heroBookmarkBtn = document.getElementById('hero-bookmark-btn');

const detailModal = document.getElementById('detail-modal');
const modalBody = document.getElementById('modal-body');
const closeModalBtn = document.getElementById('close-modal-btn');

const readerOverlay = document.getElementById('reader-overlay');
const closeReaderBtn = document.getElementById('close-reader-btn');
const readerSeriesTitle = document.getElementById('reader-series-title');
const readerChapterTitle = document.getElementById('reader-chapter-title');
const prevChapterBtn = document.getElementById('prev-chapter-btn');
const nextChapterBtn = document.getElementById('next-chapter-btn');
const readerContent = document.getElementById('reader-content');

const footerCount = document.getElementById('footer-count');
const footerTime = document.getElementById('footer-time');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  updateBookmarkBadge();
  setupEventListeners();

  try {
    const res = await fetch('scraped_data/series.json');
    if (!res.ok) throw new Error('Data file not found');
    rawDataset = await res.json();
    allSeries = rawDataset.series || [];
    
    // Update footer info
    if (rawDataset.metadata) {
      footerCount.innerHTML = `<i class="fa-solid fa-database"></i> ${rawDataset.metadata.total_series} Komik Terdata`;
      footerTime.innerHTML = `<i class="fa-solid fa-clock"></i> Updated: ${rawDataset.metadata.scraped_at}`;
    }

    // Setup Featured Hero
    setupHeroSpotlight();

    // Populate Genres dropdown dynamically
    populateGenreDropdown();

    // Render Grid
    renderGrid();
  } catch (err) {
    console.error('Failed to load dataset:', err);
    comicGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-triangle-exclamation empty-icon" style="color: #ef4444;"></i>
        <h3>Gagal Memuat Data</h3>
        <p>File data scraped_data/series.json belum tersedia atau gagal dimuat.</p>
      </div>
    `;
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Search
  searchInput.addEventListener('input', (e) => {
    currentFilter.search = e.target.value.toLowerCase().trim();
    clearSearchBtn.classList.toggle('hidden', currentFilter.search === '');
    renderGrid();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentFilter.search = '';
    clearSearchBtn.classList.add('hidden');
    renderGrid();
  });

  // Filters
  filterType.addEventListener('change', (e) => {
    currentFilter.type = e.target.value;
    renderGrid();
  });

  filterGenre.addEventListener('change', (e) => {
    currentFilter.genre = e.target.value;
    renderGrid();
  });

  filterStatus.addEventListener('change', (e) => {
    currentFilter.status = e.target.value;
    renderGrid();
  });

  sortBy.addEventListener('change', (e) => {
    currentFilter.sort = e.target.value;
    renderGrid();
  });

  resetFilterBtn.addEventListener('click', () => {
    searchInput.value = '';
    filterType.value = 'all';
    filterGenre.value = 'all';
    filterStatus.value = 'all';
    sortBy.value = 'rating';
    currentFilter = { search: '', type: 'all', genre: 'all', status: 'all', sort: 'rating', view: 'explore' };
    clearSearchBtn.classList.add('hidden');
    renderGrid();
  });

  // Navigation
  navExplore.addEventListener('click', () => {
    currentFilter.view = 'explore';
    navExplore.classList.add('active');
    navBookmarks.classList.remove('active');
    heroSection.classList.remove('hidden');
    renderGrid();
  });

  navBookmarks.addEventListener('click', () => {
    currentFilter.view = 'bookmarks';
    navBookmarks.classList.add('active');
    navExplore.classList.remove('active');
    heroSection.classList.add('hidden');
    renderGrid();
  });

  // Modals
  closeModalBtn.addEventListener('click', () => {
    detailModal.classList.add('hidden');
  });

  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) detailModal.classList.add('hidden');
  });

  // Reader
  closeReaderBtn.addEventListener('click', () => {
    readerOverlay.classList.add('hidden');
  });
}

// Hero Spotlight Setup
function setupHeroSpotlight() {
  if (!allSeries || allSeries.length === 0) return;

  const featured = allSeries[0];
  heroBg.style.backgroundImage = `url('${featured.cover_image_url || featured.cover_portrait_url}')`;
  heroTitle.textContent = featured.title;
  heroSynopsis.textContent = featured.description || 'Tidak ada deskripsi.';
  heroType.textContent = (featured.type || 'MANHWA').toUpperCase();
  heroRating.innerHTML = `<i class="fa-solid fa-star"></i> ${featured.user_rate ? featured.user_rate.toFixed(1) : '8.8'}`;

  updateHeroBookmarkBtn(featured.id);

  heroReadBtn.onclick = () => openDetailModal(featured);
  heroBookmarkBtn.onclick = () => {
    toggleBookmark(featured.id);
    updateHeroBookmarkBtn(featured.id);
  };
}

function updateHeroBookmarkBtn(seriesId) {
  const isBookmarked = bookmarks.includes(seriesId);
  heroBookmarkBtn.innerHTML = isBookmarked 
    ? `<i class="fa-solid fa-bookmark" style="color: var(--accent-pink);"></i> Bookmarked`
    : `<i class="fa-regular fa-bookmark"></i> Bookmark`;
}

// Dynamic Genre Populator
function populateGenreDropdown() {
  const genreSet = new Set();
  allSeries.forEach(s => {
    if (s.genres) s.genres.forEach(g => genreSet.add(g));
  });

  const sortedGenres = Array.from(genreSet).sort();
  filterGenre.innerHTML = `<option value="all">Semua Genre (${sortedGenres.length})</option>`;
  sortedGenres.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    filterGenre.appendChild(opt);
  });
}

// Filter and Sort Engine
function getFilteredSeries() {
  return allSeries.filter(item => {
    // Bookmarks View Filter
    if (currentFilter.view === 'bookmarks' && !bookmarks.includes(item.id)) {
      return false;
    }

    // Search filter
    if (currentFilter.search) {
      const q = currentFilter.search;
      const titleMatch = item.title && item.title.toLowerCase().includes(q);
      const altMatch = item.alternative_title && item.alternative_title.toLowerCase().includes(q);
      const genreMatch = item.genres && item.genres.some(g => g.toLowerCase().includes(q));
      if (!titleMatch && !altMatch && !genreMatch) return false;
    }

    // Type filter
    if (currentFilter.type !== 'all' && item.type !== currentFilter.type) {
      return false;
    }

    // Genre filter
    if (currentFilter.genre !== 'all' && (!item.genres || !item.genres.includes(currentFilter.genre))) {
      return false;
    }

    // Status filter
    if (currentFilter.status !== 'all' && item.status !== currentFilter.status) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    if (currentFilter.sort === 'rating') {
      return (b.user_rate || 0) - (a.user_rate || 0);
    } else if (currentFilter.sort === 'views') {
      return (b.view_count || 0) - (a.view_count || 0);
    } else if (currentFilter.sort === 'bookmarks') {
      return (b.bookmark_count || 0) - (a.bookmark_count || 0);
    } else if (currentFilter.sort === 'latest') {
      return (b.latest_chapter_number || 0) - (a.latest_chapter_number || 0);
    }
    return 0;
  });
}

// Render Grid
function renderGrid() {
  const filtered = getFilteredSeries();

  catalogCount.textContent = currentFilter.view === 'bookmarks'
    ? `Menampilkan ${filtered.length} Komik Di-bookmark`
    : `Menampilkan ${filtered.length} dari ${allSeries.length} Series`;

  if (filtered.length === 0) {
    comicGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  comicGrid.innerHTML = filtered.map(item => createComicCardHTML(item)).join('');

  // Attach card click handlers
  document.querySelectorAll('.comic-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const found = allSeries.find(s => s.id === id);
      if (found) openDetailModal(found);
    });
  });
}

// Create Card HTML
function createComicCardHTML(item) {
  const cover = item.cover_portrait_url || item.cover_image_url || 'https://via.placeholder.com/300x400';
  const rating = item.user_rate ? item.user_rate.toFixed(1) : '8.5';
  const chNum = item.latest_chapter_number ? `Ch. ${item.latest_chapter_number}` : 'Ongoing';
  const typeStr = item.type || 'Manhwa';
  const isBookmarked = bookmarks.includes(item.id);

  return `
    <div class="comic-card" data-id="${item.id}">
      <div class="card-poster">
        <img src="${cover}" alt="${item.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400'">
        <div class="poster-overlay">
          <span class="card-badge">${typeStr}</span>
          <span class="card-rating"><i class="fa-solid fa-star"></i> ${rating}</span>
        </div>
      </div>
      <div class="card-content">
        <h3 class="card-title">${item.title}</h3>
        <div class="card-meta">
          <span class="card-chapter">${chNum}</span>
          <span><i class="fa-solid fa-bookmark" style="color: ${isBookmarked ? 'var(--accent-pink)' : 'var(--text-dim)'}"></i></span>
        </div>
      </div>
    </div>
  `;
}

// Open Series Detail Modal
function openDetailModal(item) {
  selectedSeries = item;
  const isBookmarked = bookmarks.includes(item.id);
  const cover = item.cover_portrait_url || item.cover_image_url;
  const rating = item.user_rate ? item.user_rate.toFixed(1) : 'N/A';
  const views = item.view_count ? item.view_count.toLocaleString() : '0';
  const bks = item.bookmark_count ? item.bookmark_count.toLocaleString() : '0';

  const genresHTML = (item.genres || []).map(g => `<span class="genre-tag">${g}</span>`).join('');
  const chapters = item.chapters || [];

  modalBody.innerHTML = `
    <div class="detail-header-grid">
      <div>
        <img src="${cover}" alt="${item.title}" class="detail-cover" onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400'">
        <button class="btn ${isBookmarked ? 'btn-glass' : 'btn-primary'}" id="modal-bookmark-btn" style="width: 100%; margin-top: 1rem;">
          <i class="fa-solid fa-bookmark" style="${isBookmarked ? 'color: var(--accent-pink);' : ''}"></i>
          ${isBookmarked ? 'Di-bookmark' : 'Tambah Bookmark'}
        </button>
      </div>

      <div class="detail-info">
        <h2>${item.title}</h2>
        ${item.alternative_title ? `<p class="detail-alt-title"><i class="fa-solid fa-globe"></i> ${item.alternative_title}</p>` : ''}
        
        <div class="detail-tags">
          <span class="badge badge-hot">${item.status}</span>
          <span class="badge badge-type">${item.type}</span>
          <span class="badge badge-rating"><i class="fa-solid fa-star"></i> ${rating}</span>
          <span class="genre-tag"><i class="fa-solid fa-eye"></i> ${views} Views</span>
          <span class="genre-tag"><i class="fa-solid fa-bookmark"></i> ${bks} Bookmarks</span>
        </div>

        <div class="detail-tags">
          ${genresHTML}
        </div>

        <p class="detail-synopsis">${item.description || 'Tidak ada sinopsis tersedia.'}</p>
      </div>
    </div>

    <div class="chapter-section">
      <div class="chapter-header">
        <h3><i class="fa-solid fa-list-ol"></i> Daftar Chapter (${chapters.length > 0 ? chapters.length : 'Terbaru'})</h3>
        <input type="text" id="chapter-search-input" placeholder="Cari chapter..." style="padding: 0.4rem 0.8rem; border-radius: 8px; border: 1px solid var(--border-glass); background: var(--bg-card); color: #fff; font-size: 0.85rem;">
      </div>

      <div class="chapter-grid" id="chapter-list-grid">
        ${chapters.length > 0 ? chapters.map((ch, idx) => `
          <div class="chapter-item" data-idx="${idx}">
            <span class="ch-num">Chapter ${ch.chapter_number}</span>
            <span class="ch-date">${ch.release_date ? new Date(ch.release_date).toLocaleDateString('id-ID') : 'Latest'}</span>
          </div>
        `).join('') : '<p style="color: var(--text-dim); padding: 1rem;">Chapter list siap dibaca melalui aplikasi web.</p>'}
      </div>
    </div>
  `;

  // Filter chapters search
  const chSearch = document.getElementById('chapter-search-input');
  if (chSearch) {
    chSearch.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('.chapter-item').forEach(el => {
        const text = el.innerText.toLowerCase();
        el.style.display = text.includes(q) ? 'flex' : 'none';
      });
    });
  }

  // Attach modal handlers
  const modalBkmBtn = document.getElementById('modal-bookmark-btn');
  modalBkmBtn.addEventListener('click', () => {
    toggleBookmark(item.id);
    const nowBkm = bookmarks.includes(item.id);
    modalBkmBtn.className = `btn ${nowBkm ? 'btn-glass' : 'btn-primary'}`;
    modalBkmBtn.innerHTML = `<i class="fa-solid fa-bookmark" style="${nowBkm ? 'color: var(--accent-pink);' : ''}"></i> ${nowBkm ? 'Di-bookmark' : 'Tambah Bookmark'}`;
    updateHeroBookmarkBtn(item.id);
    renderGrid();
  });

  // Chapter items handler
  document.querySelectorAll('.chapter-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.idx);
      openReader(idx);
    });
  });

  detailModal.classList.remove('hidden');
}

// Open Reader Overlay & Render Page Images
async function openReader(chapterIdx) {
  if (!selectedSeries || !selectedSeries.chapters || selectedSeries.chapters.length === 0) return;
  
  currentChapterIdx = chapterIdx;
  const ch = selectedSeries.chapters[chapterIdx];

  readerSeriesTitle.textContent = selectedSeries.title;
  readerChapterTitle.textContent = `Chapter ${ch.chapter_number}`;
  readerOverlay.classList.remove('hidden');

  // Update Navigation Buttons state
  prevChapterBtn.disabled = currentChapterIdx >= selectedSeries.chapters.length - 1;
  nextChapterBtn.disabled = currentChapterIdx <= 0;

  prevChapterBtn.onclick = () => { if (currentChapterIdx < selectedSeries.chapters.length - 1) openReader(currentChapterIdx + 1); };
  nextChapterBtn.onclick = () => { if (currentChapterIdx > 0) openReader(currentChapterIdx - 1); };

  // Show Loading Spinner
  readerContent.innerHTML = `
    <div class="reader-loading">
      <div class="spinner"></div>
      <p style="margin-top: 1rem; color: var(--text-muted);">Memuat gambar Chapter ${ch.chapter_number}...</p>
    </div>
  `;

  try {
    const res = await fetch(`https://api.shngm.io/v1/chapter/detail/${ch.chapter_id}`);
    const data = await res.json();

    if (data.retcode === 0 && data.data && data.data.chapter) {
      const cdata = data.data;
      const baseUrl = cdata.base_url || 'https://assets.shngm.id';
      const cpath = cdata.chapter.path || '';
      const imageFiles = cdata.chapter.data || [];

      if (imageFiles.length === 0) {
        readerContent.innerHTML = `
          <div class="reader-placeholder">
            <i class="fa-solid fa-image-slash placeholder-icon"></i>
            <h3>Gambar Tidak Tersedia</h3>
            <p>Gambar chapter ini belum dapat dimuat dari server source.</p>
          </div>
        `;
        return;
      }

      // Render vertical images layout
      const imagesHTML = imageFiles.map((filename, i) => {
        const fullUrl = `${baseUrl}${cpath}${filename}`;
        return `<img class="reader-page-img" src="${fullUrl}" alt="Page ${i+1}" referrerpolicy="no-referrer" loading="lazy">`;
      }).join('');

      readerContent.innerHTML = `
        <div class="reader-images-wrapper">
          ${imagesHTML}
          <div class="reader-footer-nav">
            <p style="color: var(--text-muted); margin-bottom: 1rem;">Selesai membaca Chapter ${ch.chapter_number}</p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
              ${currentChapterIdx < selectedSeries.chapters.length - 1 ? `<button class="btn btn-primary" onclick="openReader(${currentChapterIdx + 1})"><i class="fa-solid fa-chevron-left"></i> Chapter Sebelumnya</button>` : ''}
              ${currentChapterIdx > 0 ? `<button class="btn btn-primary" onclick="openReader(${currentChapterIdx - 1})">Chapter Selanjutnya <i class="fa-solid fa-chevron-right"></i></button>` : ''}
            </div>
          </div>
        </div>
      `;

      // Scroll reader to top
      readerContent.scrollTop = 0;
    } else {
      throw new Error('Gagal mendapatkan detail chapter');
    }
  } catch (err) {
    console.error('Error loading chapter detail:', err);
    readerContent.innerHTML = `
      <div class="reader-placeholder">
        <i class="fa-solid fa-triangle-exclamation placeholder-icon" style="color: #ef4444;"></i>
        <h3>Gagal Memuat Gambar Chapter</h3>
        <p style="margin-top: 0.5rem; color: var(--text-muted);">${err.message || 'Terjadi kesalahan jaringan.'}</p>
      </div>
    `;
  }
}

// Bookmark Functions
function toggleBookmark(seriesId) {
  const index = bookmarks.indexOf(seriesId);
  if (index > -1) {
    bookmarks.splice(index, 1);
  } else {
    bookmarks.push(seriesId);
  }
  localStorage.setItem('shinigami_bookmarks', JSON.stringify(bookmarks));
  updateBookmarkBadge();
}

function updateBookmarkBadge() {
  bookmarkBadge.textContent = bookmarks.length;
}
