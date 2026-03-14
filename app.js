// ============================================================
// CINEOPSY — APP.JS (Shared JS for all public pages)
// ============================================================

// ── Firebase ──
let db = null, firebaseReady = false;
function initFirebase() {
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    window.db = db;
    firebaseReady = true;
  } catch(e) { console.warn('Firebase init error:', e.message); }
}

// ── Theme ──
function applyTheme(t) {
  document.documentElement.classList.toggle('light', t === 'light');
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = t === 'light' ? '☀️' : '🌙';
  // Fix hero bg
  const hero = document.getElementById('hero');
  if (hero) hero.style.background = t === 'light' ? '#f0f0eb' : '#080808';
  // Fix filmstrip bg
  document.querySelectorAll('.filmstrip').forEach(function(el) {
    el.style.background = t === 'light' ? 'rgba(215,215,210,0.99)' : 'rgba(6,6,6,0.99)';
  });
}
function toggleTheme() {
  const isLight = document.documentElement.classList.contains('light');
  const next = isLight ? 'dark' : 'light';
  localStorage.setItem('co_theme', next);
  applyTheme(next);
}


// ── Nav ──
function toggleMenu() {
  var links = document.getElementById('navLinks');
  if (links) links.classList.toggle('open');
}
document.addEventListener('click', e => {
  const links = document.getElementById('navLinks');
  if (links?.classList.contains('open') && !e.target.closest('nav')) {
    links.classList.remove('open');
  }
});

// ── Scroll to Top ──
window.addEventListener('scroll', () => {
  const btn = document.getElementById('scrollTopBtn');
  if (!btn) return;
  const show = window.scrollY > 400;
  btn.style.opacity = show ? '1' : '0';
  btn.style.pointerEvents = show ? 'auto' : 'none';
});

// ── Reading Progress ──
window.addEventListener('scroll', () => {
  const bar = document.getElementById('readingProgress');
  if (!bar) return;
  const h = document.documentElement.scrollHeight - window.innerHeight;
  bar.style.width = (h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0) + '%';
});

// ── Toast ──
function showToast(msg, ms = 3000) {
  let t = document.getElementById('coToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'coToast';
    t.style.cssText = 'position:fixed;bottom:78px;left:50%;transform:translateX(-50%);background:#cc0000;color:#fff;padding:9px 20px;font-family:"Barlow Condensed",sans-serif;font-size:13px;letter-spacing:1px;z-index:9999;opacity:0;transition:opacity 0.3s;pointer-events:none;white-space:nowrap;border-radius:2px;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._t);
  t._t = setTimeout(() => t.style.opacity = '0', ms);
}

// ── Search ──
let _searchTimer;
function openSearch() {
  var o = document.getElementById('searchOverlay');
  if (!o) return;
  o.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(function() {
    var inp = document.getElementById('searchInput');
    if (inp) inp.focus();
  }, 80);
}
function closeSearch() {
  var o = document.getElementById('searchOverlay');
  if (!o) return;
  o.classList.remove('open');
  document.body.style.overflow = '';
  var inp = document.getElementById('searchInput');
  if (inp) inp.value = '';
  var res = document.getElementById('searchResults');
  if (res) res.innerHTML = '';
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeSearch();
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
});
function setupSearch() {
  const inp = document.getElementById('searchInput');
  if (!inp) return;
  inp.addEventListener('input', () => {
    clearTimeout(_searchTimer);
    const q = inp.value.trim();
    const res = document.getElementById('searchResults');
    if (!res) return;
    if (q.length < 2) { res.innerHTML = ''; return; }
    res.innerHTML = '<div class="search-empty">Searching...</div>';
    _searchTimer = setTimeout(async () => {
      const results = await doSearch(q);
      if (!results.length) { res.innerHTML = `<div class="search-empty">No results for "${escHtml(q)}"</div>`; return; }
      res.innerHTML = results.slice(0,12).map(r => {
        const url = r.type === 'news' ? 'news_article.html?id=' + r.id : getEpUrl(r.playlist, r.id);
        return `<a href="${url}" class="search-result" onclick="closeSearch()">
          <div class="search-result-type">${r.type === 'news' ? '📰 ' + (r.category||'News') : '🎬 ' + r.playlist}</div>
          <div class="search-result-title">${escHtml(r.title)}</div>
        </a>`;
      }).join('');
    }, 350);
  });
}
async function doSearch(q) {
  if (!db || q.length < 2) return [];
  const lq = q.toLowerCase();
  const results = [];
  try {
    const pls = ['weekly','verdict','whatif','casefiles','beyondborders','specials'];
    for (const pl of pls) {
      const snap = await db.collection('episodes').doc(pl).collection('items').get();
      snap.docs.forEach(d => {
        const ep = {...d.data(), id: d.id};
        if ((ep.title||'').toLowerCase().includes(lq) || (ep.excerpt||'').toLowerCase().includes(lq))
          results.push({type:'episode', playlist:pl, ...ep});
      });
    }
    const ns = await db.collection('news').get();
    ns.docs.forEach(d => {
      const n = {...d.data(), id: d.id};
      if ((n.title||'').toLowerCase().includes(lq) || (n.excerpt||'').toLowerCase().includes(lq))
        results.push({type:'news', ...n});
    });
  } catch(e) {}
  return results;
}

