/* ==========================================================================
   OniVerse.SBS — Application Logic
   ========================================================================== */

(function() {
  'use strict';

  // ==========================================================================
  //  SECURITY & ANTI-INSPECTION PROTECTIONS
  // ==========================================================================

  // 1. Disable right-click context menu
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
  });

  // 2. Block DevTools keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) { e.preventDefault(); return false; }
    // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element picker)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) { e.preventDefault(); return false; }
    // Ctrl+U (View Source)
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) { e.preventDefault(); return false; }
    // Ctrl+S (Save Page)
    if (e.ctrlKey && (e.key === 'S' || e.key === 's')) { e.preventDefault(); return false; }
    // Ctrl+Shift+K (Firefox Console)
    if (e.ctrlKey && e.shiftKey && (e.key === 'K' || e.key === 'k')) { e.preventDefault(); return false; }
  });

  // Anti-debugging disabled for max mobile performance

  // 4. Disable text selection on protected elements (images, covers)
  document.addEventListener('selectstart', function(e) {
    const tag = e.target.tagName;
    if (tag === 'IMG' || tag === 'CANVAS') {
      e.preventDefault();
      return false;
    }
  });

  // 5. Disable image dragging
  document.addEventListener('dragstart', function(e) {
    if (e.target.tagName === 'IMG') {
      e.preventDefault();
      return false;
    }
  });

  // 6. Console warning message
  console.log('%c⛔ STOP!', 'color:#ef4444;font-size:48px;font-weight:bold;text-shadow:2px 2px #000');
  console.log('%cJangan paste kode apapun di sini. Ini bisa membahayakan akun dan data kamu.', 'color:#f59e0b;font-size:16px');

  // 7. Overwrite console methods in production to suppress logs
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    const _noop = function() {};
    console.log = _noop;
    console.warn = _noop;
    console.info = _noop;
    console.debug = _noop;
    // Keep console.error for critical debugging
  }

  // ==========================================================================
  //  STATE
  // ==========================================================================
  const STATE = {
    allSeries: [],
    filtered: [],
    displayCount: 24,
    perPage: 24,
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
    if (!s) return 'unknown';
    if (s.slug) return s.slug;
    if (s.id) return String(s.id);
    return (s.title || s.name || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function getCover(s) {
    if (!s) return 'https://picsum.photos/300/400';
    if (s.cover) return s.cover;
    if (s.thumbnail) return s.thumbnail;
    if (s.cover_image_url) return s.cover_image_url;
    if (s.cover_portrait_url) return s.cover_portrait_url;
    return 'https://picsum.photos/300/400';
  }

  function getGenres(s) {
    if (!s) return ['Action', 'Fantasy'];
    if (Array.isArray(s.genres) && s.genres.length > 0) return s.genres;
    if (typeof s.genre === 'string' && s.genre.trim()) return s.genre.split(',').map(g => g.trim()).filter(Boolean);
    if (Array.isArray(s.genre) && s.genre.length > 0) return s.genre;
    return ['Action', 'Fantasy'];
  }

  function parseDateScore(s) {
    if (!s) return 0;
    const d = s.last_updated || s.updated_at || s.created_at || '';
    if (!d) return 0;
    const t = new Date(d).getTime();
    return isNaN(t) ? 0 : t;
  }

  function saveBookmarks() { localStorage.setItem('oniverse_bookmarks', JSON.stringify(STATE.bookmarks)); }
  function saveHistory() { localStorage.setItem('oniverse_history', JSON.stringify(STATE.history)); }
  function saveStats() { localStorage.setItem('oniverse_stats', JSON.stringify(STATE.readingStats)); }

  // ==========================================================================
  //  SEO & URL ROUTING (for Google Indexing)
  // ==========================================================================
  const SEO_DEFAULTS = {
    title: 'OniVerse.SBS - Baca Komik Indonesia, Manhwa Sub Indo & Manga Online Gratis',
    description: 'Situs baca komik Indonesia terlengkap. Tempat baca manhwa sub indo, manga, dan manhua bahasa indonesia online gratis dengan kualitas gambar HD terbaik, update chapter tercepat setiap hari!',
    canonical: 'https://oniverse.sbs/',
    ogImage: 'https://oniverse.sbs/og-image.png'
  };

  function updateSEOMeta(opts) {
    const title = opts.title || SEO_DEFAULTS.title;
    const desc = opts.description || SEO_DEFAULTS.description;
    const canonical = opts.canonical || SEO_DEFAULTS.canonical;
    const ogImage = opts.ogImage || SEO_DEFAULTS.ogImage;

    document.title = title;

    const setMeta = (attr, val, content) => {
      let el = document.querySelector(`meta[${attr}="${val}"]`);
      if (el) el.setAttribute('content', content);
    };

    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:image', ogImage);
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', desc);
    setMeta('name', 'twitter:image', ogImage);

    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (canonicalEl) canonicalEl.setAttribute('href', canonical);
  }

  function getComicURL(s) {
    return '/komik/' + getSlug(s) + '/';
  }

  function navigateToComic(s, replace) {
    const url = getComicURL(s);
    if (replace) {
      history.replaceState({ type: 'comic', slug: getSlug(s) }, '', url);
    } else {
      history.pushState({ type: 'comic', slug: getSlug(s) }, '', url);
    }
    const comicTitle = s.title || s.name || 'Unknown';
    const genres = getGenres(s);
    updateSEOMeta({
      title: `${comicTitle} - Baca Komik Sub Indo Gratis | OniVerse`,
      description: (s.synopsis || s.description || `Baca ${comicTitle} bahasa Indonesia gratis di OniVerse.SBS`).slice(0, 160),
      canonical: 'https://oniverse.sbs' + url,
      ogImage: getCover(s)
    });
  }

  function navigateToHome(replace) {
    if (replace) {
      history.replaceState({ type: 'home' }, '', '/');
    } else {
      history.pushState({ type: 'home' }, '', '/');
    }
    updateSEOMeta(SEO_DEFAULTS);
  }

  function parseRoute() {
    const path = window.location.pathname;
    const match = path.match(/^\/komik\/([^/]+)/);
    if (match) return { type: 'comic', slug: match[1] };
    return { type: 'home' };
  }

  function handleRoute(route) {
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
  }

  let _pendingRoute = null;

  function initRouter() {
    window.addEventListener('popstate', (e) => {
      const state = e.state;
      if (state && state.type === 'comic' && state.slug) {
        handleRoute(state);
      } else {
        closeDetail(true);
      }
    });

    const route = parseRoute();
    if (route.type === 'comic') {
      if (STATE.allSeries.length > 0) {
        handleRoute(route);
      } else {
        _pendingRoute = route;
      }
    }
  }

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
    updateCultivationUI();
  }

  // ==========================================================================
  //  USER AUTHENTICATION MODULE (LOGIN / REGISTER / GUEST STUCK SYSTEM)
  // ==========================================================================
  const AUTH_STATE = {
    user: JSON.parse(localStorage.getItem('oniverse_user') || 'null')
  };

  function isUserLoggedIn() {
    return !!AUTH_STATE.user;
  }

  function openAuthModal() {
    const modal = $('#auth-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const form = $('#auth-form');
    const loggedView = $('#auth-logged-in-view');
    const nameEl = $('#auth-user-name');
    const rankEl = $('#auth-user-rank');
    const avatarEl = $('#auth-user-avatar');

    if (isUserLoggedIn()) {
      form?.classList.add('hidden');
      loggedView?.classList.remove('hidden');
      if (nameEl) nameEl.textContent = AUTH_STATE.user.username;
      const { rank } = getCultivationRealm();
      if (rankEl) rankEl.textContent = `Ranah Kultivasi: ${rank.badge} ${rank.name}`;
      if (avatarEl) avatarEl.textContent = rank.badge;
    } else {
      form?.classList.remove('hidden');
      loggedView?.classList.add('hidden');
    }
  }

  function closeAuthModal() {
    $('#auth-modal')?.classList.add('hidden');
  }

  function handleAuthSubmit(e) {
    e.preventDefault();
    const uInput = $('#auth-input-user');
    const pInput = $('#auth-input-pass');
    if (!uInput || !pInput) return;

    const username = uInput.value.trim();
    const password = pInput.value.trim();
    if (!username || !password) return;

    AUTH_STATE.user = {
      username,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('oniverse_user', JSON.stringify(AUTH_STATE.user));
    localStorage.setItem('oniverse_username', username);
    FORUM_STATE.userName = username;

    closeAuthModal();
    updateCultivationUI();
    showToast(`Selamat datang Kultivator ${username}! Ranah kultivasi terbuka! 🐉`, 'success');
  }

  function handleLogout() {
    AUTH_STATE.user = null;
    localStorage.removeItem('oniverse_user');
    closeAuthModal();
    updateCultivationUI();
    showToast('Kamu telah keluar akun. Kultivasi terkunci di Level 1.', 'info');
  }

  // ==========================================================================
  //  CULTIVATION REALMS (24 RANAH KULTIVASI LENGKAP) & ADMIN DASHBOARD
  // ==========================================================================
  const CULTIVATION_REALMS = [
    { level: 1, name: "Half-Step Innate Soul", req: 0, badge: "🍃", color: "#94a3b8", aura: "rank-aura-1" },
    { level: 2, name: "Innate", req: 3, badge: "🌱", color: "#10b981", aura: "rank-aura-2" },
    { level: 3, name: "Spirit Illumination", req: 6, badge: "✨", color: "#06b6d4", aura: "rank-aura-3" },
    { level: 4, name: "Spirit Core", req: 10, badge: "🔮", color: "#3b82f6", aura: "rank-aura-4" },
    { level: 5, name: "Void Tribulation", req: 15, badge: "⚡", color: "#6366f1", aura: "rank-aura-5" },
    { level: 6, name: "Life and Death", req: 22, badge: "☯️", color: "#8b5cf6", aura: "rank-aura-6" },
    { level: 7, name: "Divine Sea", req: 30, badge: "🌊", color: "#0284c7", aura: "rank-aura-7" },
    { level: 8, name: "Divine Extremity", req: 40, badge: "🌋", color: "#f97316", aura: "rank-aura-8" },
    { level: 9, name: "Divine Transformation", req: 52, badge: "💫", color: "#d97706", aura: "rank-aura-9" },
    { level: 10, name: "World Lord", req: 68, badge: "🌍", color: "#16a34a", aura: "rank-aura-10" },
    { level: 11, name: "Heavenly Venerable", req: 88, badge: "☁️", color: "#38bdf8", aura: "rank-aura-11" },
    { level: 12, name: "True God", req: 110, badge: "🌟", color: "#eab308", aura: "rank-aura-12" },
    { level: 13, name: "Saint", req: 140, badge: "🕊️", color: "#f43f5e", aura: "rank-aura-13" },
    { level: 14, name: "Paramita", req: 180, badge: "📿", color: "#a855f7", aura: "rank-aura-14" },
    { level: 15, name: "Chaos Ancient God", req: 230, badge: "🌌", color: "#c084fc", aura: "rank-aura-15" },
    { level: 16, name: "Immortal", req: 300, badge: "⚔️", color: "#fb7185", aura: "rank-aura-16" },
    { level: 17, name: "Origin", req: 400, badge: "🌀", color: "#00d2ff", aura: "rank-aura-17" },
    { level: 18, name: "Source", req: 520, badge: "💥", color: "#ff4b2b", aura: "rank-aura-18" },
    { level: 19, name: "Ultimate Lord", req: 680, badge: "👑", color: "#f59e0b", aura: "rank-aura-19" },
    { level: 20, name: "Absolute God", req: 850, badge: "⚡👑", color: "#ec4899", aura: "rank-aura-20" },
    { level: 21, name: "World's Master", req: 1000, badge: "🪐", color: "#8b5cf6", aura: "rank-aura-21" },
    { level: 22, name: "Primordial Overlord", req: 1250, badge: "🐉", color: "#10b981", aura: "rank-aura-22" },
    { level: 23, name: "Supreme Ancestor", req: 1550, badge: "🌌👑", color: "#d946ef", aura: "rank-aura-23" },
    { level: 24, name: "Grandmaster of Chaos", req: 2000, badge: "☸️✨", color: "#f43f5e", aura: "rank-aura-24" }
  ];

  function getCultivationRealm() {
    const chaptersRead = STATE.readingStats.chapters || 0;
    
    // GUEST: STUCK at Level 1 (Half-Step Innate Soul)!
    if (!isUserLoggedIn()) {
      return {
        rank: { name: "Half-Step Innate Soul", req: 0, badge: "🍃", color: "#94a3b8", isStuck: true },
        nextRank: CULTIVATION_REALMS[1],
        chaptersRead
      };
    }

    let rank = CULTIVATION_REALMS[0];
    let nextRank = CULTIVATION_REALMS[1];
    
    for (let i = CULTIVATION_REALMS.length - 1; i >= 0; i--) {
      if (chaptersRead >= CULTIVATION_REALMS[i].req) {
        rank = CULTIVATION_REALMS[i];
        nextRank = CULTIVATION_REALMS[i + 1] || null;
        break;
      }
    }
    return { rank, nextRank, chaptersRead };
  }

  function updateCultivationUI() {
    const { rank, nextRank, chaptersRead } = getCultivationRealm();
    const badgeEl = $('#cultivation-badge');
    const titleEl = $('#cultivation-title');
    const subEl = $('#cultivation-sub');

    if (badgeEl) badgeEl.textContent = rank.badge;
    if (titleEl) {
      titleEl.textContent = isUserLoggedIn() ? rank.name : `${rank.name} (TERKUNCI)`;
      titleEl.style.color = rank.color;
    }
    if (subEl) {
      if (!isUserLoggedIn()) {
        subEl.innerHTML = `<span style="color:#ef4444;font-weight:700">⚠️ TERKUNCI di Level 1!</span><br><a href="#" id="cult-login-link" style="color:var(--accent-light);text-decoration:underline;font-weight:700">Login gratis</a> untuk naik kultivasi!`;
        setTimeout(() => {
          $('#cult-login-link')?.addEventListener('click', e => { e.preventDefault(); openAuthModal(); });
        }, 100);
      } else if (nextRank) {
        const diff = nextRank.req - chaptersRead;
        subEl.textContent = `Baca ${diff} chapter lagi untuk naik ke ${nextRank.name}!`;
      } else {
        subEl.textContent = `Tingkat Tertinggi Dicapai! (Ranah Ke-21)`;
      }
    }

    // Update navbar login button text
    const loginBtn = $('#login-btn');
    if (loginBtn) {
      if (isUserLoggedIn()) {
        loginBtn.innerHTML = `<i class="fa-solid fa-user-check" style="color:#22c55e"></i> <span class="btn-masuk-text">${AUTH_STATE.user.username}</span>`;
      } else {
        loginBtn.innerHTML = `<i class="fa-solid fa-user"></i> <span class="btn-masuk-text">Masuk</span>`;
      }
    }
  }

  function renderAdminModList() {
    const listEl = $('#admin-chat-mod-list');
    if (!listEl) return;
    if (!FORUM_STATE.messages.length) {
      listEl.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:0.5rem;">Tidak ada pesan forum.</div>';
      return;
    }

    listEl.innerHTML = FORUM_STATE.messages.map(m => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); padding:0.4rem 0.65rem; border-radius:var(--radius-md); border:1px solid var(--border);">
        <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:82%;">
          <strong style="color:${m.isAdmin ? '#ef4444' : 'var(--accent-light)'}">${m.author}:</strong>
          <span style="color:var(--text-main); margin-left:0.3rem;">${m.text}</span>
        </div>
        <button class="admin-del-msg-btn" data-id="${m.id}" style="background:rgba(239,68,68,0.2); color:#ef4444; border:none; padding:0.15rem 0.4rem; border-radius:4px; font-size:0.68rem; font-weight:700; cursor:pointer;">Hapus</button>
      </div>
    `).join('');

    $$('.admin-del-msg-btn', listEl).forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        FORUM_STATE.messages = FORUM_STATE.messages.filter(msg => msg.id !== id);
        localStorage.setItem('oniverse_forum_msgs', JSON.stringify(FORUM_STATE.messages));
        renderAdminModList();
        renderForumMessages();
        showToast('Pesan berhasil dihapus oleh Admin.', 'info');
      });
    });
  }

  const DEFAULT_PINNED_SLUGS = [
    '4ef0b99b-20d3-4da8-bb73-9c3768f32699', // The Count's Secret Maid (#1)
    '11ecc266-ead4-4728-b21a-5ac34afb140c', // She's Not Our Daughter! (#2)
    '56c552be-3ba1-41b8-975e-d77fd4e1bc2c'  // My Bias Gets On The Last Train (#3)
  ];
  let PINNED_SLUGS = JSON.parse(localStorage.getItem('oniverse_pinned_slugs') || 'null') || DEFAULT_PINNED_SLUGS;

  function applyPinnedOrder() {
    if (!STATE.allSeries.length) return;
    const pinnedItems = [];
    PINNED_SLUGS.forEach(slug => {
      const match = STATE.allSeries.find(s => getSlug(s) === slug || s.id === slug);
      if (match && !pinnedItems.includes(match)) pinnedItems.push(match);
    });
    const restItems = STATE.allSeries.filter(s => !pinnedItems.includes(s));
    STATE.allSeries = [...pinnedItems, ...restItems];
    STATE.filtered = [...STATE.allSeries];
  }

  function populateAdminPinSelect() {
    const sel = $('#admin-pin-select');
    if (!sel || !STATE.allSeries.length) return;
    sel.innerHTML = STATE.allSeries.map(s => `<option value="${getSlug(s)}">${s.title || s.name}</option>`).join('');
  }

  function handleAdminPinComic() {
    const sel = $('#admin-pin-select');
    const posSel = $('#admin-pin-pos');
    if (!sel || !posSel) return;
    const targetSlug = sel.value;
    const pos = parseInt(posSel.value, 10);
    
    PINNED_SLUGS = PINNED_SLUGS.filter(s => s !== targetSlug);
    PINNED_SLUGS[pos] = targetSlug;
    localStorage.setItem('oniverse_pinned_slugs', JSON.stringify(PINNED_SLUGS));
    
    applyPinnedOrder();
    renderHero();
    renderTrending();
    showToast(`📌 Komik berhasil dipin ke Posisi #${pos + 1}!`, 'success');
  }

  function handleAdminUnpinComics() {
    PINNED_SLUGS = [...DEFAULT_PINNED_SLUGS];
    localStorage.setItem('oniverse_pinned_slugs', JSON.stringify(PINNED_SLUGS));
    applyPinnedOrder();
    renderHero();
    renderTrending();
    showToast('📌 Urutan Pin berhasil di-reset ke default!', 'info');
  }

  function openAdminModal() {
    $('#admin-modal')?.classList.remove('hidden');
    renderAdminModList();
    populateAdminPinSelect();
    const onlineEl = $('#admin-online-count');
    if (onlineEl) onlineEl.textContent = rand(145, 168);
  }

  function closeAdminModal() {
    $('#admin-modal')?.classList.add('hidden');
  }

  function adminBroadcastMessage() {
    const input = $('#admin-broadcast-msg');
    if (!input || !input.value.trim()) return;
    const msgText = input.value.trim();
    
    const newMsg = {
      id: Date.now(),
      channel: 'general',
      author: 'Admin_OniVerse',
      avatar: '👑',
      text: `📢 PENGUMUMAN ADMIN: ${msgText}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAdmin: true
    };
    
    FORUM_STATE.messages.push(newMsg);
    localStorage.setItem('oniverse_forum_msgs', JSON.stringify(FORUM_STATE.messages));
    input.value = '';
    showToast('Pengumuman Admin berhasil di-broadcast ke Chat Forum!', 'success');
    renderForumMessages();
  }

  function adminClearChat() {
    FORUM_STATE.messages = [
      { id: Date.now(), channel: 'general', author: 'Admin_OniVerse', avatar: '👑', text: 'Chat Forum telah dibersihkan oleh Admin.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isAdmin: true }
    ];
    localStorage.setItem('oniverse_forum_msgs', JSON.stringify(FORUM_STATE.messages));
    renderForumMessages();
    showToast('Seluruh chat forum berhasil dibersihkan!', 'success');
  }

  // ==========================================================================
  //  DATA LOAD
  // ==========================================================================
  async function loadData() {
    let initialLoaded = false;

    // 1. Instant Paint from Preloaded Window Data (0ms)
    if (window.SERIES_DATA && Array.isArray(window.SERIES_DATA) && window.SERIES_DATA.length > 0) {
      STATE.allSeries = [...window.SERIES_DATA].sort((a, b) => parseDateScore(b) - parseDateScore(a));
      STATE.filtered = [...STATE.allSeries];
      onDataReady();
      initialLoaded = true;
    }

    // 2. Fetch full catalog instantly with 0ms delay
    try {
      const res = await fetch('data-catalog.json?v=20260804_v105');
      if (res.ok) {
        const catalog = await res.json();
        if (Array.isArray(catalog) && catalog.length > 0) {
          const existingMap = new Map(STATE.allSeries.map(s => [s.id || s.slug, s]));
          catalog.forEach(item => {
            const key = item.id || item.slug;
            if (existingMap.has(key)) {
              Object.assign(existingMap.get(key), item);
            } else {
              existingMap.set(key, item);
            }
          });
          STATE.allSeries = Array.from(existingMap.values()).sort((a, b) => parseDateScore(b) - parseDateScore(a));
          STATE.filtered = [...STATE.allSeries];
          if (!initialLoaded) {
            onDataReady();
            initialLoaded = true;
          } else {
            safeExec(applyPinnedOrder, 'ApplyPinnedOrder');
            safeExec(renderTrending, 'Trending');
            safeExec(renderUpdateList, 'UpdateList');
          }
          const totalEl = $('#footer-total');
          if (totalEl) totalEl.textContent = STATE.allSeries.length + '+';
        }
      }
    } catch (err) {
      console.warn('Catalog fetch error:', err);
    }

    if (!initialLoaded && STATE.allSeries.length === 0) {
      console.error('Initial data load failed.');
    }
  }

  function safeExec(fn, name) {
    try { fn(); } catch(err) { console.error(`Error rendering ${name}:`, err); }
  }

  function onDataReady() {
    safeExec(applyPinnedOrder, 'ApplyPinnedOrder');
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

    // Handle pending route from URL (e.g. /komik/slug/) after data loads
    if (_pendingRoute) {
      const route = _pendingRoute;
      _pendingRoute = null;
      handleRoute(route);
    }
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
    const featured = [...STATE.allSeries]
      .sort((a, b) => parseDateScore(b) - parseDateScore(a))
      .slice(0, 5);

    if (!featured.length) return;

    const dotsC = $('#slider-dots');
    dotsC.innerHTML = featured.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></span>`).join('');

    function setSlide(idx) {
      STATE.currentSlide = idx;
      const s = featured[idx];
      const bg = $('#hero-bg-0');
      bg.style.backgroundImage = `url(${getCover(s)})`;
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
  function formatTimeAgo(dStr) {
    if (!dStr) return 'Baru';
    const t = Date.parse(dStr);
    if (isNaN(t)) return dStr.slice(0, 10);
    const diffMs = Date.now() - t;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} mnt lalu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }

  function parseDateScore(s) {
    if (!s) return 0;
    const dStr = s.last_updated || s.updated || s.latest_chapter_time || s.updated_at || '';
    if (!dStr) return 0;
    const t = Date.parse(dStr);
    return isNaN(t) ? 0 : t;
  }

  function renderUpdateList() {
    const sorted = [...STATE.allSeries].sort((a, b) => {
      const ta = parseDateScore(a);
      const tb = parseDateScore(b);
      if (tb !== ta) return tb - ta;
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
      let chText = 'N/A';
      if (ch) {
        chText = `Chapter ${ch.number || ch.chapter || '?'}`;
      } else if (s.latest_chapter) {
        chText = `Chapter ${s.latest_chapter}`;
      } else if (s.total_chapters) {
        chText = `${s.total_chapters} Chapter`;
      }
      const rawTime = s.last_updated || s.updated || s.updated_at || '';
      const timeText = formatTimeAgo(rawTime);
      const isNew = i < 8;
      const typeBadge = s.type ? `<span class="update-type-tag ${s.type.toLowerCase()}">${s.type}</span>` : '';
      return `
        <div class="update-item" data-slug="${getSlug(s)}" data-idx="${i}">
          <div class="update-thumb-wrap">
            <img src="${getCover(s)}" class="update-thumb" alt="${s.title || s.name}" loading="lazy" decoding="async" onerror="this.style.background='#14122c'">
            ${typeBadge}
          </div>
          <div class="update-info">
            <div class="update-title">${s.title || s.name || 'Unknown'}</div>
            <div class="update-meta">
              <span class="update-chapter"><i class="fa-solid fa-book-open" style="color:var(--accent-light);font-size:0.75rem;margin-right:3px"></i>${chText}</span>
              <span class="update-time"><i class="fa-regular fa-clock" style="font-size:0.7rem;margin-right:2px"></i>${timeText}</span>
            </div>
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
        <li class="ranking-item" data-slug="${getSlug(s)}" data-idx="${i}">
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
  //  COMIC DETAIL COMMENTS
  // ==========================================================================
  function getComicCommentsKey(slug) {
    return `oniverse_comic_comments_${slug}`;
  }

  function getComicComments(slug) {
    const key = getComicCommentsKey(slug);
    let comments = [];
    try { comments = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
    if (!comments.length) {
      comments = [
        {
          id: 101,
          author: 'Kultivator_Sejati',
          userRank: { badge: '🔥', name: 'Pendekar Utama', color: '#f59e0b' },
          text: 'Alur ceritanya seru banget! Update chapter terbarunya selalu ditunggu-tunggu.',
          time: '2 jam lalu',
          likes: 15
        },
        {
          id: 102,
          author: 'Pembaca_Setia',
          userRank: { badge: '⚡', name: 'Kultivator Ranah Atas', color: '#8b5cf6' },
          text: 'Rekomendasi banget buat yang suka genre ini. Gambar jernih & terjemahan rapi!',
          time: '5 jam lalu',
          likes: 9
        }
      ];
      localStorage.setItem(key, JSON.stringify(comments));
    }
    return comments;
  }

  function renderComicComments(slug) {
    const list = $('#comic-comment-list');
    const countEl = $('#comic-comment-count');
    if (!list) return;

    const comments = getComicComments(slug);
    if (countEl) countEl.textContent = comments.length;

    list.innerHTML = comments.map(c => `
      <div class="comic-comment-card" style="background:var(--bg-main); border:1px solid var(--border); border-radius:var(--radius-md); padding:0.85rem 1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <div style="width:28px; height:28px; border-radius:50%; background:linear-gradient(135deg, #7c3aed, #ec4899); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:0.75rem;">
              ${(c.author || 'A')[0].toUpperCase()}
            </div>
            <strong style="font-size:0.88rem; color:var(--text-main);">${c.author}</strong>
            <span style="font-size:0.68rem; background:${c.userRank?.color || '#7c3aed'}22; color:${c.userRank?.color || '#a78bfa'}; border:1px solid ${c.userRank?.color || '#7c3aed'}44; padding:0.1rem 0.45rem; border-radius:var(--radius-full); font-weight:600;">
              ${c.userRank?.badge || '🔥'} ${c.userRank?.name || 'Kultivator'}
            </span>
          </div>
          <span style="font-size:0.72rem; color:var(--text-muted);">${c.time}</span>
        </div>
        <p style="font-size:0.85rem; color:var(--text-muted); margin:0 0 0.5rem 0; line-height:1.4;">${c.text}</p>
        <div style="display:flex; gap:1rem; align-items:center;">
          <button class="btn-like-comment" data-comment-id="${c.id}" style="background:none; border:none; color:var(--text-dim); font-size:0.78rem; cursor:pointer; display:flex; align-items:center; gap:0.3rem;">
            <i class="fa-solid fa-thumbs-up"></i> <span>${c.likes || 0}</span>
          </button>
        </div>
      </div>
    `).join('');
  }

  function openDetailBySlug(slug) {
    if (!slug) return;
    const cleanSlug = String(slug).trim();
    const series = STATE.allSeries.find(x => getSlug(x) === cleanSlug || String(x.id) === cleanSlug || x.slug === cleanSlug);
    if (series) {
      openDetail(series);
    } else {
      fetch(`data/detail/${cleanSlug}.json?v=20260804_v105`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) openDetail(data);
          else showToast('Gagal memuat detail komik', 'warning');
        })
        .catch(() => showToast('Gagal memuat detail komik', 'warning'));
    }
  }

  // Global Event Delegation for all comic cards across Mobile & Desktop
  document.addEventListener('click', e => {
    const card = e.target.closest('.update-item, .trending-card, .series-card, .continue-card, .comic-card, [data-slug]');
    if (card && card.dataset && card.dataset.slug) {
      if (e.target.closest('button, a, .btn-baca, .social-link, .btn-bookmark-hero')) return;
      e.preventDefault();
      openDetailBySlug(card.dataset.slug);
    }
  });

  function openDetail(s, fromRouter) {
    STATE.currentDetail = s;
    if (!fromRouter) navigateToComic(s, false);
    const modal = $('#detail-modal');
    const body = $('#modal-body');
    const genres = getGenres(s);
    const isBookmarked = STATE.bookmarks.includes(getSlug(s));
    
    // Dynamic Fallback Generator for comics missing chapters or synopsis
    if (!s.chapters || s.chapters.length === 0) {
      const rawCh = String(s.latest_chapter || s.total_chapters || '15');
      const numMatch = rawCh.match(/\d+/);
      let totalNum = numMatch ? parseInt(numMatch[0], 10) : 15;
      if (isNaN(totalNum) || totalNum <= 0) totalNum = 15;

      const slug = getSlug(s);
      const isKC = s.source === 'komikcast' || String(s.id).startsWith('kc_') || slug.startsWith('kc-');
      const kcSlug = slug.replace(/^kc-/, '');
      const genChaps = [];
      for (let i = totalNum; i >= 1; i--) {
        genChaps.push({
          number: String(i),
          chapter: String(i),
          slug: isKC ? `kc_ch_${kcSlug}_${i}` : `ch_${i}`,
          kc_index: isKC ? i : null,
          kc_series_slug: isKC ? kcSlug : null,
          date: (s.last_updated || '').slice(0, 10)
        });
      }
      s.chapters = genChaps;
    }

    if (!s.synopsis || s.synopsis === 'Belum ada deskripsi.') {
      s.synopsis = `Baca komik ${s.title || s.name || 'ini'} bahasa Indonesia gratis di OniVerse.SBS. Komik ${s.type || 'Manhwa'} bergenre ${genres.slice(0, 3).join(', ') || 'Action'} dengan kualitas gambar HD terbaik dan update chapter terbaru.`;
    }

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
          <div class="detail-action-row" style="flex-wrap:wrap;">
            <button class="btn-baca" id="detail-read-first"><i class="fa-solid fa-book-open"></i> Baca Chapter 1</button>
            <button class="btn-bookmark-hero ${isBookmarked ? 'bookmarked' : ''}" id="detail-bookmark-btn">
              <i class="fa-${isBookmarked ? 'solid' : 'regular'} fa-bookmark"></i> ${isBookmarked ? 'Tersimpan' : 'Bookmark'}
            </button>
            <button class="btn-bookmark-hero" id="detail-pin-btn" style="background:rgba(245,158,11,0.18); border-color:rgba(245,158,11,0.4); color:#f59e0b;">
              <i class="fa-solid fa-thumbtack"></i> Pin Top #1
            </button>
            <button class="btn-bookmark-hero" id="detail-share-btn" style="background:linear-gradient(135deg, #25D366, #128C7E);color:#fff;border:none;">
              <i class="fa-brands fa-whatsapp"></i> Bagikan
            </button>
          </div>
        </div>
      </div>
      <!-- Modal Sponsored Ad Slot #3 -->
      <div style="margin: 0.85rem 0; text-align: center; min-height: 80px;" id="modal-ad-slot"></div>
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
      </div>
      
      <!-- ===== KOMIK DETAIL COMMENT SECTION ===== -->
      <div class="comic-comment-section" style="margin-top: 1.5rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.25rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h3 style="margin:0; font-family:'Outfit'; font-weight:700; font-size:1.05rem; display:flex; align-items:center; gap:0.5rem; color:var(--text-main);">
            <i class="fa-solid fa-comments" style="color:var(--accent-light)"></i> Kolom Komentar & Diskusi
            <span id="comic-comment-count" style="font-size:0.75rem; background:rgba(124,58,237,0.2); color:var(--accent-light); padding:0.15rem 0.55rem; border-radius:var(--radius-full);">0</span>
          </h3>
        </div>

        <div style="display:flex; gap:0.65rem; margin-bottom:1.25rem;">
          <input type="text" id="comic-comment-input" placeholder="Tulis komentar atau kesanmu tentang komik ini..." style="flex:1; background:var(--bg-main); border:1px solid var(--border); color:var(--text-main); padding:0.65rem 0.85rem; border-radius:var(--radius-md); font-size:0.85rem; font-family:inherit;">
          <button id="comic-comment-send" class="btn-baca" style="padding:0.65rem 1.2rem; font-size:0.85rem;"><i class="fa-solid fa-paper-plane"></i> Kirim</button>
        </div>

        <div id="comic-comment-list" style="display:flex; flex-direction:column; gap:0.5rem;"></div>
      </div>`;

    // Events
    $('#detail-read-first').onclick = () => {
      if (sortedChapters.length) openReader(s, sortedChapters, sortedChapters.length - 1);
    };

    $('#detail-bookmark-btn').onclick = () => {
      toggleBookmark(s);
      openDetail(s);
    };

    $('#detail-pin-btn').onclick = () => {
      const slug = getSlug(s);
      PINNED_SLUGS = PINNED_SLUGS.filter(p => p !== slug);
      PINNED_SLUGS[0] = slug;
      localStorage.setItem('oniverse_pinned_slugs', JSON.stringify(PINNED_SLUGS));
      applyPinnedOrder();
      renderHero();
      renderTrending();
      showToast(`📌 Komik "${s.title || 'ini'}" berhasil dipin ke Banner Top #1 HP & Web!`, 'success');
    };

    $('#detail-share-btn').onclick = () => {
      const comicTitle = s.title || s.name || 'Komik';
      const shareUrl = `https://oniverse.sbs${getComicURL(s)}`;
      const shareText = `Yuk baca komik "${comicTitle}" gratis di OniVerse! 🔥\n${shareUrl}`;
      
      if (navigator.share) {
        navigator.share({ title: comicTitle, text: shareText, url: shareUrl }).catch(() => {});
      } else {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
      }
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

    // Initialize Comic Comment Section
    const comicSlug = getSlug(s);
    renderComicComments(comicSlug);

    const comicCommentInput = $('#comic-comment-input');
    const comicCommentSendBtn = $('#comic-comment-send');

    const sendComicComment = () => {
      if (!comicCommentInput || !comicCommentInput.value.trim()) return;
      const text = comicCommentInput.value.trim();
      const key = getComicCommentsKey(comicSlug);
      let comments = [];
      try { comments = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
      const { rank } = getCultivationRealm();
      const authorName = FORUM_STATE.userName || 'Kultivator_Anonim';

      comments.unshift({
        id: Date.now(),
        author: authorName,
        userRank: { badge: rank.badge, name: rank.name, color: rank.color },
        text: text,
        time: 'Baru saja',
        likes: 0
      });

      localStorage.setItem(key, JSON.stringify(comments));
      comicCommentInput.value = '';
      renderComicComments(comicSlug);
      showToast('Komentar berhasil dikirim!', 'success');
    };

    if (comicCommentSendBtn) comicCommentSendBtn.onclick = sendComicComment;
    if (comicCommentInput) comicCommentInput.onkeydown = e => { if (e.key === 'Enter') sendComicComment(); };

    const commentListEl = $('#comic-comment-list');
    if (commentListEl) {
      commentListEl.onclick = e => {
        const btn = e.target.closest('.btn-like-comment');
        if (btn) {
          const commentId = +btn.dataset.commentId;
          const key = getComicCommentsKey(comicSlug);
          let comments = [];
          try { comments = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
          const target = comments.find(c => c.id === commentId);
          if (target) {
            target.likes = (target.likes || 0) + 1;
            localStorage.setItem(key, JSON.stringify(comments));
            renderComicComments(comicSlug);
            showToast('Suka komentar!', 'info');
          }
        }
      };
    }
    // 1. Fetch detailed synopsis & chapter list from pre-generated static detail files
    const comicId = String(s.id || '');

    function applyDetailData(detailData) {
      if (!detailData) return;
      let updated = false;
      if (detailData.synopsis && detailData.synopsis !== s.synopsis && detailData.synopsis !== 'Belum ada deskripsi.') {
        s.synopsis = detailData.synopsis;
        updated = true;
      }
      if (detailData.alternative_title) s.alternative_title = detailData.alternative_title;
      if (detailData.author) s.author = detailData.author;
      if (detailData.artist) s.artist = detailData.artist;
      if (Array.isArray(detailData.chapters) && detailData.chapters.length > 0) {
        s.chapters = detailData.chapters;
        updated = true;
      }
      if (updated && STATE.currentDetail && getSlug(STATE.currentDetail) === comicSlug) {
        openDetail(s, true);
      }
    }

    if (comicSlug) {
      const cacheBuster = Date.now();
      fetch(`data/detail/${comicSlug}.json?v=${cacheBuster}`)
        .then(r => r.ok ? r.json() : (comicId && comicId !== comicSlug ? fetch(`data/detail/${comicId}.json?v=${cacheBuster}`).then(r2 => r2.ok ? r2.json() : null) : null))
        .then(applyDetailData)
        .catch(() => {});
    }

    // 2. Fetch full chapters from API only if chapters count is less than target
    if (s.id && (!s.chapters || s.chapters.length < (s.total_chapters || 15))) {
      if (s.source === 'komikcast' || s.kc_slug || String(s.id).startsWith('kc_')) {
        const kcSeries = s.kc_slug || String(s.id).replace('kc_', '');
        fetch(`https://be.komikcast.cc/series/${kcSeries}/chapters`)
          .then(r => r.json())
          .then(d => {
            const items = d.data || [];
            if (Array.isArray(items) && items.length > 0) {
              const mapped = items.map(ch => {
                const cd = ch.data || {};
                const idx = cd.index || ch.id;
                return {
                  number: String(idx),
                  chapter: String(idx),
                  slug: `kc_ch_${kcSeries}_${idx}`,
                  kc_index: idx,
                  kc_series_slug: kcSeries,
                  date: (ch.createdAt || '').slice(0, 10)
                };
              });
              if (mapped.length > 0) {
                s.chapters = mapped;
                if (STATE.currentDetail && getSlug(STATE.currentDetail) === comicSlug) openDetail(s, true);
              }
            }
          }).catch(e => console.warn('KC Chapter API error:', e));
      } else {
        fetch(`https://api.shngm.io/v1/chapter/${s.id}/list?page=1&page_size=500&sort_by=chapter_number&sort_order=desc`)
          .then(r => r.json())
          .then(d => {
            if (d && d.retcode === 0 && Array.isArray(d.data) && d.data.length > 0) {
              const mapped = d.data.map(c => ({
                number: String(c.chapter_number || ''),
                chapter: String(c.chapter_number || ''),
                slug: c.chapter_id || '',
                date: (c.release_date || c.created_at || '').slice(0, 10)
              }));
              if (mapped.length > 0) {
                s.chapters = mapped;
                if (STATE.currentDetail && getSlug(STATE.currentDetail) === comicSlug) openDetail(s, true);
              }
            }
          }).catch(e => console.warn('Shinigami Chapter API error:', e));
      }
    }
  }

  function closeDetail(fromRouter) {
    $('#detail-modal').classList.add('hidden');
    document.body.style.overflow = '';
    STATE.currentDetail = null;
    if (!fromRouter) navigateToHome(false);
  }

  function getChapterCommentsKey(seriesSlug, chNum) {
    return `oniverse_ch_comments_${seriesSlug}_ch${chNum}`;
  }

  function renderChapterComments(seriesSlug, chNum) {
    const listEl = $('#ch-comment-list');
    const countEl = $('#ch-comment-count');
    if (!listEl) return;

    const key = getChapterCommentsKey(seriesSlug, chNum);
    const comments = JSON.parse(localStorage.getItem(key) || '[]');

    if (countEl) countEl.textContent = comments.length;

    if (!comments.length) {
      listEl.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem; text-align:center; padding:1rem;">Belum ada komentar di chapter ini. Jadilah yang pertama berkomentar! 💬</div>';
      return;
    }

    listEl.innerHTML = comments.map((c) => {
      const rankInfo = c.userRank || { badge: '🍃', name: 'Half-Step Innate Soul', color: '#94a3b8' };
      const auraClass = getRankAuraClass(rankInfo.name, c.isAdmin);
      return `
        <div style="display:flex; gap:0.75rem; background:var(--bg-main); padding:0.75rem; border-radius:var(--radius-md); border:1px solid var(--border);">
          <div class="chat-avatar ${auraClass}" style="width:36px; height:36px; font-size:0.85rem; flex-shrink:0;">${rankInfo.badge || c.author[0]}</div>
          <div style="flex:1; display:flex; flex-direction:column; gap:0.25rem;">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
                <strong style="font-size:0.82rem; color:${c.isAdmin ? '#ef4444' : 'var(--text-main)'};">${c.author}</strong>
                <span class="chat-rank-tag" style="background:${rankInfo.color}22; color:${rankInfo.color}; border:1px solid ${rankInfo.color}44; font-size:0.65rem; padding:0.08rem 0.4rem; border-radius:10px; font-weight:700;">${rankInfo.badge} ${rankInfo.name}</span>
              </div>
              <span style="font-size:0.7rem; color:var(--text-muted);">${c.time}</span>
            </div>
            <p style="margin:0; font-size:0.85rem; color:var(--text-muted); line-height:1.4;">${c.text}</p>
          </div>
        </div>`;
    }).join('');
  }

  function generateRealMangaPageSvg(title, chNum, pageNum, coverArt) {
    const safeTitle = (title || 'Komik').replace(/["'&<>]/g, '');
    const coverSvgTag = coverArt ? `<image href="${coverArt}" x="42" y="42" width="716" height="346" preserveAspectRatio="xMidYMid slice"/>` : '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200" style="background:#ffffff">
      <defs>
        <pattern id="screentone-${pageNum}" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="6" r="2" fill="#1e293b" opacity="0.2"/>
        </pattern>
        <radialGradient id="action-radial-${pageNum}" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="70%" stop-color="#000000" stop-opacity="0.1"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.5"/>
        </radialGradient>
      </defs>
      
      <rect width="800" height="1200" fill="#f8fafc"/>
      <rect width="800" height="1200" fill="url(#screentone-${pageNum})"/>
      <rect x="24" y="24" width="752" height="1152" fill="none" stroke="#0f172a" stroke-width="6"/>

      <!-- TOP PANEL: Dynamic Action Scene -->
      <rect x="40" y="40" width="720" height="350" fill="#ffffff" stroke="#0f172a" stroke-width="4"/>
      <rect x="40" y="40" width="720" height="350" fill="url(#action-radial-${pageNum})"/>
      ${coverSvgTag}
      
      <!-- Speed Lines Top Panel -->
      <path d="M 400 215 L 40 40 M 400 215 L 120 40 M 400 215 L 200 40 M 400 215 L 300 40 M 400 215 L 400 40 M 400 215 L 500 40 M 400 215 L 600 40 M 400 215 L 700 40 M 400 215 L 760 40 M 400 215 L 760 120 M 400 215 L 760 200 M 400 215 L 760 280 M 400 215 L 760 360 M 400 215 L 680 390 M 400 215 L 580 390 M 400 215 L 480 390 M 400 215 L 380 390 M 400 215 L 280 390 M 400 215 L 180 390 M 400 215 L 80 390 M 400 215 L 40 320 M 400 215 L 40 220 M 400 215 L 40 120" stroke="#0f172a" stroke-width="1.5" opacity="0.25"/>

      <!-- Action SFX Text -->
      <text x="140" y="140" font-family="sans-serif" font-size="56" font-weight="900" fill="#e11d48" transform="rotate(-10 140 140)">ドドド</text>
      <text x="620" y="150" font-family="sans-serif" font-size="48" font-weight="900" fill="#2563eb" transform="rotate(12 620 150)">ズバッ</text>

      <!-- MIDDLE PANEL LEFT: Dialogue Scene -->
      <rect x="40" y="410" width="345" height="380" fill="#ffffff" stroke="#0f172a" stroke-width="4"/>
      <rect x="40" y="410" width="345" height="380" fill="url(#screentone-${pageNum})"/>
      <path d="M 80 790 Q 120 580 200 560 Q 280 580 320 790 Z" fill="#1e293b" opacity="0.85"/>
      <ellipse cx="210" cy="510" rx="110" ry="40" fill="#ffffff" stroke="#0f172a" stroke-width="3"/>
      <polygon points="180,548 150,575 195,550" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
      <text x="210" y="505" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0f172a" text-anchor="middle">CHAPTER ${chNum} UNLOCKED</text>
      <text x="210" y="528" font-family="sans-serif" font-size="15" font-weight="900" fill="#2563eb" text-anchor="middle">HALAMAN ${pageNum} / 10</text>

      <!-- MIDDLE PANEL RIGHT: Title & Manga Info Badge -->
      <rect x="415" y="410" width="345" height="380" fill="#0f172a" stroke="#0f172a" stroke-width="4"/>
      <text x="587" y="520" font-family="sans-serif" font-size="28" font-weight="900" fill="#fbbf24" text-anchor="middle">ONIVERSE</text>
      <text x="587" y="555" font-family="sans-serif" font-size="18" font-weight="900" fill="#ffffff" text-anchor="middle">MANGA READER</text>
      <line x1="455" y1="585" x2="720" y2="585" stroke="#fbbf24" stroke-width="3"/>
      <text x="587" y="625" font-family="sans-serif" font-size="18" font-weight="bold" fill="#38bdf8" text-anchor="middle">${safeTitle.toUpperCase().slice(0, 22)}</text>
      <text x="587" y="660" font-family="sans-serif" font-size="16" fill="#94a3b8" text-anchor="middle">CHAPTER ${chNum} · PAGE ${pageNum}</text>

      <!-- BOTTOM PANEL: Wide Climax Panel -->
      <rect x="40" y="810" width="720" height="350" fill="#ffffff" stroke="#0f172a" stroke-width="4"/>
      <path d="M 40 850 L 760 850 M 40 890 L 760 890 M 40 930 L 760 930 M 40 970 L 760 970 M 40 1010 L 760 1010 M 40 1050 L 760 1050 M 40 1090 L 760 1090 M 40 1130 L 760 1130" stroke="#0f172a" stroke-width="1" stroke-dasharray="4,8" opacity="0.2"/>

      <text x="400" y="980" font-family="sans-serif" font-size="64" font-weight="900" fill="#e11d48" text-anchor="middle">ゴゴゴゴ</text>
      <text x="400" y="1040" font-family="sans-serif" font-size="22" font-weight="900" fill="#0f172a" text-anchor="middle">— SELAMAT MEMBACA —</text>
      <text x="400" y="1075" font-family="sans-serif" font-size="15" font-weight="bold" fill="#64748b" text-anchor="middle">OniVerse.SBS Manga &amp; Manhwa Sub Indo</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function generateMangaPanelSvg(title, chNum, pageNum) {
    return generateRealMangaPageSvg(title, chNum, pageNum, null);
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
    
    // Helper for ultra-fast 1200ms timeout fetch (no long hangs)
    async function fetchWithTimeout(url, ms = 1200) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ms);
      try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        return res;
      } catch (e) {
        clearTimeout(timer);
        return null;
      }
    }

    // Fetch chapter images with robust multi-proxy fallback
    const isKC = series.source === 'komikcast' || series.kc_slug || ch.kc_series_slug || (series.id && String(series.id).startsWith('kc_'));
    let images = [];

    // Instant check & detail JSON fetch to ensure latest real scraped WebP image arrays
    if (!Array.isArray(ch.images) || ch.images.length === 0) {
      try {
        const detailRes = await fetchWithTimeout(`data/detail/${slug}.json?v=${Date.now()}`, 1500);
        if (detailRes && detailRes.ok) {
          const detailData = await detailRes.json();
          const targetCh = (detailData.chapters || []).find(c => (c.number || c.chapter) == (ch.number || ch.chapter) || c.slug === ch.slug);
          if (targetCh && Array.isArray(targetCh.images) && targetCh.images.length > 0) {
            ch.images = targetCh.images;
          }
        }
      } catch (e) {}
    }

    try {
      if (Array.isArray(ch.images) && ch.images.length > 0) {
        images = ch.images.filter(img => typeof img === 'string' && !img.includes('manga_kc_') && !img.includes('chapter_kc_'));
      }
      
      if (!images.length && isKC) {
        const kcSeries = series.kc_slug || ch.kc_series_slug || (series.id ? String(series.id).replace('kc_', '') : '');
        const kcIndex = ch.kc_index || ch.number || ch.chapter;
        const targetUrl = `https://be.komikcast.cc/series/${kcSeries}/chapters/${kcIndex}`;
        const urls = [
          targetUrl,
          `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
          `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`
        ];
        for (const u of urls) {
          const res = await fetchWithTimeout(u, 1800);
          if (res && res.ok) {
            try {
              const jsonRes = await res.json();
              const chData = jsonRes.data?.data || jsonRes.data || {};
              if (Array.isArray(chData.images) && chData.images.length > 0) {
                images = chData.images;
                break;
              }
            } catch (e) {}
          }
        }
      } else if (!images.length) {
        const chSlug = ch.slug || ch.chapter_slug || ch.chapter_id || ch.id || '';
        if (chSlug && chSlug.length > 10 && !chSlug.startsWith('ch_')) {
          const targetUrl = `https://api.shngm.io/v1/chapter/detail/${chSlug}`;
          const urls = [
            targetUrl,
            `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
          ];
          for (const u of urls) {
            const res = await fetchWithTimeout(u, 1200);
            if (res && res.ok) {
              const jsonRes = await res.json();
              const d = jsonRes.data || {};
              const baseUrl = d.base_url || d.base_url_low || 'https://assets.shngm.id';
              const chData = d.chapter || {};
              const chPath = chData.path || '';
              const filenames = chData.data || chData.images || [];

              if (Array.isArray(filenames) && filenames.length > 0) {
                images = filenames.map(fn => typeof fn === 'string' ? (fn.startsWith('http') ? fn : baseUrl + chPath + fn) : fn.url || fn.src || '');
                break;
              } else if (Array.isArray(d.images) && d.images.length > 0) {
                images = d.images.map(i => typeof i === 'string' ? (i.startsWith('http') ? i : baseUrl + i) : i.url || i.src);
                break;
              }
            }
          }
        }
      }

      if (Array.isArray(images) && images.length > 0) {
        images = images.filter(img => typeof img === 'string' && !img.includes('picsum.photos') && !img.includes('unsplash'));
      }

      const coverArt = getCover(series) || '';
      const comicTitle = series.title || series.name || 'Komik';
      const chNum = ch.number || ch.chapter || (idx + 1);

      if (!images.length) {
        images = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => generateRealMangaPageSvg(comicTitle, chNum, p, ''));
      }

      content.innerHTML = `
        <div class="reader-images-wrap">
          ${images.map((img, i) => `<img src="${img}" class="reader-page-img" alt="${comicTitle} - Halaman ${i + 1}" loading="lazy" decoding="async" onerror="if(!this.dataset.tried){this.dataset.tried='1';this.src='${generateRealMangaPageSvg(comicTitle, chNum, i + 1, '')}';}else{this.style.display='none';}">`).join('')}
        </div>
        <div class="reader-footer-nav">
          <p style="color:var(--text-muted);font-size:0.85rem">— Akhir Chapter ${ch.number || ch.chapter || idx + 1} —</p>
          <!-- Reader End Sponsored Ad (Non-Intrusive) -->
          <div style="margin: 1rem 0; min-height: 90px; text-align: center;" id="reader-ad-slot"></div>

          <!-- Chapter Comment Section -->
          <div class="chapter-comment-box" style="margin: 1.5rem auto; max-width: 720px; text-align: left; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.25rem;">
            <h4 style="margin:0 0 1rem 0; font-family:'Outfit'; font-weight:700; font-size:1.05rem; display:flex; align-items:center; gap:0.5rem; color:var(--text-main);">
              <i class="fa-solid fa-comments" style="color:var(--accent-light)"></i> Diskusi Chapter ${ch.number || ch.chapter || idx + 1} <span id="ch-comment-count" style="font-size:0.75rem; background:rgba(124,58,237,0.2); color:var(--accent-light); padding:0.15rem 0.5rem; border-radius:var(--radius-full);">0</span>
            </h4>
            
            <div style="display:flex; gap:0.65rem; margin-bottom:1.25rem;">
              <input type="text" id="ch-comment-input" placeholder="Tulis pendapatmu tentang chapter ini..." style="flex:1; background:var(--bg-main); border:1px solid var(--border); color:var(--text-main); padding:0.65rem 0.85rem; border-radius:var(--radius-md); font-size:0.85rem; font-family:inherit;">
              <button id="ch-comment-send" class="btn-baca" style="padding:0.65rem 1.2rem; font-size:0.85rem;"><i class="fa-solid fa-paper-plane"></i> Kirim</button>
            </div>

            <div id="ch-comment-list" style="display:flex; flex-direction:column; gap:0.85rem;"></div>
          </div>

          <div class="reader-nav-row">
            <button class="btn-baca" id="reader-footer-prev" ${idx <= 0 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i> Prev</button>
            <button class="btn-baca" id="reader-footer-next" ${idx >= chapters.length - 1 ? 'disabled' : ''}>Next <i class="fa-solid fa-chevron-right"></i></button>
          </div>
        </div>`;

      const seriesSlug = getSlug(series);
      renderChapterComments(seriesSlug, chNum);

      const commentInput = $('#ch-comment-input');
      const commentSendBtn = $('#ch-comment-send');

      const sendComment = () => {
        if (!commentInput || !commentInput.value.trim()) return;
        const text = commentInput.value.trim();
        const key = getChapterCommentsKey(seriesSlug, chNum);
        const comments = JSON.parse(localStorage.getItem(key) || '[]');
        const { rank } = getCultivationRealm();
        const authorName = FORUM_STATE.userName || 'Kultivator_Anonim';

        comments.unshift({
          id: Date.now(),
          author: authorName,
          userRank: { badge: rank.badge, name: rank.name, color: rank.color },
          text: text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        localStorage.setItem(key, JSON.stringify(comments));
        commentInput.value = '';
        renderChapterComments(seriesSlug, chNum);
        showToast('Komentar chapter berhasil dikirim!', 'success');
      };

      if (commentSendBtn) commentSendBtn.onclick = sendComment;
      if (commentInput) commentInput.onkeydown = e => { if (e.key === 'Enter') sendComment(); };

      const fp = $('#reader-footer-prev');
      const fn = $('#reader-footer-next');
      if (fp) fp.onclick = () => openReader(series, chapters, idx - 1);
      if (fn) fn.onclick = () => openReader(series, chapters, idx + 1);

    } catch (err) {
      console.warn('Reader error fallback triggered:', err);
      const titleSlug = (series.title || series.name || 'comic').toLowerCase().replace(/[^a-z0-9]/g, '');
      const chNum = ch ? (ch.number || ch.chapter || (idx + 1)) : (idx + 1);
      const seed = `${titleSlug}_ch_${chNum}`;
      const fallbackImgs = [
        `https://picsum.photos/seed/${seed}_1/800/1200`,
        `https://picsum.photos/seed/${seed}_2/800/1200`,
        `https://picsum.photos/seed/${seed}_3/800/1200`,
        `https://picsum.photos/seed/${seed}_4/800/1200`,
        `https://picsum.photos/seed/${seed}_5/800/1200`
      ];
      content.innerHTML = `
        <div class="reader-images-wrap">
          ${fallbackImgs.map((img, i) => `<img src="${img}" class="reader-page-img" alt="Halaman ${i + 1}">`).join('')}
        </div>
        <div class="reader-footer-nav">
          <p style="color:var(--text-muted);font-size:0.85rem">— Akhir Chapter ${chNum} —</p>
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
  //  CULTIVATION MINI-GAME (MONSTER BATTLE & SPIN WHEEL)
  // ==========================================================================
  const GAME_STATE = {
    monsterHp: 100,
    maxHp: 100,
    timer: 10,
    timerInterval: null,
    isPlaying: false,
    monsterName: '🐉 Naga Api Kegelapan (LV. 99)',
    monsterAvatar: '🐉'
  };

  function openMinigameModal() {
    $('#minigame-modal')?.classList.remove('hidden');
    resetMonsterBattle();
  }

  function closeMinigameModal() {
    $('#minigame-modal')?.classList.add('hidden');
    clearInterval(GAME_STATE.timerInterval);
  }

  function resetMonsterBattle() {
    clearInterval(GAME_STATE.timerInterval);
    const monsters = [
      { name: '🐉 Naga Api Kegelapan (LV. 99)', hp: 120, avatar: '🐉' },
      { name: '🐺 Serigala Es Kuno (LV. 45)', hp: 80, avatar: '🐺' },
      { name: '👹 Iblis Petir Merah (LV. 77)', hp: 100, avatar: '👹' },
      { name: '🐍 Ular Sanca Raksasa (LV. 60)', hp: 90, avatar: '🐍' }
    ];
    const m = monsters[rand(0, monsters.length - 1)];
    GAME_STATE.monsterHp = m.hp;
    GAME_STATE.maxHp = m.hp;
    GAME_STATE.timer = 10;
    GAME_STATE.isPlaying = false;
    GAME_STATE.monsterName = m.name;
    GAME_STATE.monsterAvatar = m.avatar;

    const nameEl = $('#monster-name');
    const avatarEl = $('#monster-avatar');
    if (nameEl) nameEl.textContent = m.name;
    if (avatarEl) avatarEl.textContent = m.avatar;
    updateMonsterUI();
  }

  function updateMonsterUI() {
    const pct = Math.max(0, (GAME_STATE.monsterHp / GAME_STATE.maxHp) * 100);
    const bar = $('#monster-hp-bar');
    if (bar) bar.style.width = `${pct}%`;
    const textEl = $('#monster-hp-text');
    if (textEl) textEl.textContent = `${Math.max(0, GAME_STATE.monsterHp)} / ${GAME_STATE.maxHp}`;
    const timerEl = $('#monster-timer-text');
    if (timerEl) timerEl.textContent = `${GAME_STATE.timer}s`;
  }

  function handleAttackMonster() {
    if (GAME_STATE.monsterHp <= 0) return;

    if (!GAME_STATE.isPlaying) {
      GAME_STATE.isPlaying = true;
      GAME_STATE.timerInterval = setInterval(() => {
        GAME_STATE.timer--;
        updateMonsterUI();
        if (GAME_STATE.timer <= 0) {
          clearInterval(GAME_STATE.timerInterval);
          GAME_STATE.isPlaying = false;
          showToast('⚠️ Waktu habis! Monster Spirit berhasil kabur!', 'info');
          resetMonsterBattle();
        }
      }, 1000);
    }

    const dmg = rand(8, 16);
    GAME_STATE.monsterHp -= dmg;

    const floatText = $('#damage-floating-text');
    if (floatText) {
      floatText.textContent = `💥 CRITICAL DAMAGE! -${dmg} HP`;
      floatText.style.opacity = '1';
      setTimeout(() => { floatText.style.opacity = '0'; }, 300);
    }

    const monsterAvatar = $('#monster-avatar');
    if (monsterAvatar) {
      monsterAvatar.style.transform = 'scale(0.85) rotate(-10deg)';
      setTimeout(() => { monsterAvatar.style.transform = 'scale(1)'; }, 100);
    }

    updateMonsterUI();

    if (GAME_STATE.monsterHp <= 0) {
      clearInterval(GAME_STATE.timerInterval);
      GAME_STATE.isPlaying = false;
      STATE.readingStats.chapters = (STATE.readingStats.chapters || 0) + 5;
      saveReadingStats();
      updateCultivationUI();
      showToast(`🏆 KEMENANGAN TELAH DICAPAI! ${GAME_STATE.monsterName} dikalahkan! +5 Chapter EXP Bonus! 🐉`, 'success');
      setTimeout(resetMonsterBattle, 2000);
    }
  }

  function handleSpinWheel() {
    const wheelCircle = $('#spin-wheel-circle');
    const resultText = $('#spin-result-text');
    const iconEl = $('#spin-wheel-icon');
    if (!wheelCircle) return;

    const prizes = [
      { text: '✨ Bonus +3 Chapter EXP Kultivasi!', bonus: 3, icon: '✨' },
      { text: '🔮 Bonus +5 Chapter EXP Kultivasi!', bonus: 5, icon: '🔮' },
      { text: '🪐 Bonus +10 Chapter EXP Kosmik!', bonus: 10, icon: '🪐' },
      { text: '🐉 HARTA KARUN NAGA! +15 EXP Kultivasi!', bonus: 15, icon: '🐉' },
      { text: '🍃 Rezeki Pemula +2 Chapter EXP!', bonus: 2, icon: '🍃' }
    ];

    const chosen = prizes[rand(0, prizes.length - 1)];
    const deg = rand(1080, 2160);

    wheelCircle.style.transform = `rotate(${deg}deg)`;
    if (resultText) resultText.textContent = 'Memutar Roda Gacha Kosmik... 🎡';

    setTimeout(() => {
      if (iconEl) iconEl.textContent = chosen.icon;
      if (resultText) resultText.textContent = chosen.text;
      STATE.readingStats.chapters = (STATE.readingStats.chapters || 0) + chosen.bonus;
      saveReadingStats();
      updateCultivationUI();
      showToast(chosen.text, 'success');
    }, 3000);
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

    // Forum Diskusi Bindings
    $('#nav-forum')?.addEventListener('click', e => { e.preventDefault(); openForumModal(); });
    $('#sb-forum')?.addEventListener('click', e => { e.preventDefault(); openForumModal(); closeMobileSidebar(); });

    // Auth Modal Bindings
    $('#login-btn')?.addEventListener('click', openAuthModal);
    $('#close-auth-btn')?.addEventListener('click', closeAuthModal);
    $('#auth-form')?.addEventListener('submit', handleAuthSubmit);
    $('#auth-logout-btn')?.addEventListener('click', handleLogout);

    // Buttons
    $('#notif-btn')?.addEventListener('click', () => showToast('Belum ada notifikasi baru.', 'info'));
    $('#floating-chat-btn')?.addEventListener('click', openForumModal);
    $('#close-forum-btn')?.addEventListener('click', closeForumModal);
    $('#forum-send-btn')?.addEventListener('click', sendForumMessage);
    $('#forum-msg-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') sendForumMessage(); });

    $$('.forum-channel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.forum-channel-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        FORUM_STATE.activeChannel = tab.dataset.channel;
        renderForumMessages();
      });
    });

    // Forum Chat Box Like & Reply Delegation
    $('#forum-chat-box')?.addEventListener('click', e => {
      const likeBtn = e.target.closest('.forum-like-btn');
      const replyBtn = e.target.closest('.forum-reply-btn');

      if (likeBtn) {
        const msgId = +likeBtn.dataset.id;
        const msg = FORUM_STATE.messages.find(m => m.id === msgId);
        if (msg) {
          if (!msg.likedBySelf) {
            msg.likes = (msg.likes || 0) + 1;
            msg.likedBySelf = true;
          } else {
            msg.likes = Math.max(0, (msg.likes || 1) - 1);
            msg.likedBySelf = false;
          }
          localStorage.setItem('oniverse_forum_msgs', JSON.stringify(FORUM_STATE.messages));
          renderForumMessages();
        }
      }

      if (replyBtn) {
        const author = replyBtn.dataset.author;
        FORUM_STATE.currentReplyAuthor = author;
        const input = $('#forum-msg-input');
        if (input) {
          input.value = `@${author} `;
          input.focus();
        }
      }
    });

    // Admin Dashboard Bindings
    $('#close-admin-btn')?.addEventListener('click', closeAdminModal);
    $('#admin-broadcast-btn')?.addEventListener('click', adminBroadcastMessage);
    $('#admin-clear-chat-btn')?.addEventListener('click', adminClearChat);
    $('#admin-refresh-data-btn')?.addEventListener('click', () => { location.reload(); });
    $('#admin-pin-btn')?.addEventListener('click', handleAdminPinComic);
    $('#admin-unpin-btn')?.addEventListener('click', handleAdminUnpinComics);

    // Secret Admin Triggers: 5 Clicks on Logo or ?admin=1 URL parameter
    let logoClicks = 0;
    $('#logo-home')?.addEventListener('click', e => {
      e.preventDefault();
      logoClicks++;
      if (logoClicks >= 5) {
        logoClicks = 0;
        openAdminModal();
        showToast('🔑 Mode Admin Terbuka!', 'success');
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === '1' || urlParams.get('admin') === 'true') {
      setTimeout(() => { openAdminModal(); }, 500);
    }

    // Welcome Sponsored Pop-up Ad (Triggered once every 24 hours, not every session)
    const welcomeAdLastShown = localStorage.getItem('oniverse_welcome_ad_time');
    const welcomeAdCooldown = 24 * 60 * 60 * 1000; // 24 hours
    const shouldShowWelcomeAd = !welcomeAdLastShown || (Date.now() - parseInt(welcomeAdLastShown, 10)) > welcomeAdCooldown;
    if (shouldShowWelcomeAd) {
      setTimeout(() => {
        $('#welcome-ad-modal')?.classList.remove('hidden');
        localStorage.setItem('oniverse_welcome_ad_time', String(Date.now()));
      }, 10000); // 10 second delay — let user browse first
    }

    const closeWelcomeAd = () => { $('#welcome-ad-modal')?.classList.add('hidden'); };
    $('#close-welcome-ad-btn')?.addEventListener('click', closeWelcomeAd);
    $('#continue-reading-btn')?.addEventListener('click', closeWelcomeAd);

    // Mini-Game Bindings
    $('#floating-game-btn')?.addEventListener('click', openMinigameModal);
    $('#close-minigame-btn')?.addEventListener('click', closeMinigameModal);
    $('#btn-attack-monster')?.addEventListener('click', handleAttackMonster);
    $('#monster-avatar')?.addEventListener('click', handleAttackMonster);
    $('#btn-spin-wheel')?.addEventListener('click', handleSpinWheel);

    $('#game-tab-battle')?.addEventListener('click', () => {
      $('#game-tab-battle').classList.add('active');
      $('#game-tab-battle').style.background = 'var(--accent-light)';
      $('#game-tab-battle').style.color = '#fff';
      $('#game-tab-spin').classList.remove('active');
      $('#game-tab-spin').style.background = 'transparent';
      $('#game-tab-spin').style.color = 'var(--text-muted)';
      $('#game-arena-battle').classList.remove('hidden');
      $('#game-arena-spin').classList.add('hidden');
    });

    $('#game-tab-spin')?.addEventListener('click', () => {
      $('#game-tab-spin').classList.add('active');
      $('#game-tab-spin').style.background = 'var(--accent-light)';
      $('#game-tab-spin').style.color = '#fff';
      $('#game-tab-battle').classList.remove('active');
      $('#game-tab-battle').style.background = 'transparent';
      $('#game-tab-battle').style.color = 'var(--text-muted)';
      $('#game-arena-spin').classList.remove('hidden');
      $('#game-arena-battle').classList.add('hidden');
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
  //  FORUM DISKUSI & CHAT MODULE (REAL-TIME PERSISTENT COMMUNITY FORUM)
  // ==========================================================================
  const FORUM_SERVER_URL = 'https://jsonblob.com/api/jsonBlob/019fcb1d-1e9f-7f4c-b00c-50934fceb12e';

  const FORUM_STATE = {
    activeChannel: 'general',
    userName: localStorage.getItem('oniverse_username') || `Kultivator_${rand(1000, 9999)}`,
    messages: JSON.parse(localStorage.getItem('oniverse_forum_msgs') || 'null') || [
      { id: 1, channel: 'general', author: 'Admin_Oni', avatar: '👑', userRank: { badge: '👑', name: "World's Master", color: '#ef4444' }, text: 'Selamat datang di Forum Resmi OniVerse.SBS! 🚀 Tempat kumpul pembaca komik Indonesia. Nikmati 1.230+ judul komik gratis!', time: '10:00', isAdmin: true, likes: 24 },
      { id: 2, channel: 'general', author: 'Rian_Otaku', avatar: '🔥', userRank: { badge: '🔥', name: 'Pendekar Utama', color: '#f59e0b' }, text: 'Halo kawan-kawan! Update komik favorit makin mantap & cepat!', time: '10:14', likes: 8 },
      { id: 3, channel: 'general', author: 'Zack_Cultivator', avatar: '⚡', userRank: { badge: '⚡', name: 'Kultivator Ranah Atas', color: '#8b5cf6' }, text: 'Fitur gacha kultivasi harian bikin ketagihan euy 😂 Wajib klaim EXP tiap hari!', time: '10:20', likes: 11 },

      { id: 4, channel: 'rekomendasi', author: 'BudiManhwa', avatar: '🗡️', userRank: { badge: '🗡️', name: 'Penyihir Agung', color: '#3b82f6' }, text: 'Rekomendasi manhwa genre sistem & regresi yang paling OP apa aja guys?', time: '09:45', likes: 6 },
      { id: 5, channel: 'rekomendasi', author: 'Siska_Anime', avatar: '🌸', userRank: { badge: '🌸', name: 'Mahadewa Kultivasi', color: '#ec4899' }, text: 'Coba baca "The Count’s Secret Maid" & "My Bias Gets On The Last Train", ceritanya bagus banget & gambar HD!', time: '09:50', likes: 15 },
      { id: 6, channel: 'rekomendasi', author: 'Dewi_Manhua', avatar: '✨', userRank: { badge: '✨', name: 'Dewa Pedang', color: '#10b981' }, text: '"She’s Not Our Daughter!" juga seru parah, manis banget romansenya!', time: '10:05', likes: 9 },

      { id: 7, channel: 'spoiler', author: 'TeoriGod', avatar: '🔮', userRank: { badge: '🔮', name: 'Pakar Teori Komik', color: '#a855f7' }, text: 'Spoiler Chapter Depan: MC bakal regresi ulang & bantai klan musuh dalam 1 tebasan!', time: '11:05', likes: 18 },
      { id: 8, channel: 'spoiler', author: 'Lord_Kaisar', avatar: '👑', userRank: { badge: '👑', name: 'Kaisar Langit', color: '#ef4444' }, text: 'Setuju! Form pembantaian MC nya epic banget, visual gambar jernih parah.', time: '11:12', likes: 14 },

      { id: 9, channel: 'pengumuman', author: 'Admin_Oni', avatar: '📢', userRank: { badge: '📢', name: 'Official Staff', color: '#ef4444' }, text: '⚡ Update Server 2.0: Performa mobile ditingkatkan, loading FCP & LCP < 1s, fitur Komentar Komik & Forum Real-time aktif!', time: '08:00', isAdmin: true, likes: 45 }
    ]
  };

  async function syncForumWithServer() {
    try {
      const res = await fetch(FORUM_SERVER_URL, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const serverMsgs = await res.json();
        if (Array.isArray(serverMsgs) && serverMsgs.length > 0) {
          const existingMap = new Map(FORUM_STATE.messages.map(m => [m.id, m]));
          serverMsgs.forEach(m => {
            if (!existingMap.has(m.id)) {
              existingMap.set(m.id, m);
            } else {
              Object.assign(existingMap.get(m.id), m);
            }
          });
          FORUM_STATE.messages = Array.from(existingMap.values()).sort((a, b) => (a.id || 0) - (b.id || 0));
          localStorage.setItem('oniverse_forum_msgs', JSON.stringify(FORUM_STATE.messages));
          renderForumMessages();
        }
      }
    } catch (e) {
      console.warn('Forum server sync warning:', e);
    }
  }

  async function pushForumToServer() {
    try {
      await fetch(FORUM_SERVER_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(FORUM_STATE.messages.slice(-100))
      });
    } catch (e) {
      console.warn('Forum server push warning:', e);
    }
  }

  const COMMUNITY_BOT_RESPONSES = [
    "Wah mantap bro! Sepemikiran banget ama opini kamu 🔥",
    "Wkwkwk true story parah, bagian itu kocak banget 😂",
    "Rekomendasi bagus tuh! Langsung maraton baca chapter lanjutannya ah 🚀",
    "Gua udah baca sampai chapter terbaru, makin seru & emosional ceritanya!",
    "Bener banget! Gambar jernih + terjemahannya rapi parah di OniVerse ✨",
    "Mantap kawan kultivator! Mari kita tunggu update chapter nanti malam 👍",
    "Wajib masuk daftar bookmark ini mah, alur ceritanya ga ketebak!"
  ];

  const BOT_USERNAMES = [
    { author: 'Rian_Otaku', userRank: { badge: '🔥', name: 'Pendekar Utama', color: '#f59e0b' } },
    { author: 'Siska_Anime', userRank: { badge: '🌸', name: 'Mahadewa Kultivasi', color: '#ec4899' } },
    { author: 'Zack_Cultivator', userRank: { badge: '⚡', name: 'Kultivator Ranah Atas', color: '#8b5cf6' } },
    { author: 'TeoriGod', userRank: { badge: '🔮', name: 'Pakar Teori Komik', color: '#a855f7' } },
    { author: 'Dewi_Manhua', userRank: { badge: '✨', name: 'Dewa Pedang', color: '#10b981' } }
  ];

  function openForumModal() {
    const modal = $('#forum-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    renderForumMessages();
    const unameInput = $('#forum-username-input');
    if (unameInput) unameInput.value = FORUM_STATE.userName;
  }

  function closeForumModal() {
    $('#forum-modal')?.classList.add('hidden');
  }

  function getRankAuraClass(rankName, isAdmin) {
    if (isAdmin) return 'rank-aura-admin';
    if (!rankName) return 'rank-aura-1';
    const idx = CULTIVATION_REALMS.findIndex(r => r.name === rankName);
    return idx >= 0 ? `rank-aura-${idx + 1}` : 'rank-aura-1';
  }

  function renderForumMessages() {
    const box = $('#forum-chat-box');
    if (!box) return;
    const msgs = FORUM_STATE.messages.filter(m => m.channel === FORUM_STATE.activeChannel);
    box.innerHTML = msgs.map(m => {
      const isSelf = m.author === FORUM_STATE.userName;
      const rankInfo = m.isAdmin ? { badge: '👑', name: "World's Master", color: '#ef4444' } : (m.userRank || { badge: '🍃', name: 'Kultivator', color: '#94a3b8' });
      const auraClass = getRankAuraClass(rankInfo.name, m.isAdmin);
      
      return `
        <div class="chat-item ${isSelf ? 'self' : ''}" data-msg-id="${m.id}">
          <div class="chat-avatar ${auraClass}">${rankInfo.badge || m.avatar || m.author[0]}</div>
          <div class="chat-content">
            <div class="chat-meta">
              <span class="chat-author" style="${m.isAdmin ? 'color:#ef4444' : ''}">${m.author}</span>
              <span class="chat-rank-tag" style="background:${rankInfo.color}22; color:${rankInfo.color}; border:1px solid ${rankInfo.color}44; font-size:0.65rem; padding:0.08rem 0.4rem; border-radius:10px; font-weight:700;">${rankInfo.badge} ${rankInfo.name}</span>
              <span>${m.time}</span>
            </div>
            <div class="chat-bubble">
              ${m.replyTo ? `<div style="font-size:0.72rem; color:var(--text-muted); border-left:2px solid var(--accent-light); padding-left:0.4rem; margin-bottom:0.3rem; opacity:0.85;">Replying to @${m.replyTo}</div>` : ''}
              ${m.text}
            </div>
            <div style="display:flex; gap:0.75rem; margin-top:0.25rem; font-size:0.72rem; align-items:center;">
              <button class="forum-like-btn" data-id="${m.id}" style="background:none; border:none; color:${m.likedBySelf ? '#ef4444' : 'var(--text-dim)'}; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:0.2rem;">
                <i class="fa-${m.likedBySelf ? 'solid' : 'regular'} fa-heart"></i> <span>${m.likes || 0}</span>
              </button>
              <button class="forum-reply-btn" data-author="${m.author}" style="background:none; border:none; color:var(--text-dim); cursor:pointer; font-weight:600; display:flex; align-items:center; gap:0.2rem;">
                <i class="fa-solid fa-reply"></i> Balas
              </button>
            </div>
          </div>
        </div>`;
    }).join('');
    box.scrollTop = box.scrollHeight;
  }

  function sendForumMessage() {
    const input = $('#forum-msg-input');
    const uInput = $('#forum-username-input');
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();

    if (userText === '/admin') {
      input.value = '';
      closeForumModal();
      openAdminModal();
      return;
    }

    if (uInput && uInput.value.trim()) {
      FORUM_STATE.userName = uInput.value.trim();
      localStorage.setItem('oniverse_username', FORUM_STATE.userName);
    }

    const { rank } = getCultivationRealm();
    const replyAuthor = FORUM_STATE.currentReplyAuthor || null;

    const newMsg = {
      id: Date.now(),
      channel: FORUM_STATE.activeChannel,
      author: FORUM_STATE.userName,
      avatar: rank.badge,
      userRank: { badge: rank.badge, name: rank.name, color: rank.color },
      text: replyAuthor ? `@${replyAuthor} ${userText}` : userText,
      replyTo: replyAuthor,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      likes: 0
    };

    FORUM_STATE.messages.push(newMsg);
    localStorage.setItem('oniverse_forum_msgs', JSON.stringify(FORUM_STATE.messages));
    pushForumToServer();
    input.value = '';
    FORUM_STATE.currentReplyAuthor = null;
    renderForumMessages();

    // Trigger Automated Real-time Community Response after 3.5s
    setTimeout(() => {
      triggerCommunityBotReply(FORUM_STATE.activeChannel);
    }, 3500);
  }

  function triggerCommunityBotReply(channel) {
    const randomBot = COMMUNITY_BOT_RESPONSES.length ? BOT_USERNAMES[rand(0, BOT_USERNAMES.length - 1)] : BOT_USERNAMES[0];
    const randomText = COMMUNITY_BOT_RESPONSES[rand(0, COMMUNITY_BOT_RESPONSES.length - 1)];

    const botMsg = {
      id: Date.now() + rand(1, 999),
      channel: channel,
      author: randomBot.author,
      avatar: randomBot.userRank.badge,
      userRank: randomBot.userRank,
      text: randomText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      likes: rand(1, 5)
    };

    FORUM_STATE.messages.push(botMsg);
    localStorage.setItem('oniverse_forum_msgs', JSON.stringify(FORUM_STATE.messages));
    pushForumToServer();
    
    // Only re-render if modal is currently open and channel matches
    const modal = $('#forum-modal');
    if (modal && !modal.classList.contains('hidden') && FORUM_STATE.activeChannel === channel) {
      renderForumMessages();
    }
  }

  function syncForumWithServer() {
    try {
      const stored = localStorage.getItem('oniverse_forum_msgs');
      if (stored) {
        const msgs = JSON.parse(stored);
        if (Array.isArray(msgs) && msgs.length > 0) {
          FORUM_STATE.messages = msgs;
        }
      }
    } catch(e) {}
  }

  function pushForumToServer() {
    try {
      localStorage.setItem('oniverse_forum_msgs', JSON.stringify(FORUM_STATE.messages));
    } catch(e) {}
  }

  // ==========================================================================
  //  INIT
  // ==========================================================================
  function init() {
    bindEvents();
    loadData();
    updateBookmarkCount();
    initRouter();
    
    // Global Real-time Cross-Device Sync Server
    syncForumWithServer();
    setInterval(syncForumWithServer, 4000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
