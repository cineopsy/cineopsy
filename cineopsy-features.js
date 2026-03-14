// ============================================================
// CINEOPSY — SHARED FEATURES LIBRARY
// All features: Search, Likes, Views, Comments, Ratings,
// Bookmarks, Share, Scroll-to-top, Reading progress,
// Polls, Newsletter, Tags, PWA, Notifications
// ============================================================

// ── Firebase ref (db initialized in each page) ──
function getDb() { return window.db || null; }

// ════════════════════════════════════════════
// 1. SCROLL TO TOP
// ════════════════════════════════════════════
function initScrollToTop() {
  const btn = document.getElementById('scrollTopBtn');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.style.opacity = window.scrollY > 400 ? '1' : '0';
    btn.style.pointerEvents = window.scrollY > 400 ? 'auto' : 'none';
  });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ════════════════════════════════════════════
// 2. READING PROGRESS BAR
// ════════════════════════════════════════════
function initReadingProgress() {
  const bar = document.getElementById('readingProgress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docH > 0 ? (window.scrollY / docH) * 100 : 0;
    bar.style.width = pct + '%';
  });
}

// ════════════════════════════════════════════
// 3. READING TIME
// ════════════════════════════════════════════
function calcReadingTime(text) {
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return mins + ' min read';
}

// ════════════════════════════════════════════
// 4. SHARE BUTTONS
// ════════════════════════════════════════════
function shareContent(platform, title, url) {
  const encodedUrl = encodeURIComponent(url || location.href);
  const encodedTitle = encodeURIComponent(title || document.title);
  const urls = {
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    twitter:  `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}&via=Cineopsy`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    copy:     null
  };
  if (platform === 'copy') {
    navigator.clipboard.writeText(url || location.href).then(() => {
      showToast('Link copied!');
    });
    return;
  }
  if (urls[platform]) window.open(urls[platform], '_blank', 'width=600,height=400');
}

// ════════════════════════════════════════════
// 5. VIEW COUNTER
// ════════════════════════════════════════════
async function incrementView(type, id) {
  const db = getDb();
  if (!db || !id) return;
  try {
    const ref = db.collection('views').doc(`${type}_${id}`);
    await ref.set({ count: firebase.firestore.FieldValue.increment(1), type, id }, { merge: true });
    const doc = await ref.get();
    return doc.data()?.count || 1;
  } catch(e) { return null; }
}

async function getViewCount(type, id) {
  const db = getDb();
  if (!db || !id) return null;
  try {
    const doc = await db.collection('views').doc(`${type}_${id}`).get();
    return doc.exists ? doc.data().count : 0;
  } catch(e) { return null; }
}

// ════════════════════════════════════════════
// 6. LIKE BUTTON
// ════════════════════════════════════════════
function getLikedItems() {
  return JSON.parse(localStorage.getItem('co_liked') || '[]');
}

function isLiked(id) {
  return getLikedItems().includes(id);
}

async function toggleLike(type, id, countEl) {
  const db = getDb();
  if (!db || !id) return;
  const liked = getLikedItems();
  const alreadyLiked = liked.includes(id);
  const ref = db.collection('likes').doc(`${type}_${id}`);
  try {
    if (alreadyLiked) {
      liked.splice(liked.indexOf(id), 1);
      await ref.set({ count: firebase.firestore.FieldValue.increment(-1), type, id }, { merge: true });
    } else {
      liked.push(id);
      await ref.set({ count: firebase.firestore.FieldValue.increment(1), type, id }, { merge: true });
    }
    localStorage.setItem('co_liked', JSON.stringify(liked));
    const doc = await ref.get();
    const count = Math.max(0, doc.data()?.count || 0);
    if (countEl) countEl.textContent = count;
    return !alreadyLiked;
  } catch(e) { return null; }
}

async function getLikeCount(type, id) {
  const db = getDb();
  if (!db) return 0;
  try {
    const doc = await db.collection('likes').doc(`${type}_${id}`).get();
    return doc.exists ? Math.max(0, doc.data().count) : 0;
  } catch(e) { return 0; }
}

// ════════════════════════════════════════════
// 7. STAR RATING
// ════════════════════════════════════════════
function getRatedItems() {
  return JSON.parse(localStorage.getItem('co_ratings') || '{}');
}

