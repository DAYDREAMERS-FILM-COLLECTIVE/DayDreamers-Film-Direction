/**
 * js/modules/admin/movies.js
 * Movie catalogue management: listing, adding, and removing scheduled films.
 */

import { getAuthHeaders } from './auth.js';

let allMovies = [];

export function getMovies() {
  return allMovies;
}

export function toggleAddMovieForm() {
  const form = document.getElementById('addMovieForm');
  if (form) {
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  }
}

export const renderFilmCatalogue = loadMovies;

export async function loadMovies() {
  const tbody = document.getElementById('moviesList');
  if (!tbody) return [];

  try {
    const res = await fetch('/api/movies');
    allMovies = await res.json();

    tbody.innerHTML = '';
    if (!allMovies || !allMovies.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--muted);">No films currently in schedule</td></tr>';
      return allMovies;
    }

    allMovies.forEach(m => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600; color: #fff;">${m.title}</td>
        <td style="color: var(--muted);">${m.director}</td>
        <td><span class="status-badge status-pending">${m.genre}</span></td>
        <td>${m.runtime}</td>
        <td style="color: var(--muted);">${m.hall}</td>
        <td style="text-align: right;">
          <button class="btn btn-danger" data-action="delete-movie" data-movie-id="${m.id}">Remove</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    return allMovies;
  } catch (err) {
    console.error('Failed to load movies:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--danger);">Error loading movies: ${err.message}</td></tr>`;
    return [];
  }
}

export async function deleteMovie(id) {
  if (!id) return;
  if (!confirm('Are you sure you want to remove this film from the schedule?')) return;

  try {
    const res = await fetch(`/api/movies/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (res.ok) {
      await loadMovies();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Failed to delete movie');
    }
  } catch (err) {
    alert('Error deleting movie: ' + err.message);
  }
}

export async function handleAddMovieSubmit(e) {
  if (e) e.preventDefault();

  const title = (document.getElementById('newTitle')?.value || '').trim();
  const director = (document.getElementById('newDir')?.value || '').trim();
  const genre = (document.getElementById('newGenre')?.value || '').trim();
  const runtime = (document.getElementById('newRuntime')?.value || '').trim();
  const hall = (document.getElementById('newHall')?.value || '').trim();
  const poster_url = (document.getElementById('newPoster')?.value || '').trim();
  const blurb = (document.getElementById('newBlurb')?.value || '').trim();

  const payload = {
    title,
    director,
    genre,
    runtime,
    hall,
    poster_url,
    blurb
  };

  try {
    const res = await fetch('/api/movies', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      toggleAddMovieForm();
      const formEl = document.getElementById('newMovieForm');
      if (formEl) formEl.reset();
      await loadMovies();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Failed to add movie');
    }
  } catch (err) {
    alert('Network error: ' + err.message);
  }
}

export function initMovies() {
  const form = document.getElementById('newMovieForm');
  if (form) {
    form.removeEventListener('submit', handleAddMovieSubmit);
    form.addEventListener('submit', handleAddMovieSubmit);
  }
  return loadMovies();
}
