/* ==========================================================================
   MidnightFlix — App Logic
   Powered by TMDB (https://www.themoviedb.org/documentation/api).

   ⚠️ Add your own free TMDB API key below before running:
      1. Create an account at https://www.themoviedb.org
      2. Go to Settings → API → request a free "Developer" key (v3 auth)
      3. Paste it into TMDB_API_KEY
   ========================================================================== */

const TMDB_API_KEY = 'b608fa72f7a0480576a94d846193263d';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_POSTER = 'https://image.tmdb.org/t/p/w500';
const IMG_PROFILE = 'https://image.tmdb.org/t/p/w185';
const IMG_PROVIDER = 'https://image.tmdb.org/t/p/w92';
const YOUTUBE_EMBED = 'https://www.youtube.com/embed/';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  query: '',
  genre: '',
  year: '',
  rating: '',
  language: '',
  page: 1,
  totalPages: 1,
  genreMap: {}, // id -> name
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
    data.genres.forEach((g) => {
      state.genreMap[g.id] = g.name;
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.name;
      el.genreFilter.appendChild(opt);
    });
  } catch (err) {
    console.error('Could not load genres:', err);
  }
}

function loadYears() {
  const current = new Date().getFullYear();
  for (let y = current; y >= 2000; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    el.yearFilter.appendChild(opt);
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
      });
      // client-side refine for filters the search endpoint doesn't support
      let results = data.results;
      if (state.genre) results = results.filter((m) => m.genre_ids.includes(Number(state.genre)));
      if (state.rating) results = results.filter((m) => m.vote_average >= Number(state.rating));
      if (state.language) results = results.filter((m) => m.original_language === state.language);
      state.totalPages = data.total_pages || 1;
      renderMovies(results);
    } else {
      data = await tmdbFetch('/discover/movie', {
        page: state.page,
        sort_by: 'popularity.desc',
        with_genres: state.genre,
        primary_release_year: state.year,
        'vote_average.gte': state.rating,
        with_original_language: state.language,
      });
      state.totalPages = data.total_pages || 1;
      renderMovies(data.results);
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
    const movie = await tmdbFetch(`/movie/${id}`, { append_to_response: 'credits,videos,watch/providers' });
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

    // Parse Watch Providers
    const providersData = movie['watch/providers']?.results;
    let regionData = null;
    if (providersData) {
      const preferredRegion = state.language === 'hi' ? 'IN' : 'US';
      regionData = providersData[preferredRegion] || providersData.IN || providersData.US || Object.values(providersData)[0];
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

    el.detailsBody.innerHTML = `
      ${poster ? `<img class="details-poster" src="${poster}" alt="${movie.title} poster">` : ''}
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

[el.genreFilter, el.yearFilter, el.ratingFilter, el.langFilter].forEach((select) => {
  select.addEventListener('change', () => {
    state.genre = el.genreFilter.value;
    state.year = el.yearFilter.value;
    state.rating = el.ratingFilter.value;
    state.language = el.langFilter.value;
    state.page = 1;
    fetchMovies();
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
// Init
// ---------------------------------------------------------------------------
(async function init() {
  loadYears();
  await loadGenres();
  fetchMovies();
})();