/* ==========================================================================
   MidnightFlix — App Logic
   Powered by TMDB (https://www.themoviedb.org/documentation/api).

   ⚠️ Add your own free TMDB API key below before running:
      1. Create an account at https://www.themoviedb.org
      2. Go to Settings → API → request a free "Developer" key (v3 auth)
      3. Paste it into TMDB_API_KEY
   ========================================================================== */

const TMDB_API_KEY = 'b608fa72f7a0480576a94d846193263d';
const TMDB_BASE = 'https://api.tmdb.org/3';
const IMG_POSTER = 'https://image.tmdb.org/t/p/w500';
const IMG_PROFILE = 'https://image.tmdb.org/t/p/w185';
const IMG_PROVIDER = 'https://image.tmdb.org/t/p/w92';
const YOUTUBE_EMBED = 'https://www.youtube.com/embed/';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  query: '',
  cinema: 'indian', // indian | bollywood | south | hollywood
  genre: '',
  year: '',
  rating: '',
  language: '',
  page: 1,
  totalPages: 1,
  genreMap: {}, // id -> name
  currentMode: 'browse', // browse | mood | quiz
  quizSelectedMovies: [],
};

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------
const el = {
  grid: document.getElementById('movie-grid'),
  searchInput: document.getElementById('search-input'),
  searchSpinner: document.getElementById('search-spinner'),
  genreFilter: document.getElementById('genre-filter'),
  yearFilter: document.getElementById('year-filter'),
  ratingFilter: document.getElementById('rating-filter'),
  langFilter: document.getElementById('lang-filter'),
  prevBtn: document.getElementById('prev-btn'),
  nextBtn: document.getElementById('next-btn'),
  pageIndicator: document.getElementById('page-indicator'),
  settingsBtn: document.getElementById('settings-btn'),
  closeSettings: document.getElementById('close-settings'),
  settingsPanel: document.getElementById('settings-panel'),
  drawerOverlay: document.getElementById('drawer-overlay'),
  themeToggle: document.getElementById('theme-toggle'),
  detailsModal: document.getElementById('details-modal'),
  detailsBody: document.getElementById('details-body'),
  trailerModal: document.getElementById('trailer-modal'),
  trailerBody: document.getElementById('trailer-body'),
  
  // Rec Engine
  tabs: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  resultsTitle: document.getElementById('results-title'),
  moodCards: document.querySelectorAll('.mood-card'),
  quizInput: document.getElementById('quiz-search-input'),
  quizDropdown: document.getElementById('quiz-search-results'),
  quizTags: document.getElementById('quiz-selected-movies'),
  quizBtn: document.getElementById('generate-quiz-btn'),
};

// ---------------------------------------------------------------------------
// Theme (persisted in localStorage)
// ---------------------------------------------------------------------------
function applyTheme(isDark) {
  document.body.classList.toggle('light-mode', !isDark);
  document.body.classList.toggle('dark-mode', isDark);
  el.themeToggle.checked = isDark;
  localStorage.setItem('midnightflix-theme', isDark ? 'dark' : 'light');
}