// ── Site Settings from Firebase ──
async function loadSiteSettings() {
  if (!firebaseReady) return;
  try {
    const st = await db.collection('settings').doc('sitetext').get();
    if (st.exists) {
      const d = st.data();
      if (d.footer) { const el=document.getElementById('footerCopy'); if(el) el.textContent=d.footer; }
      if (d.tagline) { const el=document.getElementById('heroTagline'); if(el) el.textContent=d.tagline; }
    }
    const th = await db.collection('settings').doc('theme').get();
    if (th.exists) {
      const d = th.data(), r = document.documentElement;
      if (d.red)  r.style.setProperty('--red', d.red);
      if (d.bg)   r.style.setProperty('--black', d.bg);
      if (d.text) r.style.setProperty('--white', d.text);
      if (d.card) r.style.setProperty('--black3', d.card);
    }
    const sl = await db.collection('settings').doc('social').get();
    if (sl.exists) {
      const d = sl.data();
      const links = {youtube:'ytLink',instagram:'igLink',twitter:'twLink',threads:'thLink',reddit:'rdLink',telegram:'tgLink',whatsapp:'waLink'};
      Object.keys(links).forEach(k => {
        const el = document.getElementById(links[k]);
        if (el && d[k]) { el.href = d[k]; el.style.display = 'inline-flex'; }
        else if (el) el.style.display = 'none';
      });
    }
  } catch(e) {}
}

