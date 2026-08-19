# MidnightFlix - Frontend Architecture & Features

> **"The website must be very responsive and have smooth modern transitions."**

## Overview
MidnightFlix is a smart movie discovery web application built using standard web technologies (HTML, CSS, Vanilla JavaScript). It interfaces with the TMDB (The Movie Database) API to fetch and display movie data dynamically. 

## Technology Stack
- **Structure:** HTML5
- **Styling:** Custom CSS3 with CSS Variables for theming (No external CSS frameworks)
- **Logic:** Vanilla JavaScript (ES6+)
- **Icons & Typography:** Google Fonts ('Inter') and Material Symbols Outlined

## UI Components & Features

### 1. Navigation & Settings
- **Top Navigation Bar:** Sticky top nav with a glassmorphism effect (`backdrop-filter: blur`).
- **Settings Drawer:** A slide-out panel on the right side for user preferences.
- **Dark/Light Mode Theme Toggle:** A custom toggle switch in the settings drawer. The user's preference is saved in the browser's `localStorage` to persist across sessions.

### 2. Search & Filtering System
- **Real-time Search:** A text input with a 500ms debounce that searches the TMDB API.
- **Dynamic Filters:** Dropdowns that update the movie grid on change.
  - **Genre:** Dynamically fetched from TMDB API.
  - **Year:** Auto-generated from the year 2000 to the current year.
  - **Rating:** Filter by minimum vote average (5+ to 9+).
  - **Language:** Filter by English (en-US) or Hindi (hi-IN).

### 3. Movie Grid (Netflix-style)
- **Responsive Layout:** CSS Grid layout that scales from 2 columns on mobile devices up to 6 columns on ultra-wide screens (>1500px).
- **Skeleton Loaders:** Displays animated skeleton placeholders while data is being fetched.
- **Movie Cards:** 
  - Aspect ratio of 2:3 for standard movie posters.
  - **Hover Effects:** Smooth scale transformation (`transform: scale(1.05)`) with an enhanced drop shadow and a gradient overlay revealing the movie title and rating.

### 4. Modals & Interactions
- **Movie Details Modal:** 
  - Opens on movie card click with a smooth zoom-in animation.
  - Displays: Full poster, title, release year, runtime, star rating, genre badges, overview, and top 5 cast members (with profile pictures).
  - Action Buttons: "Watch Trailer" and "Watch Movie".
- **Trailer Modal:** 
  - Overlays the screen to play the official YouTube trailer using an embedded iframe (`autoplay=1`).

### 5. Pagination
- Simple Next and Previous buttons at the bottom of the grid to navigate through pages of API results. They dynamically hide if on the first or last page.

## Styling & UX Requirements (Special Emphasis)
- **Responsiveness:** The app uses media queries extensively to adjust the grid layout, search bar, and modal directions (stacking vertically on mobile and horizontally on desktop).
- **Modern Transitions:** All interactive elements (buttons, hover states, modals, overlays, drawer) utilize smooth cubic-bezier transitions for a premium, native-app feel.
