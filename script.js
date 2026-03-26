// UI State and Theme
const themeToggle = document.getElementById('theme-toggle');
const themeSwitch = document.getElementById('theme-switch');
const authTabs = document.querySelectorAll('[data-auth-tab]');
const authPanels = document.querySelectorAll('[data-auth-panel]');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const logoutBtn = document.getElementById('logout-btn');

function setTheme(mode) {
  document.body.dataset.theme = mode;
  localStorage.setItem('theme', mode);
  if (themeSwitch) {
    themeSwitch.checked = mode === 'dark';
  }
}

function toggleTheme() {
  const current = document.body.dataset.theme === 'dark' ? 'dark' : 'light';
  setTheme(current === 'dark' ? 'light' : 'dark');
}

function setAuth(isAuthenticated) {
  document.body.classList.toggle('is-authenticated', isAuthenticated);
  localStorage.setItem('auth', isAuthenticated ? 'true' : 'false');
}

const storedTheme = localStorage.getItem('theme');
if (storedTheme) {
  setTheme(storedTheme);
} else {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(prefersDark ? 'dark' : 'light');
}

const storedAuth = localStorage.getItem('auth') === 'true';
setAuth(storedAuth);

authTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    authTabs.forEach((btn) => btn.classList.remove('is-active'));
    tab.classList.add('is-active');
    const target = tab.dataset.authTab;
    authPanels.forEach((panel) => {
      panel.classList.toggle('is-hidden', panel.dataset.authPanel !== target);
    });
  });
});

if (loginForm) {
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    setAuth(true);
    document.getElementById('app')?.scrollIntoView({ behavior: 'smooth' });
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', (event) => {
    event.preventDefault();
    setAuth(true);
    document.getElementById('app')?.scrollIntoView({ behavior: 'smooth' });
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    setAuth(false);
    localStorage.removeItem('isGuest');
  });
}

// Guest login buttons
const guestLoginBtn = document.getElementById('guest-login-btn');
const guestSignupBtn = document.getElementById('guest-signup-btn');

function loginAsGuest() {
  localStorage.setItem('isGuest', 'true');
  setAuth(true);
  document.getElementById('app')?.scrollIntoView({ behavior: 'smooth' });
}

if (guestLoginBtn) {
  guestLoginBtn.addEventListener('click', loginAsGuest);
}

if (guestSignupBtn) {
  guestSignupBtn.addEventListener('click', loginAsGuest);
}

if (themeToggle) {
  themeToggle.addEventListener('click', toggleTheme);
}

if (themeSwitch) {
  themeSwitch.addEventListener('change', () => {
    setTheme(themeSwitch.checked ? 'dark' : 'light');
  });
}

// API and URL Setup
const apiKey = '7cada1bc35d7234ffd9cfdc59a01f791';
const baseUrl = 'https://api.themoviedb.org/3/';
const genreUrl = `${baseUrl}genre/movie/list?api_key=${apiKey}&language=en-US`; // Fetch genres
const randomMoviesUrl = `${baseUrl}discover/movie?api_key=${apiKey}&language=en-US&page=1`; // Fetch random movies
const popularMoviesUrl = `${baseUrl}movie/popular?api_key=${apiKey}&language=en-US&page=1`; // Fetch popular movies

// Elements
const movieInput = document.getElementById('movie-input');
const searchButton = document.getElementById('search-btn');
const recommendationsDiv = document.getElementById('recommendations');
const genreFilter = document.getElementById('genre-filter');
const yearFilter = document.getElementById('year-filter');
const ratingFilter = document.getElementById('rating-filter');
const languageFilter = document.getElementById('language-filter');
const loadingSpinner = document.getElementById('loading-spinner');
const prevButton = document.getElementById('prev-btn');
const nextButton = document.getElementById('next-btn');

// Variables for pagination
let currentPage = 1;
let totalPages = 1;