// ── Engagement Functions ──
async function getViewCount(type, id) {
  if (!db) return 0;
  try { const doc = await db.collection('views').doc(`${type}_${id}`).get(); return doc.exists ? doc.data().count||0 : 0; } catch(e) { return 0; }
}
async function incrementView(type, id) {
  if (!db || !id) return;
  try {
    const ref = db.collection('views').doc(`${type}_${id}`);
    await ref.set({count: firebase.firestore.FieldValue.increment(1), type, id}, {merge:true});
    const doc = await ref.get(); return doc.data()?.count || 1;
  } catch(e) { return null; }
}
function getLiked() { return JSON.parse(localStorage.getItem('co_liked')||'[]'); }
function isLiked(id) { return getLiked().includes(id); }
async function getLikeCount(type, id) {
  if (!db) return 0;
  try { const doc = await db.collection('likes').doc(`${type}_${id}`).get(); return doc.exists ? Math.max(0, doc.data().count||0) : 0; } catch(e) { return 0; }
}
async function toggleLike(type, id, countEl) {
  if (!db || !id) return false;
  const liked = getLiked();
  const already = liked.includes(id);
  try {
    const ref = db.collection('likes').doc(`${type}_${id}`);
    if (already) { liked.splice(liked.indexOf(id),1); await ref.set({count: firebase.firestore.FieldValue.increment(-1), type, id},{merge:true}); }
    else { liked.push(id); await ref.set({count: firebase.firestore.FieldValue.increment(1), type, id},{merge:true}); }
    localStorage.setItem('co_liked', JSON.stringify(liked));
    const doc = await ref.get();
    if (countEl) countEl.textContent = Math.max(0, doc.data()?.count||0);
    return !already;
  } catch(e) { return false; }
}
async function getRating(type, id) {
  if (!db) return null;
  try { const doc = await db.collection('ratings').doc(`${type}_${id}`).get(); if(!doc.exists) return null; const d=doc.data(); return {avg:(d.totalStars/d.count).toFixed(1), count:d.count}; } catch(e) { return null; }
}
async function submitRating(type, id, stars, el) {
  if (!db || !id || !stars) return;
  const rated = JSON.parse(localStorage.getItem('co_ratings')||'{}');
  if (rated[id]) { showToast('Already rated!'); return; }
  try {
    const ref = db.collection('ratings').doc(`${type}_${id}`);
    await ref.set({totalStars: firebase.firestore.FieldValue.increment(stars), count: firebase.firestore.FieldValue.increment(1), type, id},{merge:true});
    rated[id] = stars; localStorage.setItem('co_ratings', JSON.stringify(rated));
    const doc = await ref.get(); const d = doc.data();
    const avg = (d.totalStars/d.count).toFixed(1);
    if (el) el.innerHTML = `⭐ ${avg} <span style="opacity:0.5;font-size:12px">(${d.count} ratings)</span>`;
    showToast('Thanks for rating!');
  } catch(e) {}
}
async function loadComments(type, id, el) {
  if (!db || !el) return;
  el.innerHTML = '<div class="state-box" style="padding:28px"><p style="color:var(--gray);font-style:italic">Loading comments...</p></div>';
  try {
    const snap = await db.collection('comments').doc(`${type}_${id}`).collection('items').orderBy('createdAt','desc').limit(50).get();
    if (snap.empty) { el.innerHTML = '<p style="color:var(--gray);font-style:italic;padding:16px 0">No comments yet. Be the first!</p>'; return; }
    el.innerHTML = snap.docs.map(d => {
      const c = d.data();
      const dt = c.createdAt?.toDate?.().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})||'';
      return `<div class="comment-item"><span class="comment-name">${escHtml(c.name||'Anonymous')}</span><span class="comment-date">${dt}</span><div class="comment-text">${escHtml(c.text||'')}</div></div>`;
    }).join('');
  } catch(e) { el.innerHTML = '<p style="color:var(--gray);padding:16px 0">Could not load comments.</p>'; }
}
async function postComment(type, id, name, text, listEl, countEl) {
  if (!db) return;
  if (!name?.trim() || !text?.trim()) { showToast('Please fill in all fields!'); return; }
  try {
    await db.collection('comments').doc(`${type}_${id}`).collection('items').add({
      name: name.trim().substring(0,50), text: text.trim().substring(0,500),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(), type, id
    });
    showToast('Comment posted!');
    await loadComments(type, id, listEl);
    if (countEl) { const s = await db.collection('comments').doc(`${type}_${id}`).collection('items').get(); countEl.textContent = s.size; }
  } catch(e) { showToast('Error. Please try again.'); }
}
function getBookmarks() { return JSON.parse(localStorage.getItem('co_bk')||'[]'); }
function isBookmarked(id) { return getBookmarks().some(b => b.id === id); }
function toggleBookmark(id, title, url, btn) {
  let bks = getBookmarks();
  if (isBookmarked(id)) { bks = bks.filter(b => b.id !== id); if(btn){btn.innerHTML='🔖 Save';btn.classList.remove('saved');} showToast('Removed from watchlist'); }
  else { bks.push({id, title, url, savedAt: Date.now()}); if(btn){btn.innerHTML='✅ Saved';btn.classList.add('saved');} showToast('Saved to watchlist!'); }
  localStorage.setItem('co_bk', JSON.stringify(bks));
}
function shareContent(platform, title, url) {
  const eu = encodeURIComponent(url||location.href), et = encodeURIComponent(title||document.title);
  if (platform === 'copy') { navigator.clipboard.writeText(url||location.href).then(()=>showToast('Link copied!')); return; }
  const urls = {whatsapp:`https://wa.me/?text=${et}%20${eu}`, twitter:`https://twitter.com/intent/tweet?text=${et}&url=${eu}&via=Cineopsy`, telegram:`https://t.me/share/url?url=${eu}&text=${et}`};
  if (urls[platform]) window.open(urls[platform],'_blank','width=600,height=400');
}
async function subscribeNewsletter(email, btn) {
  if (!email||!email.includes('@')) { showToast('Please enter a valid email!'); return; }
  if (!db) { showToast('Service unavailable.'); return; }
  if (btn) { btn.textContent='...'; btn.disabled=true; }
  try {
    const ex = await db.collection('newsletter').where('email','==',email).get();
    if (!ex.empty) showToast('Already subscribed!');
    else { await db.collection('newsletter').add({email, subscribedAt: firebase.firestore.FieldValue.serverTimestamp(), active:true}); showToast('Subscribed! 🎬'); }
  } catch(e) { showToast('Error. Try again!'); }
  if (btn) { btn.textContent='Subscribe →'; btn.disabled=false; }
}

