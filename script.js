const q = (sel) => document.querySelector(sel);
const qa = (sel) => document.querySelectorAll(sel);

const api = 'b608fa72f7a0480576a94d846193263d';
const base = 'https://api.themoviedb.org/3';
let page = 1;
let total = 1;
let genres = {};

const els = {
  theme: q('#theme-toggle'),
  settingsBtn: q('#settings-btn'),
  settingsDrawer: q('#settings-panel'),
  closeSettings: q('#close-settings'),
  overlay: q('#drawer-overlay'),
  search: q('#search-input'),
  genre: q('#genre-filter'),
  year: q('#year-filter'),
  rating: q('#rating-filter'),
  lang: q('#lang-filter'),
  grid: q('#movie-grid'),
  prev: q('#prev-btn'),
  next: q('#next-btn'),
  details: q('#details-modal'),
  detailsBody: q('#details-body'),
  trailer: q('#trailer-modal'),
  trailerBody: q('#trailer-body')
};

function initTheme() {
  const isDark = localStorage.getItem('theme') === 'dark';
  document.body.className = isDark ? 'dark-mode' : 'light-mode';
  els.theme.checked = isDark;
}

els.theme.onchange = (e) => {
  const dark = e.target.checked;
  document.body.className = dark ? 'dark-mode' : 'light-mode';
  localStorage.setItem('theme', dark ? 'dark' : 'light');
};

const toggleDrawer = (show) => {
  els.settingsDrawer.classList.toggle('open', show);
  els.overlay.classList.toggle('open', show);
};

els.settingsBtn.onclick = () => toggleDrawer(true);
els.closeSettings.onclick = () => toggleDrawer(false);
els.overlay.onclick = () => toggleDrawer(false);

const closeModals = () => {
  els.details.classList.remove('open');
  els.trailer.classList.remove('open');
  els.trailerBody.innerHTML = '';
};

qa('.close-modal').forEach(b => b.onclick = closeModals);
els.details.onclick = (e) => { if(e.target === els.details) closeModals(); };
els.trailer.onclick = (e) => { if(e.target === els.trailer) closeModals(); };

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch(e) {
    return null;
  }
}

async function loadGenres() {
  const data = await fetchJson(`${base}/genre/movie/list?api_key=${api}`);
  if (data?.genres) {
    data.genres.forEach(g => {
      genres[g.id] = g.name;
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.name;
      els.genre.appendChild(opt);
    });
  }
}

function renderSkeletons() {
  els.grid.innerHTML = Array(20).fill(`
    <div class="movie-card skeleton"></div>
  `).join('');
}

function renderMovies(movies) {
  if (!movies || !movies.length) {
    els.grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">No movies found.</p>';
    return;
  }
  
  els.grid.innerHTML = movies.map(m => {
    const img = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image';
    const rating = m.vote_average ? m.vote_average.toFixed(1) : 'N/A';
    return `
      <div class="movie-card" onclick="openDetails(${m.id})">
        <div class="card-img-wrap">
          <img src="${img}" class="card-img" loading="lazy" alt="${m.title}" onload="this.style.opacity=1" style="opacity:0">
        </div>
        <div class="card-overlay">
          <div class="card-title">${m.title}</div>
          <div class="card-rating">
            <span class="material-symbols-outlined" style="font-size:16px; font-variation-settings:'FILL' 1;">star</span>
            ${rating}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function loadMovies() {
  renderSkeletons();
  
  const qStr = els.search.value.trim();
  const g = els.genre.value;
  const y = els.year.value;
  const r = els.rating.value;
  const l = els.lang.value || 'en-US';
  
  let url = `${base}/discover/movie?api_key=${api}&language=${l}&page=${page}`;
  
  if (qStr) {
    url = `${base}/search/movie?api_key=${api}&query=${encodeURIComponent(qStr)}&language=${l}&page=${page}`;
  }
  
  if (g) url += `&with_genres=${g}`;
  if (y) url += `&primary_release_year=${y}`;
  if (r) url += `&vote_average.gte=${r}`;
  
  const data = await fetchJson(url);
  if (data) {
    total = data.total_pages;
    renderMovies(data.results);
    els.prev.classList.toggle('hidden', page <= 1);
    els.next.classList.toggle('hidden', page >= total);
  }
}

let debounceTimer;
els.search.oninput = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    page = 1;
    loadMovies();
  }, 500);
};

[els.genre, els.year, els.rating, els.lang].forEach(el => {
  el.onchange = () => { page = 1; loadMovies(); };
});

els.prev.onclick = () => { if(page > 1) { page--; loadMovies(); } };
els.next.onclick = () => { if(page < total) { page++; loadMovies(); } };

window.openDetails = async (id) => {
  const data = await fetchJson(`${base}/movie/${id}?api_key=${api}&language=en-US`);
  if (!data) return;
  
  const castData = await fetchJson(`${base}/movie/${id}/credits?api_key=${api}`);
  const cast = (castData?.cast || []).slice(0, 5).map(c => `
    <div class="cast-member">
      <img src="${c.profile_path ? 'https://image.tmdb.org/t/p/w185'+c.profile_path : 'https://via.placeholder.com/60'}" class="cast-img">
      <div class="cast-name">${c.name}</div>
    </div>
  `).join('');

  const img = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : 'https://via.placeholder.com/500x750';
  const year = data.release_date ? data.release_date.split('-')[0] : '';
  const gList = data.genres.map(g => `<span class="badge">${g.name}</span>`).join('');
  
  els.detailsBody.innerHTML = `
    <img src="${img}" class="details-poster">
    <div class="details-info">
      <h2 class="details-title">${data.title}</h2>
      <div class="details-meta">
        ${year ? `<span>${year}</span>` : ''}
        ${data.runtime ? `<span>${Math.floor(data.runtime/60)}h ${data.runtime%60}m</span>` : ''}
        <span style="color:#ffb347; display:flex; align-items:center; gap:2px;">
          <span class="material-symbols-outlined" style="font-size:16px; font-variation-settings:'FILL' 1;">star</span>
          ${data.vote_average.toFixed(1)}
        </span>
      </div>
      <div class="details-meta">${gList}</div>
      <p class="details-overview">${data.overview}</p>
      ${cast ? `<div class="details-cast">${cast}</div>` : ''}
      <div class="details-actions">
        <button class="btn primary" onclick="openTrailer(${id})">Watch Trailer</button>
        <button class="btn" onclick="window.open('https://www.vegamovies.com/movie/${id}', '_blank')">Watch Movie</button>
      </div>
    </div>
  `;
  els.details.classList.add('open');
};

window.openTrailer = async (id) => {
  const data = await fetchJson(`${base}/movie/${id}/videos?api_key=${api}`);
  const t = data?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer');
  if (t) {
    els.trailerBody.innerHTML = `<iframe src="https://www.youtube.com/embed/${t.key}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    els.details.classList.remove('open');
    els.trailer.classList.add('open');
  } else {
    alert('Trailer not available');
  }
};

(async function init() {
  initTheme();
  
  const ySel = els.year;
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= 2000; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    ySel.appendChild(opt);
  }
  
  await loadGenres();
  loadMovies();
})();