// Load genres and populate genre filter
async function loadGenres() {
  try {
    const response = await fetch(genreUrl);
    const data = await response.json();
    const genres = data.genres;

    genres.forEach((genre) => {
      const option = document.createElement('option');
      option.value = genre.id;
      option.textContent = genre.name;
      genreFilter.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading genres:', error);
  }
}

// Fetch and display popular movies
async function fetchPopularMovies() {
  try {
    loadingSpinner.style.display = 'block';
    const response = await fetch(`${popularMoviesUrl}&page=${currentPage}`);
    const data = await response.json();
    totalPages = data.total_pages;

    displayMovies(data.results);
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    recommendationsDiv.innerHTML = '<p>No results found. Please try again.</p>';
  } finally {
    loadingSpinner.style.display = 'none';
  }
}

// Fetch movies based on filters and search
async function searchMovies() {
  const query = movieInput.value.trim();
  const genre = genreFilter.value;
  const year = yearFilter.value;
  const rating = ratingFilter.value;
  const language = languageFilter.value || 'en-US';

  let url = `${baseUrl}discover/movie?api_key=${apiKey}&language=${language}&page=${currentPage}`;

  if (query) {
    url = `${baseUrl}search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=${language}&page=${currentPage}`;
  }

  if (genre) url += `&with_genres=${genre}`;
  if (year) url += `&primary_release_year=${year}`;
  if (rating) url += `&vote_average.gte=${rating}`;

  try {
    loadingSpinner.style.display = 'block';
    const response = await fetch(url);
    const data = await response.json();
    totalPages = data.total_pages;

    displayMovies(data.results);
  } catch (error) {
    console.error('Error fetching movies:', error);
    recommendationsDiv.innerHTML = '<p>No results found. Please try again.</p>';
  } finally {
    loadingSpinner.style.display = 'none';
  }
}

// Display movie results
function displayMovies(movies) {
  if (!movies || movies.length === 0) {
    recommendationsDiv.innerHTML = '<p>No movies found. Try something else.</p>';
    return;
  }

  recommendationsDiv.innerHTML = '';

  movies.forEach((movie) => {
    const movieCard = document.createElement('div');
    movieCard.classList.add('movie-card');

    const movieImage = movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : 'https://via.placeholder.com/500x750?text=No+Image';

    movieCard.innerHTML = `
      <img src="${movieImage}" alt="${movie.title}">
      <h3>${movie.title}</h3>
      <p class="rating">Rating: ${movie.vote_average}</p>
      <button onclick="openMovieDetails('${movie.id}')">View Details</button>
      <button onclick="openMoviePage('${movie.id}')">Open Movie</button>
      <button onclick="playTrailer('${movie.id}')">Play Trailer</button>
    `;

    recommendationsDiv.appendChild(movieCard);
  });

  prevButton.style.display = currentPage > 1 ? 'inline-block' : 'none';
  nextButton.style.display = currentPage < totalPages ? 'inline-block' : 'none';
}

// Open movie page on Vegamovies
function openMoviePage(movieId) {
  const vegamoviesUrl = `https://www.vegamovies.com/movie/${movieId}`;
  window.open(vegamoviesUrl, '_blank');
}

// Fetch and show movie details
async function openMovieDetails(movieId) {
  try {
    const response = await fetch(`${baseUrl}movie/${movieId}?api_key=${apiKey}&language=en-US`);
    const data = await response.json();

    const movieDetailsModal = document.getElementById('movie-details-modal');
    const movieDetailsContent = document.getElementById('movie-details-content');

    movieDetailsContent.innerHTML = `
      <h2>${data.title}</h2>
      <img src="https://image.tmdb.org/t/p/w500${data.poster_path}" alt="${data.title}" class="movie-poster">
      <p><strong>Release Date:</strong> ${data.release_date}</p>
      <p><strong>Rating:</strong> ${data.vote_average}</p>
      <p><strong>Overview:</strong> ${data.overview}</p>
      <p><strong>Genres:</strong> ${data.genres.map((g) => g.name).join(', ')}</p>
      <p><strong>Cast:</strong> ${await getCast(movieId)}</p>
      <button onclick="closeMovieDetails()">Close</button>
    `;

    movieDetailsModal.style.display = 'block';
  } catch (error) {
    console.error('Error fetching movie details:', error);
  }
}

// Fetch and display movie cast
async function getCast(movieId) {
  try {
    const response = await fetch(`${baseUrl}movie/${movieId}/credits?api_key=${apiKey}`);
    const data = await response.json();
    return data.cast.slice(0, 5).map((actor) => actor.name).join(', ');
  } catch (error) {
    console.error('Error fetching cast:', error);
    return 'Not available';
  }
}

// Close movie details modal
function closeMovieDetails() {
  document.getElementById('movie-details-modal').style.display = 'none';
}

// Fetch and play movie trailer
async function playTrailer(movieId) {
  try {
    const response = await fetch(`${baseUrl}movie/${movieId}/videos?api_key=${apiKey}`);
    const data = await response.json();
    const trailer = data.results.find((video) => video.site === 'YouTube' && video.type === 'Trailer');

    if (trailer && trailer.key) {
      const videoUrl = `https://www.youtube.com/embed/${trailer.key}`;
      document.getElementById('movie-trailer').innerHTML = `
        <iframe width="560" height="315" src="${videoUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
      `;
      document.getElementById('trailer-modal').style.display = 'block';
    } else {
      alert('Trailer not available for this movie.');
    }
  } catch (error) {
    console.error('Error fetching trailer:', error);
    alert('Could not fetch trailer.');
  }
}

// Close trailer modal
function closeTrailer() {
  document.getElementById('trailer-modal').style.display = 'none';
}

// Event listeners for search and filters
searchButton.addEventListener('click', () => {
  currentPage = 1;
  recommendationsDiv.innerHTML = '';
  searchMovies();
});

movieInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    currentPage = 1;
    recommendationsDiv.innerHTML = '';
    searchMovies();
  }
});

// Pagination buttons
prevButton.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    fetchPopularMovies();
  }
});

nextButton.addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage++;
    fetchPopularMovies();
  }
});

// Initialize
loadGenres();
fetchPopularMovies();