// ── Lightbox ──
function openLightbox(src, alt) {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  if (!lb || !img) return;
  img.src = src; img.alt = alt||'';
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.classList.remove('open');
  document.body.style.overflow = '';
}
function setupLightbox() {
  document.querySelectorAll('.article-body img, .content-body img').forEach(img => {
    img.classList.add('zoomable');
    img.addEventListener('click', () => openLightbox(img.src, img.alt));
  });
}

// ── PWA ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(()=>{}));
}

// ── Poll voting ──
async function castVote(pollId, idx) {
  if (!db) return;
  const voted = JSON.parse(localStorage.getItem('co_polls')||'{}');
  if (voted[pollId] !== undefined) { showToast('Already voted!'); return; }
  try {
    await db.collection('polls').doc(pollId).set({[`votes.option${idx}`]: firebase.firestore.FieldValue.increment(1), totalVotes: firebase.firestore.FieldValue.increment(1)},{merge:true});
    voted[pollId] = idx; localStorage.setItem('co_polls', JSON.stringify(voted));
    showToast('Vote submitted!');
    return true;
  } catch(e) { return false; }
}

// ── Reading time ──
function calcReadTime(text) {
  if (!text) return '';
  return Math.max(1, Math.round(text.trim().split(/\s+/).length / 200)) + ' min read';
}

// ── Helpers ──
function escHtml(s) { if(!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function getEpUrl(pl, id) {
  const m = {weekly:'weekly_ep.html',verdict:'verdict_ep.html',whatif:'whatif_ep.html',casefiles:'casefiles_ep.html',beyondborders:'beyondborders_ep.html',specials:'specials_ep.html'};
  return (m[pl]||'weekly_ep.html') + '?id=' + id + '&pl=' + pl;
}
function getParam(n) { return new URLSearchParams(location.search).get(n); }

// ── Apply theme IMMEDIATELY on script load (before DOM ready) ──
(function() {
  var t = localStorage.getItem('co_theme') || 'dark';
  if (t === 'light') document.documentElement.classList.add('light');
  // Update button when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    var btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = t === 'light' ? '☀️' : '🌙';
    var hero = document.getElementById('hero');
    if (hero) hero.style.background = t === 'light' ? '#f0f0eb' : '#080808';
  });
})();

// ── Init on DOM ready ──
document.addEventListener('DOMContentLoaded', function() {
  initFirebase();
  setupSearch();
  setupLightbox();
  loadSiteSettings();
  loadAnnouncement();
  loadManageSettings();
});

// ── Announcement Banner ──
async function loadAnnouncement() {
  if (!db) return;
  try {
    const doc = await db.collection('settings').doc('manage').get();
    if (!doc.exists) return;
    const d = doc.data();
    if (!d.announcementActive || !d.announcement) return;
    
    // Check if dismissed
    const dismissed = localStorage.getItem('co_ann_' + d.announcement.substring(0,20));
    if (dismissed) return;
    
    const banner = document.createElement('div');
    banner.id = 'annBanner';
    banner.style.cssText = 'background:#cc0000;color:#fff;text-align:center;padding:10px 50px;font-family:"Barlow Condensed",sans-serif;font-size:12px;letter-spacing:1px;position:relative;z-index:1000;';
    banner.innerHTML = d.announcement + '<button onclick="dismissAnnouncement('' + d.announcement.substring(0,20) + '')" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;color:#fff;cursor:pointer;font-size:18px;line-height:1;">✕</button>';
    document.body.insertBefore(banner, document.body.firstChild);
    
    // Push nav + content down
    const nav = document.getElementById('navbar');
    if (nav) nav.style.top = banner.offsetHeight + 'px';
  } catch(e) {}
}

function dismissAnnouncement(key) {
  localStorage.setItem('co_ann_' + key, '1');
  const b = document.getElementById('annBanner');
  if (b) {
    b.remove();
    const nav = document.getElementById('navbar');
    if (nav) nav.style.top = '0';
  }
}

// ── Load manage settings (featured video, creator bio) ──
async function loadManageSettings() {
  if (!db) return;
  try {
    const doc = await db.collection('settings').doc('manage').get();
    if (!doc.exists) return;
    const d = doc.data();
    
    // Update creator name/bio on about page
    const cn = document.getElementById('creatorName');
    const cb = document.getElementById('creatorBio');
    if (cn && d.creatorName) cn.textContent = d.creatorName;
    if (cb && d.creatorBio) cb.textContent = d.creatorBio;
  } catch(e) {}
}

