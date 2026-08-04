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

  // 3. Anti-debugging: detect DevTools open via debugger timing
  let _devtoolsOpen = false;
  const _antiDebug = function() {
    const start = performance.now();
    debugger;
    const end = performance.now();
    if (end - start > 100) {
      if (!_devtoolsOpen) {
        _devtoolsOpen = true;
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0d0a1a;color:#7c3aed;font-family:Outfit,sans-serif;font-size:2rem;text-align:center;padding:2rem"><div><h1>⛔ Akses Ditolak</h1><p style="font-size:1rem;color:#94a3b8;margin-top:1rem">DevTools terdeteksi. Halaman ini dilindungi.</p><p style="font-size:0.85rem;color:#64748b;margin-top:0.5rem">Tutup DevTools dan refresh halaman untuk melanjutkan.</p></div></div>';
      }
    } else {
      _devtoolsOpen = false;
    }
  };
  setInterval(_antiDebug, 3000);

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
    if (s.slug) return s.slug;
    if (s.id) return s.id;
    return (s.title || s.name || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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

  function openAdminModal() {
    $('#admin-modal')?.classList.remove('hidden');
    renderAdminModList();
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
    if (window.SERIES_DATA && Array.isArray(window.SERIES_DATA) && window.SERIES_DATA.length > 0) {
      console.log('Loaded initial fast data from window.SERIES_DATA:', window.SERIES_DATA.length);
      STATE.allSeries = [...window.SERIES_DATA].sort((a, b) => parseDateScore(b) - parseDateScore(a));
      STATE.filtered = [...STATE.allSeries];
      onDataReady();
      initialLoaded = true;
    }

    // Lazy load full catalog (data-catalog.json) in background AFTER initial paint (2.5s delay for 95+ PageSpeed)
    setTimeout(async () => {
      try {
        const res = await fetch('data-catalog.json');
        if (res.ok) {
          const catalog = await res.json();
          if (Array.isArray(catalog) && catalog.length > 0) {
            console.log(`Loaded catalog in background: ${catalog.length} items`);
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
            const totalEl = $('#footer-total');
            if (totalEl) totalEl.textContent = STATE.allSeries.length + '+';
          }
        }
      } catch (err) {
        console.warn('Catalog background fetch error:', err);
      }
    }, 2500);

    if (!initialLoaded && STATE.allSeries.length === 0) {
      console.error('Initial data load failed.');
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
        <div class="update-item" data-idx="${i}">
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
  function openDetail(s, fromRouter) {
    STATE.currentDetail = s;
    if (!fromRouter) navigateToComic(s, false);
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
      </div>`;

    // Events
    $('#detail-read-first').onclick = () => {
      if (sortedChapters.length) openReader(s, sortedChapters, sortedChapters.length - 1);
    };

    $('#detail-bookmark-btn').onclick = () => {
      toggleBookmark(s);
      openDetail(s);
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

    // 1. Fetch local detail JSON if available and chapters/synopsis are missing
    const comicSlug = getSlug(s);
    if (comicSlug && (!s.chapters || s.chapters.length === 0 || !s.synopsis)) {
      fetch(`data/detail/${comicSlug}.json`)
        .then(r => r.ok ? r.json() : null)
        .then(detailData => {
          if (detailData) {
            if (detailData.synopsis) s.synopsis = detailData.synopsis;
            if (detailData.alternative_title) s.alternative_title = detailData.alternative_title;
            if (detailData.author) s.author = detailData.author;
            if (detailData.artist) s.artist = detailData.artist;
            if (Array.isArray(detailData.chapters) && detailData.chapters.length > 0 && (!s.chapters || s.chapters.length === 0)) {
              s.chapters = detailData.chapters;
            }
            if (STATE.currentDetail === s) openDetail(s, true);
          }
        }).catch(() => {});
    }

    // 2. Fetch full chapters from API if still needed
    if (s.id && (!s.chapters || s.chapters.length < (s.total_chapters || 30))) {
      if (s.source === 'komikcast' || s.kc_slug || String(s.id).startsWith('kc_')) {
        const kcSeries = s.kc_slug || String(s.id).replace('kc_', '');
        fetch(`https://be.komikcast.cc/series/${kcSeries}/chapters`)
          .then(r => r.json())
          .then(d => {
            const items = d.data || [];
            if (Array.isArray(items) && items.length > 0) {
              s.chapters = items.map(ch => {
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
              if (STATE.currentDetail === s) openDetail(s, true);
            }
          }).catch(e => console.warn('KC Chapter API error:', e));
      } else {
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
              if (STATE.currentDetail === s) openDetail(s, true);
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
    const chSlug = ch.slug || ch.chapter_slug || ch.chapter_id || '';
    let images = [];
    try {
      if (series.source === 'komikcast' || series.kc_slug || ch.kc_series_slug || (series.id && String(series.id).startsWith('kc_'))) {
        const kcSeries = series.kc_slug || (series.id ? String(series.id).replace('kc_', '') : '');
        const kcIndex = ch.kc_index || ch.number || ch.chapter;
        const res = await fetch(`https://be.komikcast.cc/series/${kcSeries}/chapters/${kcIndex}`);
        if (!res.ok) throw new Error('Komikcast API error');
        const jsonRes = await res.json();
        const chData = jsonRes.data?.data || jsonRes.data || {};
        images = chData.images || [];
      } else {
        const res = await fetch(`https://api.shngm.io/v1/chapter/detail/${chSlug}`);
        if (!res.ok) throw new Error('API error');
        const jsonRes = await res.json();
        const d = jsonRes.data || {};
        const baseUrl = d.base_url || d.base_url_low || 'https://assets.shngm.id';
        const chData = d.chapter || {};
        const chPath = chData.path || '';
        const filenames = chData.data || chData.images || [];

        if (Array.isArray(filenames) && filenames.length > 0) {
          images = filenames.map(fn => {
            if (typeof fn === 'string') {
              if (fn.startsWith('http')) return fn;
              return baseUrl + chPath + fn;
            }
            return fn.url || fn.src || '';
          });
        } else if (Array.isArray(d.images)) {
          images = d.images.map(i => typeof i === 'string' ? (i.startsWith('http') ? i : baseUrl + i) : i.url || i.src);
        }
      }

      if (!images.length) throw new Error('No images found');

      content.innerHTML = `
        <div class="reader-images-wrap">
          ${images.map((img, i) => `<img src="${img}" class="reader-page-img" alt="Halaman ${i + 1}" loading="lazy" onerror="this.alt='Gagal memuat halaman ${i + 1}'">`).join('')}
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
      const chNum = ch.number || ch.chapter || idx + 1;
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

    // Admin Dashboard Bindings
    $('#close-admin-btn')?.addEventListener('click', closeAdminModal);
    $('#admin-broadcast-btn')?.addEventListener('click', adminBroadcastMessage);
    $('#admin-clear-chat-btn')?.addEventListener('click', adminClearChat);
    $('#admin-refresh-data-btn')?.addEventListener('click', () => { location.reload(); });

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
  //  FORUM DISKUSI & CHAT MODULE
  // ==========================================================================
  const FORUM_STATE = {
    activeChannel: 'general',
    userName: localStorage.getItem('oniverse_username') || `Pembaca_${rand(1000, 9999)}`,
    messages: JSON.parse(localStorage.getItem('oniverse_forum_msgs') || 'null') || [
      { id: 1, channel: 'general', author: 'Rian_Otaku', avatar: 'R', text: 'Solo Leveling Ragnarok rilis jam berapa min?', time: '10:14' },
      { id: 2, channel: 'general', author: 'Admin_Oni', avatar: 'A', text: 'Halo kawan-kawan! Selamat datang di Forum OniVerse! Lebih dari 600+ komik HD siap dibaca gratis! 🔥', time: '10:16', isAdmin: true },
      { id: 3, channel: 'rekomendasi', author: 'BudiManhwa', avatar: 'B', text: 'Rekomendasi manhwa sistem yang bagus dong?', time: '09:45' },
      { id: 4, channel: 'rekomendasi', author: 'Siska_Anime', avatar: 'S', text: 'Coba baca "The Greatest Estate Developer", kocak parah!', time: '09:50' },
      { id: 5, channel: 'spoiler', author: 'TeoriGod', avatar: 'T', text: 'Spoiler Ch 887 Demonic Emperor: Zhuo Fan bakalan bantai klan suci!', time: '11:05' }
    ]
  };

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
      const rankInfo = m.isAdmin ? { badge: '👑', name: "World's Master", color: '#ef4444' } : (m.userRank || { badge: '🍃', name: 'Half-Step Innate Soul', color: '#94a3b8' });
      const auraClass = getRankAuraClass(rankInfo.name, m.isAdmin);
      
      return `
        <div class="chat-item ${isSelf ? 'self' : ''}">
          <div class="chat-avatar ${auraClass}">${rankInfo.badge || m.avatar || m.author[0]}</div>
          <div class="chat-content">
            <div class="chat-meta">
              <span class="chat-author" style="${m.isAdmin ? 'color:#ef4444' : ''}">${m.author}</span>
              <span class="chat-rank-tag" style="background:${rankInfo.color}22; color:${rankInfo.color}; border:1px solid ${rankInfo.color}44; font-size:0.65rem; padding:0.08rem 0.4rem; border-radius:10px; font-weight:700;">${rankInfo.badge} ${rankInfo.name}</span>
              <span>${m.time}</span>
            </div>
            <div class="chat-bubble">${m.text}</div>
          </div>
        </div>`;
    }).join('');
    box.scrollTop = box.scrollHeight;
  }

  function sendForumMessage() {
    const input = $('#forum-msg-input');
    const uInput = $('#forum-username-input');
    if (!input || !input.value.trim()) return;

    if (input.value.trim() === '/admin') {
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
    const newMsg = {
      id: Date.now(),
      channel: FORUM_STATE.activeChannel,
      author: FORUM_STATE.userName,
      avatar: rank.badge,
      userRank: { badge: rank.badge, name: rank.name, color: rank.color },
      text: input.value.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    FORUM_STATE.messages.push(newMsg);
    localStorage.setItem('oniverse_forum_msgs', JSON.stringify(FORUM_STATE.messages));
    input.value = '';
    renderForumMessages();
  }

  // ==========================================================================
  //  INIT
  // ==========================================================================
  function init() {
    bindEvents();
    loadData();
    updateBookmarkCount();
    initRouter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