(function initTheme() {
  const saved = localStorage.getItem('midnightflix-theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved ? saved === 'dark' : (saved === null ? true : prefersDark));
})();

el.themeToggle.addEventListener('change', (e) => applyTheme(e.target.checked));

// ---------------------------------------------------------------------------
// Settings drawer
// ---------------------------------------------------------------------------
function openDrawer() {
  el.settingsPanel.classList.add('open');
  el.drawerOverlay.classList.add('open');
}
function closeDrawer() {
  el.settingsPanel.classList.remove('open');
  el.drawerOverlay.classList.remove('open');
}
el.settingsBtn.addEventListener('click', openDrawer);
el.closeSettings.addEventListener('click', closeDrawer);
el.drawerOverlay.addEventListener('click', closeDrawer);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function starIconSVG() {
  return '<svg viewBox="0 0 20 20"><path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6L1.3 7.7l6.1-.6z"/></svg>';
}

async function tmdbFetch(path, params = {}) {
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('include_adult', 'false');
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB request failed (${res.status})`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Populate filters
// ---------------------------------------------------------------------------
async function loadGenres() {
  try {
    const data = await tmdbFetch('/genre/movie/list');
    const optionsContainer = el.genreFilter.querySelector('.custom-options');
    data.genres.forEach((g) => {
      state.genreMap[g.id] = g.name;
      const opt = document.createElement('div');
      opt.className = 'custom-option';
      opt.setAttribute('data-value', g.id);
      opt.textContent = g.name;
      optionsContainer.appendChild(opt);
    });
  } catch (err) {
    console.error('Could not load genres:', err);
  }
}

function loadYears() {
  const current = new Date().getFullYear();
  const optionsContainer = el.yearFilter.querySelector('.custom-options');
  for (let y = current; y >= 2000; y--) {
    const opt = document.createElement('div');
    opt.className = 'custom-option';
    opt.setAttribute('data-value', y);
    opt.textContent = y;
    optionsContainer.appendChild(opt);
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function renderSkeletons(count = 12) {
  el.grid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'skeleton-card';
    el.grid.appendChild(s);
  }
}

function renderEmpty(message = 'No movies found', hint = 'Try a different search or loosen your filters.') {
  el.grid.innerHTML = `
    <div class="empty-state">
      <h3>${message}</h3>
      <p>${hint}</p>
    </div>`;
}

function renderError() {
  el.grid.innerHTML = `
    <div class="error-state">
      <h3>Something went wrong</h3>
      <p>Check your TMDB API key in script.js, then refresh.</p>
    </div>`;
}

function renderMovies(movies) {
  el.grid.innerHTML = '';
  if (!movies.length) {
    renderEmpty();
    return;
  }
  movies.forEach((movie, i) => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.style.animationDelay = `${Math.min(i, 12) * 40}ms`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    const year = (movie.release_date || '').slice(0, 4) || '—';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const poster = movie.poster_path ? IMG_POSTER + movie.poster_path : '';

    card.innerHTML = `
      <div class="card-img-wrap">
        ${poster ? `<img class="card-img" src="${poster}" alt="${movie.title} poster" loading="lazy">` : `<div class="skeleton-card" style="border-radius:0;"></div>`}
        <div class="card-vignette"></div>
        <div class="rating-seal">${starIconSVG()}${rating}</div>
        <div class="card-overlay">
          <div class="card-title">${movie.title}</div>
          <div class="card-meta"><span>${year}</span></div>
          <div class="card-title-underline"></div>
        </div>
      </div>`;

    const open = () => openDetails(movie.id);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });

    el.grid.appendChild(card);
  });
}

function updatePagination() {
  el.prevBtn.classList.toggle('hidden', state.page <= 1);
  el.nextBtn.classList.toggle('hidden', state.page >= state.totalPages);
  el.pageIndicator.textContent = state.totalPages > 1 ? `Page ${state.page} of ${Math.min(state.totalPages, 500)}` : '';
}

// ---------------------------------------------------------------------------
// Fetch + orchestrate
// ---------------------------------------------------------------------------
async function fetchMovies() {
  renderSkeletons();
  el.searchSpinner.classList.add('active');

  try {
    let data;
    if (state.query.trim()) {
      data = await tmdbFetch('/search/movie', {
        query: state.query.trim(),
        page: state.page,
        primary_release_year: state.year,
        region: 'IN',
      });
      // client-side refine for filters the search endpoint doesn't support
      let results = data.results || [];
      if (state.genre) results = results.filter((m) => m.genre_ids && m.genre_ids.includes(Number(state.genre)));
      if (state.rating) results = results.filter((m) => m.vote_average >= Number(state.rating));
      if (state.language) {
        const targetLangs = state.language.split('|');
        results = results.filter((m) => targetLangs.includes(m.original_language));
      } else if (state.cinema === 'bollywood') {
        results = results.filter((m) => m.original_language === 'hi');
      } else if (state.cinema === 'south') {
        const southLangs = ['te', 'ta', 'ml', 'kn'];
        results = results.filter((m) => southLangs.includes(m.original_language));
      } else if (state.cinema === 'hollywood') {
        results = results.filter((m) => m.original_language === 'en');
      }
      state.totalPages = data.total_pages || 1;
      renderMovies(results);
    } else {
      const params = {
        page: state.page,
        sort_by: 'popularity.desc',
        with_genres: state.genre,
        primary_release_year: state.year,
        'vote_average.gte': state.rating,
        region: 'IN',
      };

      if (state.language) {
        params.with_original_language = state.language;
        if (state.language === 'hi' || state.language.includes('te')) {
          params.with_origin_country = 'IN';
        }
      } else {
        if (state.cinema === 'indian') {
          params.with_origin_country = 'IN';
        } else if (state.cinema === 'bollywood') {
          params.with_original_language = 'hi';
          params.with_origin_country = 'IN';
        } else if (state.cinema === 'south') {
          params.with_original_language = 'te|ta|ml|kn';
          params.with_origin_country = 'IN';
        } else if (state.cinema === 'hollywood') {
          params.with_original_language = 'en';
        }
      }

      data = await tmdbFetch('/discover/movie', params);
      state.totalPages = data.total_pages || 1;
      renderMovies(data.results || []);
    }
    updatePagination();
  } catch (err) {
    console.error(err);
    renderError();
  } finally {
    el.searchSpinner.classList.remove('active');
  }
}

const debouncedSearch = debounce(() => {
  state.page = 1;
  fetchMovies();
}, 500);

// ---------------------------------------------------------------------------
// Details modal
// ---------------------------------------------------------------------------
async function openDetails(id) {
  el.detailsBody.innerHTML = `<div style="padding:60px;text-align:center;color:var(--text-secondary);width:100%;">Loading…</div>`;
  el.detailsModal.classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    const movie = await tmdbFetch(`/movie/${id}`, { append_to_response: 'credits,videos,watch/providers,recommendations' });
    const poster = movie.poster_path ? IMG_POSTER + movie.poster_path : '';
    const year = (movie.release_date || '').slice(0, 4) || '—';
    const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : '—';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const genres = (movie.genres || []).slice(0, 3).map((g) => `<span class="badge">${g.name}</span>`).join('');
    const cast = (movie.credits?.cast || []).slice(0, 5).map((c) => `
      <div class="cast-member">
        <img class="cast-img" src="${c.profile_path ? IMG_PROFILE + c.profile_path : 'https://placehold.co/58x58/14151d/8d90a3?text=%3F'}" alt="${c.name}" loading="lazy">
        <span class="cast-name">${c.name}</span>
      </div>`).join('');

    const trailer = (movie.videos?.results || []).find((v) => v.site === 'YouTube' && v.type === 'Trailer')
      || (movie.videos?.results || []).find((v) => v.site === 'YouTube');

    // Parse Watch Providers (prioritize India OTT)
    const providersData = movie['watch/providers']?.results;
    let regionData = null;
    if (providersData) {
      regionData = providersData.IN || providersData.US || Object.values(providersData)[0];
    }

    const flatrate = regionData?.flatrate || [];
    let watchProvidersHTML = '';
    
    if (flatrate.length > 0) {
      const providerItems = flatrate.map((p) => `
        <a class="provider-item" href="${regionData.link}" target="_blank" rel="noopener" title="Stream on ${p.provider_name}">
          <img class="provider-logo" src="${IMG_PROVIDER + p.logo_path}" alt="${p.provider_name}">
          <span>${p.provider_name}</span>
        </a>
      `).join('');
      
      watchProvidersHTML = `
        <div class="details-providers">
          <div class="section-label">Where to watch</div>
          <div class="providers-list">${providerItems}</div>
        </div>
      `;
    } else if (regionData?.link) {
      watchProvidersHTML = `
        <div class="details-providers">
          <div class="section-label">Where to watch</div>
          <div class="providers-list">
            <a class="provider-item" href="${regionData.link}" target="_blank" rel="noopener" style="padding-left: 12px;">
              <span class="material-symbols-outlined" style="font-size:16px;">info</span>
              <span>Watch options available</span>
            </a>
          </div>
        </div>
      `;
    }

    // Parse Recommendations
    const recs = (movie.recommendations?.results || []).slice(0, 10);
    let recsHTML = '';
    if (recs.length > 0) {
      const recCards = recs.map(r => `
        <a class="rec-card" onclick="openDetails('${r.id}')">
          <img src="${r.poster_path ? IMG_POSTER + r.poster_path : 'https://placehold.co/130x195/14151d/8d90a3?text=?'}" alt="${r.title.replace(/"/g, '&quot;')}">
          <span class="rec-title">${r.title}</span>
        </a>
      `).join('');
      
      recsHTML = `
        <div class="modal-recommendations">
          <h3>More Like This</h3>
          <div class="recommendations-scroll">
            ${recCards}
          </div>
        </div>
      `;
    }

    el.detailsBody.innerHTML = `
      ${poster ? `<img class="details-poster" src="${poster}" alt="${movie.title.replace(/"/g, '&quot;')} poster">` : ''}
      <div class="details-info">
        <div class="details-title">${movie.title}</div>
        <div class="details-meta">
          <span class="rating-inline">${starIconSVG()}${rating}</span>
          <span>${year}</span>
          <span>·</span>
          <span>${runtime}</span>
        </div>
        <div class="details-meta">${genres}</div>
        <div>
          <div class="section-label">Overview</div>
          <p class="details-overview">${movie.overview || 'No overview available.'}</p>
        </div>
        ${cast ? `<div>
          <div class="section-label">Top cast</div>
          <div class="details-cast">${cast}</div>
        </div>` : ''}
        ${watchProvidersHTML}
        <div class="details-actions">
          <button class="btn primary" id="watch-trailer-btn" ${trailer ? '' : 'disabled'}>
            <span class="material-symbols-outlined" style="font-size:18px;">play_arrow</span> Watch trailer
          </button>
          <a class="btn" href="${movie.homepage || `https://www.themoviedb.org/movie/${movie.id}`}" target="_blank" rel="noopener">
            <span class="material-symbols-outlined" style="font-size:18px;">open_in_new</span> Watch movie
          </a>
        </div>
        ${recsHTML}
      </div>`;

    document.getElementById('watch-trailer-btn')?.addEventListener('click', () => {
      if (trailer) openTrailer(trailer.key);
    });
  } catch (err) {
    console.error(err);
    el.detailsBody.innerHTML = `<div style="padding:60px;text-align:center;width:100%;">Couldn't load details. Please try again.</div>`;
  }
}