// ════════════════════════════════════════
// CONTENT MANAGEMENT SYSTEM
// Loads all website text from Firebase
// Falls back to CONTENT_DEFAULTS
// ════════════════════════════════════════

let SITE_CONTENT = {};

async function loadPageContent() {
  // Merge defaults first
  if (typeof CONTENT_DEFAULTS !== 'undefined') {
    SITE_CONTENT = Object.assign({}, CONTENT_DEFAULTS);
  }
  // Override with Firebase values
  if (db) {
    try {
      const doc = await db.collection('settings').doc('content').get();
      if (doc.exists) {
        Object.assign(SITE_CONTENT, doc.data());
      }
    } catch(e) {}
  }
  applyContent();
}

function applyContent() {
  const c = SITE_CONTENT;
  if (!c || Object.keys(c).length === 0) return;

  // Helper: set text if element exists
  function setText(id, val) {
    if (!val) return;
    var el = document.getElementById(id);
    if (el) el.innerHTML = val;
  }
  function setAttr(id, attr, val) {
    if (!val) return;
    var el = document.getElementById(id);
    if (el) el[attr] = val;
  }
  function setPlaceholder(id, val) {
    if (!val) return;
    var el = document.getElementById(id);
    if (el) el.placeholder = val;
  }

  // ── GLOBAL ──
  setText('footerTagline', c.footerTagline);
  setText('footerCopy', c.footerCopy);

  // ── HOMEPAGE ──
  setText('heroTagline', c.homeHeroTagline);
  setText('homeSeriesTitle', c.homeSeriesTitle);
  setText('homeSeriesSub', c.homeSeriesSub);
  setText('homeAboutP1', c.homeAboutP1);
  setText('homeAboutP2', c.homeAboutP2);
  setText('homeStat1Num', c.homeStat1Num); setText('homeStat1Label', c.homeStat1Label);
  setText('homeStat2Num', c.homeStat2Num); setText('homeStat2Label', c.homeStat2Label);
  setText('homeStat3Num', c.homeStat3Num); setText('homeStat3Label', c.homeStat3Label);
  setText('homeStat4Num', c.homeStat4Num); setText('homeStat4Label', c.homeStat4Label);
  setText('homeNewsletterBoxTitle', c.homeNewsletterBoxTitle);
  setText('homeNewsletterBoxSub', c.homeNewsletterBoxSub);
  setAttr('nlBtn', 'textContent', c.homeNewsletterBtn);
  setPlaceholder('nlEmail', c.homeNewsletterPlaceholder);
  setText('featuredTitle', c.homeFeaturedSub);

  // ── NEWS PAGE ──
  setText('newsHeroSub', c.newsHeroSub);
  setText('tickerText', c.newsTickerDefault);

  // ── PLAYLIST PAGES ──
  const plMap = {
    plHeroDay: null, plHeroLabel: null, plHeroTitle: null, plHeroSub: null
  };
  // Each playlist page has these IDs
  setText('plHeroDay', c[window._PL_ID + 'Day']);
  setText('plHeroLabel', c[window._PL_ID + 'Label']);
  setText('plHeroTitle', c[window._PL_ID + 'Name']);
  setText('plHeroSub', c[window._PL_ID + 'Desc']);

  // ── CONTACT PAGE ──
  setText('contactHeroSub', c.contactHeroSub);
  setText('contactSuccessTitle', c.contactSuccessTitle);
  setText('contactSuccessSub', c.contactSuccessSub);

  // ── REVIEWS PAGE ──
  setText('reviewsHeroSub', c.reviewsHeroSub);

  // ── REVIEW REQUEST PAGE ──
  setText('rrHeroSub', c.rrHeroSub);
  setPlaceholder('reqMovie', c.rrMoviePlaceholder);
  setPlaceholder('reqReason', c.rrReasonPlaceholder);
  setPlaceholder('reqName', c.rrNamePlaceholder);
  setPlaceholder('reqEmail', c.rrEmailPlaceholder);
  setText('rrSuccessTitle', c.rrSuccessTitle);
  setText('rrSuccessSub', c.rrSuccessSub);

  // ── WATCHLIST ──
  setText('watchlistSub', c.watchlistSub);
  setText('watchlistEmptyTitle', c.watchlistEmptyTitle);
  setText('watchlistEmptySub', c.watchlistEmptySub);
}

// Call on DOM ready
document.addEventListener('DOMContentLoaded', function() {
  // Small delay to let Firebase init first
  setTimeout(loadPageContent, 200);
});