async function submitRating(type, id, stars, displayEl) {
  const db = getDb();
  if (!db || !id || !stars) return;
  const rated = getRatedItems();
  if (rated[id]) { showToast('You already rated this!'); return; }
  try {
    const ref = db.collection('ratings').doc(`${type}_${id}`);
    await ref.set({
      totalStars: firebase.firestore.FieldValue.increment(stars),
      count: firebase.firestore.FieldValue.increment(1),
      type, id
    }, { merge: true });
    rated[id] = stars;
    localStorage.setItem('co_ratings', JSON.stringify(rated));
    const doc = await ref.get();
    const d = doc.data();
    const avg = d.count > 0 ? (d.totalStars / d.count).toFixed(1) : stars;
    if (displayEl) displayEl.innerHTML = `⭐ ${avg} <span style="opacity:0.5;font-size:12px">(${d.count} ratings)</span>`;
    showToast('Rating submitted! Thank you!');
  } catch(e) {}
}

async function getRating(type, id) {
  const db = getDb();
  if (!db) return null;
  try {
    const doc = await db.collection('ratings').doc(`${type}_${id}`).get();
    if (!doc.exists) return null;
    const d = doc.data();
    return { avg: d.count > 0 ? (d.totalStars / d.count).toFixed(1) : 0, count: d.count };
  } catch(e) { return null; }
}

// ════════════════════════════════════════════
// 8. COMMENTS
// ════════════════════════════════════════════
async function loadComments(type, id, containerEl) {
  const db = getDb();
  if (!db || !containerEl) return;
  containerEl.innerHTML = '<p style="color:var(--gray);font-style:italic;text-align:center;padding:20px">Loading comments...</p>';
  try {
    const snap = await db.collection('comments').doc(`${type}_${id}`).collection('items')
                         .orderBy('createdAt', 'desc').limit(50).get();
    if (snap.empty) {
      containerEl.innerHTML = '<p style="color:var(--gray);font-style:italic;text-align:center;padding:20px">No comments yet. Be the first!</p>';
      return;
    }
    containerEl.innerHTML = snap.docs.map(d => {
      const c = d.data();
      const date = c.createdAt?.toDate?.().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) || '';
      return `<div class="comment-item" data-id="${d.id}">
        <div class="comment-header">
          <span class="comment-name">${escHtml(c.name)}</span>
          <span class="comment-date">${date}</span>
        </div>
        <div class="comment-text">${escHtml(c.text)}</div>
      </div>`;
    }).join('');
  } catch(e) {
    containerEl.innerHTML = '<p style="color:var(--gray);text-align:center;padding:20px">Could not load comments.</p>';
  }
}

async function submitComment(type, id, name, text, containerEl, countEl) {
  const db = getDb();
  if (!db) return;
  if (!name.trim() || !text.trim()) { showToast('Please fill in all fields!'); return; }
  if (text.trim().length < 3) { showToast('Comment too short!'); return; }
  try {
    await db.collection('comments').doc(`${type}_${id}`).collection('items').add({
      name: name.trim().substring(0, 50),
      text: text.trim().substring(0, 500),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      type, id, approved: true
    });
    showToast('Comment posted!');
    await loadComments(type, id, containerEl);
    if (countEl) {
      const snap = await db.collection('comments').doc(`${type}_${id}`).collection('items').get();
      countEl.textContent = snap.size;
    }
  } catch(e) { showToast('Error posting comment. Try again!'); }
}

// ════════════════════════════════════════════
// 9. BOOKMARKS (localStorage)
// ════════════════════════════════════════════
function getBookmarks() {
  return JSON.parse(localStorage.getItem('co_bookmarks') || '[]');
}

function isBookmarked(id) {
  return getBookmarks().some(b => b.id === id);
}

function toggleBookmark(id, title, url, btnEl) {
  let bookmarks = getBookmarks();
  if (isBookmarked(id)) {
    bookmarks = bookmarks.filter(b => b.id !== id);
    if (btnEl) btnEl.innerHTML = '🔖 Save';
    showToast('Removed from watchlist!');
  } else {
    bookmarks.push({ id, title, url, savedAt: Date.now() });
    if (btnEl) btnEl.innerHTML = '✅ Saved';
    showToast('Added to watchlist!');
  }
  localStorage.setItem('co_bookmarks', JSON.stringify(bookmarks));
}