function closeDetails() {
  el.detailsModal.classList.remove('open');
  document.body.style.overflow = '';
}

// ---------------------------------------------------------------------------
// Trailer modal
// ---------------------------------------------------------------------------
function openTrailer(youtubeKey) {
  el.trailerBody.innerHTML = `
    <div class="aperture">
      <svg viewBox="0 0 100 100">
        ${Array.from({ length: 6 }).map((_, i) => `<rect class="blade" x="46" y="4" width="8" height="40" rx="2" transform="rotate(${i * 60} 50 50)"/>`).join('')}
      </svg>
    </div>`;
  el.trailerModal.classList.add('open');
  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    el.trailerBody.innerHTML = `<iframe src="${YOUTUBE_EMBED}${youtubeKey}?autoplay=1&rel=0" title="Trailer" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  }, 300);
}

function closeTrailer() {
  el.trailerModal.classList.remove('open');
  el.trailerBody.innerHTML = '';
  document.body.style.overflow = '';
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------
el.searchInput.addEventListener('input', (e) => {
  state.query = e.target.value;
  debouncedSearch();
});

// Custom Dropdown Logic
document.addEventListener('click', (e) => {
  if (!e.target.closest('.custom-select-wrapper')) {
    document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
  }
});

[el.genreFilter, el.yearFilter, el.ratingFilter, el.langFilter].forEach((wrapper) => {
  if (!wrapper) return;
  const trigger = wrapper.querySelector('.custom-select-trigger');
  
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = wrapper.classList.contains('open');
    document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
    if (!isOpen) wrapper.classList.add('open');
  });

  wrapper.addEventListener('click', (e) => {
    const option = e.target.closest('.custom-option');
    if (option) {
      wrapper.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      trigger.textContent = option.textContent;
      trigger.setAttribute('data-value', option.getAttribute('data-value'));
      wrapper.classList.remove('open');
      
      const key = wrapper.getAttribute('data-key');
      if (key) state[key] = option.getAttribute('data-value');
      state.page = 1;
      fetchMovies();
    }
  });
});

el.prevBtn.addEventListener('click', () => {
  if (state.page > 1) {
    state.page--;
    fetchMovies();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

el.nextBtn.addEventListener('click', () => {
  if (state.page < state.totalPages) {
    state.page++;
    fetchMovies();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

document.querySelectorAll('.close-modal').forEach((btn) => {
  btn.addEventListener('click', () => {
    closeDetails();
    closeTrailer();
  });
});

[el.detailsModal, el.trailerModal].forEach((modal) => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) { closeDetails(); closeTrailer(); }
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeDetails(); closeTrailer(); closeDrawer(); }
});

// ---------------------------------------------------------------------------
// Rec Engine: Tabs & Regional Cinema Filters
// ---------------------------------------------------------------------------
el.tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // UI Update
    el.tabs.forEach(t => t.classList.remove('active'));
    el.tabContents.forEach(c => c.classList.remove('active', 'hidden'));
    tab.classList.add('active');
    
    const target = tab.getAttribute('data-target');
    el.tabContents.forEach(c => {
      if (c.id === target) {
        c.classList.add('active');
      } else {
        c.classList.add('hidden');
      }
    });

    state.currentMode = target.split('-')[0];
    
    // Logic update
    el.resultsTitle.classList.add('hidden');
    if (state.currentMode === 'browse') {
      const cinema = tab.getAttribute('data-cinema') || 'indian';
      state.cinema = cinema;

      // Reset specific language filter dropdown when switching cinema
      state.language = '';
      const langTrigger = el.langFilter?.querySelector('.custom-select-trigger');
      if (langTrigger) {
        langTrigger.textContent = 'All languages';
        langTrigger.setAttribute('data-value', '');
        el.langFilter?.querySelectorAll('.custom-option').forEach((opt, idx) => {
          opt.classList.toggle('selected', idx === 0);
        });
      }

      state.page = 1;
      fetchMovies();
    } else if (state.currentMode === 'mood') {
      el.grid.innerHTML = '';
      updatePagination(true);
    } else if (state.currentMode === 'quiz') {
      el.grid.innerHTML = '';
      updatePagination(true);
      if (state.quizSelectedMovies.length > 0) {
        el.quizBtn.disabled = false;
      }
    }
  });
});

// Helper for Recs pagination hiding
function updatePagination(forceHide = false) {
  if (forceHide) {
    el.prevBtn.classList.add('hidden');
    el.nextBtn.classList.add('hidden');
    el.pageIndicator.textContent = '';
    return;
  }
  el.prevBtn.classList.toggle('hidden', state.page <= 1);
  el.nextBtn.classList.toggle('hidden', state.page >= state.totalPages);
  el.pageIndicator.textContent = state.totalPages > 1 ? `Page ${state.page} of ${Math.min(state.totalPages, 500)}` : '';
}

// ---------------------------------------------------------------------------
// Rec Engine: Moods
// ---------------------------------------------------------------------------
const moodConfigs = {
  'mind-bending': { genres: '878,9648,53', sort: 'popularity.desc' }, // Sci-Fi, Mystery, Thriller
  'adrenaline': { genres: '28,12', sort: 'popularity.desc' }, // Action, Adventure
  'feel-good': { genres: '35,10749', sort: 'popularity.desc' }, // Comedy, Romance
  'dark-gritty': { genres: '27,80', sort: 'popularity.desc' }, // Horror, Crime
  'classic-hits': { genres: '', sort: 'vote_average.desc', 'vote_count.gte': 40, 'vote_average.gte': 7.2 } 
};

el.moodCards.forEach(card => {
  card.addEventListener('click', async () => {
    const mood = card.getAttribute('data-mood');
    const config = moodConfigs[mood];
    const title = card.querySelector('.mood-title').textContent;
    
    el.resultsTitle.textContent = `Recommended for: ${title}`;
    el.resultsTitle.classList.remove('hidden');
    
    renderSkeletons();
    
    try {
      const params = {
        page: 1,
        sort_by: config.sort,
        with_genres: config.genres,
        region: 'IN'
      };
      if (config['vote_count.gte']) params['vote_count.gte'] = config['vote_count.gte'];
      if (config['vote_average.gte']) params['vote_average.gte'] = config['vote_average.gte'];
      
      if (state.cinema === 'bollywood') {
        params.with_original_language = 'hi';
        params.with_origin_country = 'IN';
      } else if (state.cinema === 'south') {
        params.with_original_language = 'te|ta|ml|kn';
        params.with_origin_country = 'IN';
      } else if (state.cinema === 'hollywood') {
        params.with_original_language = 'en';
      } else {
        params.with_origin_country = 'IN';
      }
      
      const data = await tmdbFetch('/discover/movie', params);
      renderMovies(data.results || []);
      updatePagination(true);
    } catch (e) {
      console.error(e);
      renderError();
    }
  });
});

// ---------------------------------------------------------------------------
// Rec Engine: Quiz
// ---------------------------------------------------------------------------
let quizDebounceTimer;
if (el.quizInput) {
  el.quizInput.addEventListener('input', (e) => {
    clearTimeout(quizDebounceTimer);
    const q = e.target.value.trim();
    if (!q) {
      el.quizDropdown.classList.add('hidden');
      return;
    }
    
    quizDebounceTimer = setTimeout(async () => {
      try {
        const data = await tmdbFetch('/search/movie', { query: q, page: 1, region: 'IN' });
        const results = (data.results || []).slice(0, 6);
        
        if (results.length > 0) {
          el.quizDropdown.innerHTML = results.map(m => `
            <div class="quiz-dropdown-item" data-id="${m.id}" data-title="${m.title.replace(/"/g, '&quot;')}">
              <img src="${m.poster_path ? IMG_PROFILE + m.poster_path : 'https://placehold.co/32x48/14151d/8d90a3?text=?'}" alt="poster">
              <span>${m.title} <small style="color:var(--text-secondary)">(${m.release_date?.slice(0,4)||'N/A'})</small></span>
            </div>
          `).join('');
          el.quizDropdown.classList.remove('hidden');
        } else {
          el.quizDropdown.classList.add('hidden');
        }
      } catch (err) {
        console.error(err);
      }
    }, 350);
  });
}

if (el.quizDropdown) {
  el.quizDropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.quiz-dropdown-item');
    if (item) {
      const id = item.getAttribute('data-id');
      const title = item.getAttribute('data-title');
      
      if (state.quizSelectedMovies.length < 3 && !state.quizSelectedMovies.find(m => m.id === id)) {
        state.quizSelectedMovies.push({ id, title });
        renderQuizTags();
      }
      
      el.quizInput.value = '';
      el.quizDropdown.classList.add('hidden');
    }
  });
}

function renderQuizTags() {
  el.quizTags.innerHTML = state.quizSelectedMovies.map(m => `
    <div class="selected-tag">
      ${m.title}
      <button onclick="removeQuizMovie('${m.id}')" aria-label="Remove ${m.title.replace(/"/g, '&quot;')}"><span class="material-symbols-outlined" style="font-size:16px;">close</span></button>
    </div>
  `).join('');
  el.quizBtn.disabled = state.quizSelectedMovies.length === 0;
}

window.removeQuizMovie = function(id) {
  state.quizSelectedMovies = state.quizSelectedMovies.filter(m => m.id !== id);
  renderQuizTags();
};

if (el.quizBtn) {
  el.quizBtn.addEventListener('click', async () => {
    if (state.quizSelectedMovies.length === 0) return;
    
    el.resultsTitle.textContent = `Curated for your playlist`;
    el.resultsTitle.classList.remove('hidden');
    renderSkeletons();
    
    try {
      // 1. Fetch complete metadata for each selected movie
      const detailPromises = state.quizSelectedMovies.map(m => 
        tmdbFetch(`/movie/${m.id}`, { append_to_response: 'credits,recommendations,similar' })
      );
      const movieDetails = await Promise.all(detailPromises);
      const selectedIds = new Set(state.quizSelectedMovies.map(m => Number(m.id)));
      
      // 2. Profile Analysis
      const langCounts = {};
      const genreCounts = {};
      const indianLanguages = new Set(['hi', 'te', 'ta', 'ml', 'kn', 'mr', 'bn', 'pa', 'gu']);
      let indianCount = 0;
      
      movieDetails.forEach(d => {
        const lang = d.original_language;
        langCounts[lang] = (langCounts[lang] || 0) + 1;
        if (indianLanguages.has(lang)) indianCount++;
        
        const countries = d.origin_country || (d.production_countries || []).map(c => c.iso_3166_1);
        if (countries.includes('IN')) indianCount++;
        
        (d.genres || []).forEach(g => {
          genreCounts[g.id] = (genreCounts[g.id] || 0) + 1;
        });
      });
      
      const isIndianProfile = indianCount >= movieDetails.length;
      const dominantLang = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'hi';
      const topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(e => e[0])
        .join(',');
      
      // 3. Multi-layer candidate retrieval
      const candidateMap = new Map();
      
      // A. Include TMDB native recommendations & similar
      movieDetails.forEach(d => {
        const tmdbRecs = [...(d.recommendations?.results || []), ...(d.similar?.results || [])];
        tmdbRecs.forEach(m => {
          if (!selectedIds.has(m.id)) {
            if (!candidateMap.has(m.id)) {
              candidateMap.set(m.id, { movie: m, sourceCount: 1, isDirectRec: true });
            } else {
              candidateMap.get(m.id).sourceCount++;
            }
          }
        });
      });
      
      // B. Smart Discover tailored to the cultural profile and genres
      const discoverPromises = [];
      if (isIndianProfile) {
        // High-rated Indian movies matching genres
        discoverPromises.push(
          tmdbFetch('/discover/movie', {
            with_genres: topGenres,
            with_origin_country: 'IN',
            with_original_language: dominantLang === 'hi' ? 'hi' : (indianLanguages.has(dominantLang) ? dominantLang : undefined),
            sort_by: 'vote_average.desc',
            'vote_count.gte': 25,
            region: 'IN',
            page: 1,
          })
        );
        // Popular Indian movies matching genres
        discoverPromises.push(
          tmdbFetch('/discover/movie', {
            with_genres: topGenres,
            with_origin_country: 'IN',
            sort_by: 'popularity.desc',
            region: 'IN',
            page: 1,
          })
        );
      } else {
        // Hollywood / Global discover in matching genres
        discoverPromises.push(
          tmdbFetch('/discover/movie', {
            with_genres: topGenres,
            with_original_language: 'en',
            sort_by: 'vote_average.desc',
            'vote_count.gte': 400,
            page: 1,
          })
        );
        discoverPromises.push(
          tmdbFetch('/discover/movie', {
            with_genres: topGenres,
            with_original_language: 'en',
            sort_by: 'popularity.desc',
            page: 1,
          })
        );
      }
      
      const discoverResponses = await Promise.all(discoverPromises);
      discoverResponses.forEach(res => {
        (res.results || []).forEach(m => {
          if (!selectedIds.has(m.id)) {
            if (!candidateMap.has(m.id)) {
              candidateMap.set(m.id, { movie: m, sourceCount: 1, isDiscover: true });
            } else {
              candidateMap.get(m.id).sourceCount += 1.5;
            }
          }
        });
      });
      
      // 4. Score and Rank Candidates
      const selectedGenreIds = new Set(Object.keys(genreCounts).map(Number));
      const scoredCandidates = [];
      
      candidateMap.forEach(({ movie, sourceCount, isDirectRec, isDiscover }) => {
        let score = 0;
        const isCandidateIndian = indianLanguages.has(movie.original_language);
        
        // Cultural consistency score
        if (isIndianProfile) {
          if (isCandidateIndian) {
            score += 70;
            if (movie.original_language === dominantLang) score += 25;
          } else if (movie.original_language === 'en') {
            score -= 75; // Heavily penalize Hollywood movies when user selected Indian/Bollywood movies
          }
        } else {
          if (movie.original_language === 'en') {
            score += 60;
          } else if (isCandidateIndian) {
            score -= 30;
          }
        }
        
        // Genre overlap score (+20 for each matching genre)
        const candidateGenres = movie.genre_ids || [];
        let matchingGenres = 0;
        candidateGenres.forEach(gid => {
          if (selectedGenreIds.has(gid)) matchingGenres++;
        });
        score += matchingGenres * 20;
        
        // Source boost
        score += sourceCount * 25;
        if (isDirectRec) score += 15;
        if (isDiscover) score += 20;
        
        // Rating & popularity boost
        if (movie.vote_average) score += movie.vote_average * 4;
        if (movie.popularity) score += Math.min(movie.popularity, 25);
        
        // Quality check: must have a poster and positive vote average
        if (movie.poster_path && movie.vote_average > 0) {
          scoredCandidates.push({ movie, score });
        }
      });
      
      scoredCandidates.sort((a, b) => b.score - a.score);
      const finalRecs = scoredCandidates.slice(0, 20).map(c => c.movie);
      
      renderMovies(finalRecs);
      updatePagination(true);
    } catch (err) {
      console.error(err);
      renderError();
    }
  });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
(async function init() {
  loadYears();
  await loadGenres();
  fetchMovies();
})();