// ════════════════════════════════════════════
// 10. TOAST NOTIFICATION
// ════════════════════════════════════════════
function showToast(msg, duration = 3000) {
  let toast = document.getElementById('coToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'coToast';
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#cc0000;color:#fff;padding:10px 22px;border-radius:4px;font-family:"Barlow Condensed",sans-serif;font-size:13px;letter-spacing:1px;z-index:9999;opacity:0;transition:opacity 0.3s;pointer-events:none;white-space:nowrap;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.style.opacity = '0', duration);
}

// ════════════════════════════════════════════
// 11. NEWSLETTER SIGNUP
// ════════════════════════════════════════════
async function subscribeNewsletter(email, btnEl) {
  const db = getDb();
  if (!email || !email.includes('@')) { showToast('Please enter a valid email!'); return; }
  if (!db) { showToast('Service unavailable. Try later.'); return; }
  if (btnEl) { btnEl.textContent = 'Subscribing...'; btnEl.disabled = true; }
  try {
    const existing = await db.collection('newsletter').where('email', '==', email).get();
    if (!existing.empty) { showToast('Already subscribed!'); }
    else {
      await db.collection('newsletter').add({ email, subscribedAt: firebase.firestore.FieldValue.serverTimestamp(), active: true });
      showToast('Subscribed successfully! 🎬');
    }
  } catch(e) { showToast('Error. Please try again!'); }
  if (btnEl) { btnEl.textContent = 'Subscribe'; btnEl.disabled = false; }
}

// ════════════════════════════════════════════
// 12. POLL VOTING
// ════════════════════════════════════════════
function getVotedPolls() {
  return JSON.parse(localStorage.getItem('co_polls') || '{}');
}

async function votePoll(pollId, optionIndex) {
  const db = getDb();
  if (!db) return;
  const voted = getVotedPolls();
  if (voted[pollId] !== undefined) { showToast('You already voted!'); renderPollResults(pollId); return; }
  try {
    await db.collection('polls').doc(pollId).set({
      [`votes.option${optionIndex}`]: firebase.firestore.FieldValue.increment(1),
      totalVotes: firebase.firestore.FieldValue.increment(1)
    }, { merge: true });
    voted[pollId] = optionIndex;
    localStorage.setItem('co_polls', JSON.stringify(voted));
    renderPollResults(pollId);
    showToast('Vote submitted!');
  } catch(e) {}
}

async function renderPollResults(pollId) {
  const db = getDb();
  if (!db) return;
  const container = document.getElementById('poll_' + pollId);
  if (!container) return;
  try {
    const doc = await db.collection('polls').doc(pollId).get();
    if (!doc.exists) return;
    const d = doc.data();
    const total = d.totalVotes || 1;
    const voted = getVotedPolls();
    const userVote = voted[pollId];
    const options = container.querySelectorAll('.poll-option');
    options.forEach((opt, i) => {
      const votes = d.votes?.[`option${i}`] || 0;
      const pct = Math.round((votes / total) * 100);
      opt.innerHTML = `<div class="poll-bar-wrap">
        <div class="poll-bar" style="width:${pct}%"></div>
        <span class="poll-label">${opt.dataset.label}</span>
        <span class="poll-pct">${pct}%</span>
      </div>`;
      if (userVote === i) opt.classList.add('poll-voted');
      opt.onclick = null;
    });
    const totalEl = container.querySelector('.poll-total');
    if (totalEl) totalEl.textContent = total + ' votes';
  } catch(e) {}
}

// ════════════════════════════════════════════
// 13. SEARCH
// ════════════════════════════════════════════
async function globalSearch(query) {
  const db = getDb();
  if (!db || !query || query.length < 2) return [];
  const q = query.toLowerCase();
  const results = [];
  try {
    const playlists = ['weekly','verdict','whatif','casefiles','beyondborders','specials'];
    for (const pl of playlists) {
      const snap = await db.collection('episodes').doc(pl).collection('items').get();
      snap.docs.forEach(d => {
        const ep = { ...d.data(), id: d.id };
        if ((ep.title||'').toLowerCase().includes(q) || (ep.excerpt||'').toLowerCase().includes(q)) {
          results.push({ type: 'episode', playlist: pl, ...ep });
        }
      });
    }
    const newsSnap = await db.collection('news').get();
    newsSnap.docs.forEach(d => {
      const n = { ...d.data(), id: d.id };
      if ((n.title||'').toLowerCase().includes(q) || (n.excerpt||'').toLowerCase().includes(q)) {
        results.push({ type: 'news', ...n });
      }
    });
  } catch(e) {}
  return results;
}

// ════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getEpUrl(playlist, id) {
  const map = {
    weekly:'weekly_ep.html', verdict:'verdict_ep.html', whatif:'whatif_ep.html',
    casefiles:'casefiles_ep.html', beyondborders:'beyondborders_ep.html', specials:'specials_ep.html'
  };
  return (map[playlist] || 'weekly_ep.html') + '?id=' + id + '&pl=' + playlist;
}
