/**
 * js/modules/admin/movies.js
 * Enterprise Film Catalogue Management:
 * - Full catalog listing & real-time search
 * - Faceted filtering (Status: All/Active/Archived, Genre, Release Year)
 * - Multi-column sorting (Year, Date Added, Title, Status)
 * - Quick Screening State Controller (inline toggle switch: Available vs Archived)
 * - Checkbox multi-select & floating bulk actions bar (Mark Available, Archive, Delete)
 * - Bulk Ingest Engine: CSV & JSON parser (up to 10MB), dropzone, visual staging preview,
 *   validation warning flags (missing fields, malformed URLs, duplicate titles),
 *   and downloadable sample templates.
 */

import { getAuthHeaders } from './auth.js';
import { showToast } from './seat-locker.js';

// State Management
let allMovies = [];
let selectedMovieIds = new Set();
let searchQuery = '';
let currentStatusFilter = 'all'; // 'all' | 'active' | 'archived'
let currentGenreFilter = 'all';
let minYearFilter = null;
let maxYearFilter = null;
let currentSort = 'created_at_desc';
let currentPage = 1;
let totalFilmsCount = 0;
let totalPages = 1;
const pageSize = 25;
let searchDebounceTimer = null;

// Canonical Genre Standard
const CANONICAL_GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'Horror', 'Mystery', 'Romance',
  'Sci-Fi', 'Thriller', 'Western'
];

export function normalizeGenreName(raw) {
  if (!raw) return '';
  const clean = raw.trim().toLowerCase();
  if (clean.includes('sci') || clean.includes('fiction')) return 'Sci-Fi';
  if (clean.includes('doc')) return 'Documentary';
  if (clean.includes('rom')) return 'Romance';
  if (clean.includes('thril')) return 'Thriller';
  if (clean.includes('anim')) return 'Animation';
  if (clean.includes('com')) return 'Comedy';
  if (clean.includes('act')) return 'Action';
  if (clean.includes('adv')) return 'Adventure';
  if (clean.includes('dram')) return 'Drama';
  if (clean.includes('horr')) return 'Horror';
  if (clean.includes('myst')) return 'Mystery';
  if (clean.includes('crim')) return 'Crime';
  return raw.trim().replace(/\b\w/g, c => c.toUpperCase());
}

// Staging Engine State for Bulk Ingest
let stagingRecords = []; // { raw, normalized, valid, errors: [], isDuplicate, selected: boolean }
let activeIngestTab = 'upload';

export function getMovies() {
  return allMovies;
}

export function toggleAddMovieForm() {
  const form = document.getElementById('addMovieForm');
  if (form) {
    const isHidden = form.style.display === 'none' || !form.style.display;
    form.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      document.getElementById('newTitle')?.focus();
    }
  }
}

export const renderFilmCatalogue = loadMovies;

// =========================================================================
// 1. Core Catalog Loading & Server-Side Filtering / Pagination
// =========================================================================

export async function loadMovies(page = 1) {
  currentPage = page;
  const tbody = document.getElementById('moviesList');
  if (!tbody) return [];

  const params = new URLSearchParams();
  params.set('page', currentPage);
  params.set('limit', pageSize);
  params.set('paginate', 'true');

  if (searchQuery) params.set('search', searchQuery);
  if (currentStatusFilter !== 'all') params.set('status', currentStatusFilter);
  if (currentGenreFilter !== 'all') params.set('genre', currentGenreFilter);
  if (minYearFilter) params.set('minYear', minYearFilter);
  if (maxYearFilter) params.set('maxYear', maxYearFilter);

  // Sorting
  const [sortBy, sortOrder] = parseSort(currentSort);
  params.set('sortBy', sortBy);
  params.set('sortOrder', sortOrder);

  try {
    const res = await fetch(`/api/admin/movies?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    
    if (res.status === 401) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--danger); padding:24px;">Unauthorized. Please log in again.</td></tr>';
      return [];
    }

    const data = await res.json();
    if (data.movies && Array.isArray(data.movies)) {
      allMovies = data.movies;
      totalFilmsCount = data.total || data.movies.length;
      totalPages = data.totalPages || 1;
    } else if (Array.isArray(data)) {
      allMovies = data;
      totalFilmsCount = data.length;
      totalPages = 1;
    } else {
      allMovies = [];
      totalFilmsCount = 0;
      totalPages = 1;
    }

    populateGenreFilterOptions();
    updateStatusCounts();
    renderFilteredMovies();
    renderPaginationBar();
    return allMovies;
  } catch (err) {
    console.error('Failed to load movies:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--danger); padding:24px;">Error loading films: ${escapeHtml(err.message)}</td></tr>`;
    return [];
  }
}

function parseSort(sortKey) {
  switch (sortKey) {
    case 'created_at_asc': return ['created_at', 'asc'];
    case 'created_at_desc': return ['created_at', 'desc'];
    case 'title_asc': return ['title', 'asc'];
    case 'title_desc': return ['title', 'desc'];
    case 'year_desc': return ['year', 'desc'];
    case 'year_asc': return ['year', 'asc'];
    case 'status_desc': return ['status', 'desc'];
    default: return ['created_at', 'desc'];
  }
}

function updateStatusCounts() {
  const activeCount = allMovies.filter(m => m.is_active !== false).length;
  const archivedCount = allMovies.filter(m => m.is_active === false).length;

  const countAll = document.getElementById('countAllMovies');
  const countActive = document.getElementById('countActiveMovies');
  const countArchived = document.getElementById('countArchivedMovies');
  const subtitle = document.getElementById('catalogMetaSubtitle');

  if (countAll) countAll.textContent = totalFilmsCount;
  if (countActive) countActive.textContent = activeCount;
  if (countArchived) countArchived.textContent = archivedCount;
  if (subtitle) {
    subtitle.textContent = `${totalFilmsCount} total titles (${activeCount} currently active for screening schedule, ${archivedCount} archived)`;
  }
}

function populateGenreFilterOptions() {
  const select = document.getElementById('movieGenreFilter');
  if (!select) return;

  const currentVal = select.value || 'all';
  const genresSet = new Set(CANONICAL_GENRES);
  
  allMovies.forEach(m => {
    if (m.genre) {
      m.genre.split(',').forEach(g => {
        const norm = normalizeGenreName(g);
        if (norm) genresSet.add(norm);
      });
    }
  });

  const sortedGenres = Array.from(genresSet).sort();
  select.innerHTML = '<option value="all">All Genres</option>';
  sortedGenres.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.toLowerCase();
    opt.textContent = g;
    select.appendChild(opt);
  });

  select.value = currentVal;
}

export function renderFilteredMovies() {
  const tbody = document.getElementById('moviesList');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (!allMovies.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 36px 16px; color: var(--muted);">
          <div style="font-size: 1.1rem; margin-bottom: 6px;">No films match your search &amp; filter criteria</div>
          <button class="btn btn-xs btn-secondary" data-action="reset-movie-filters" style="margin-top: 8px;">Reset Filters</button>
        </td>
      </tr>
    `;
    updateBulkToolbar();
    return;
  }

  allMovies.forEach(m => {
    const isSelected = selectedMovieIds.has(m.id);
    const isActive = m.is_active !== false;
    const tr = document.createElement('tr');
    tr.className = isSelected ? 'row-selected' : '';
    tr.dataset.movieId = m.id;

    const posterSrc = m.poster_url || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800';

    tr.innerHTML = `
      <td style="text-align: center;">
        <input type="checkbox" class="movie-row-checkbox" data-movie-id="${m.id}" ${isSelected ? 'checked' : ''} />
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${escapeHtml(posterSrc)}" alt="${escapeHtml(m.title)}" class="movie-poster-thumb" onerror="this.src='https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800';" />
          <div>
            <div style="font-weight: 600; font-size: 0.95rem; color: #fff; line-height: 1.2; margin-bottom: 4px;">
              ${escapeHtml(m.title)}
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem;">
              <span style="color: var(--gold); font-family: monospace;">${m.year || '2024'}</span>
              <span class="status-badge" style="background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.3); font-size: 0.65rem; padding: 2px 6px;">${escapeHtml(m.rating || 'UA')}</span>
            </div>
          </div>
        </div>
      </td>
      <td>
        <div style="color: #e9d5ff; font-weight: 500;">${escapeHtml(m.director || 'Staff Selection')}</div>
        <div style="color: var(--muted); font-size: 0.75rem;">${escapeHtml(m.hall || 'D Block 3rd Floor')}</div>
      </td>
      <td>
        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
          ${(m.genre || 'Cinema').split(',').map(g => `<span class="status-badge status-pending" style="font-size: 0.7rem; padding: 2px 8px;">${escapeHtml(g.trim())}</span>`).join('')}
        </div>
      </td>
      <td style="font-family: monospace; font-size: 0.85rem; color: #f5f3ff;">
        ${escapeHtml(m.runtime || '2H')}
      </td>
      <td>
        <!-- Quick Screening State Controller (Toggle Switch) -->
        <label class="screening-toggle-label" title="${isActive ? 'Click to archive title' : 'Click to make available for scheduling'}">
          <input type="checkbox" class="screening-toggle-input" data-movie-id="${m.id}" ${isActive ? 'checked' : ''} />
          <span class="screening-toggle-track">
            <span class="screening-toggle-thumb"></span>
          </span>
          <span class="screening-status-text ${isActive ? 'active' : 'archived'}">
            ${isActive ? 'Available' : 'Archived'}
          </span>
        </label>
      </td>
      <td style="text-align: right; white-space: nowrap;">
        <button class="btn btn-danger btn-xs" data-action="delete-movie" data-movie-id="${m.id}" title="Remove film from database">Delete</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  updateBulkToolbar();
}

export function renderPaginationBar() {
  let paginationContainer = document.getElementById('moviePaginationBar');
  if (!paginationContainer) {
    const tableCard = document.querySelector('.movie-directory-table')?.closest('.card');
    if (tableCard) {
      paginationContainer = document.createElement('div');
      paginationContainer.id = 'moviePaginationBar';
      paginationContainer.className = 'pagination-bar';
      paginationContainer.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid var(--border); font-size: 0.85rem; flex-wrap: wrap; gap: 10px; border-radius: 0 !important;';
      tableCard.appendChild(paginationContainer);
    }
  }

  if (!paginationContainer) return;

  if (totalFilmsCount === 0) {
    paginationContainer.innerHTML = '';
    return;
  }

  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalFilmsCount);

  paginationContainer.innerHTML = `
    <div style="color: var(--muted); font-size: 0.8rem;">
      Showing <span style="color: #fff; font-weight: 600;">${startIdx}</span> to <span style="color: #fff; font-weight: 600;">${endIdx}</span> of <span style="color: #fff; font-weight: 600;">${totalFilmsCount}</span> films
    </div>
    <div style="display: flex; gap: 8px; align-items: center;">
      <button class="btn btn-xs btn-secondary" data-action="prev-movie-page" ${currentPage <= 1 ? 'disabled' : ''} style="padding: 4px 12px; border-radius: 0 !important;">Previous</button>
      <span style="color: #c084fc; font-family: monospace; font-size: 0.8rem;">Page ${currentPage} of ${totalPages}</span>
      <button class="btn btn-xs btn-secondary" data-action="next-movie-page" ${currentPage >= totalPages ? 'disabled' : ''} style="padding: 4px 12px; border-radius: 0 !important;">Next</button>
    </div>
  `;
}

export function nextMoviePage() {
  if (currentPage < totalPages) {
    loadMovies(currentPage + 1);
  }
}

export function prevMoviePage() {
  if (currentPage > 1) {
    loadMovies(currentPage - 1);
  }
}

// =========================================================================
// 2. Screening Availability Controller (Single & Bulk)
// =========================================================================

export async function toggleMovieScreeningState(movieId, newActive) {
  const movie = allMovies.find(m => m.id === movieId);
  if (!movie) return;

  const previousState = movie.is_active;
  movie.is_active = newActive;
  updateStatusCounts();
  renderFilteredMovies();

  try {
    const res = await fetch(`/api/admin/movies/${movieId}/state`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ is_active: newActive })
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    
    showToast(
      `"${movie.title}" is now ${newActive ? 'Available for Scheduling' : 'Archived / Off-Air'}`,
      newActive ? 'success' : 'info'
    );
  } catch (err) {
    console.error('Failed to toggle screening state:', err);
    movie.is_active = previousState;
    updateStatusCounts();
    renderFilteredMovies();
    showToast('Failed to update screening state: ' + err.message, 'error');
  }
}

export async function bulkUpdateScreeningState(newActive) {
  if (!selectedMovieIds.size) return;

  const ids = Array.from(selectedMovieIds);
  const count = ids.length;

  try {
    const res = await fetch('/api/admin/movies/bulk-state', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ids, is_active: newActive })
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    allMovies.forEach(m => {
      if (selectedMovieIds.has(m.id)) {
        m.is_active = newActive;
      }
    });

    selectedMovieIds.clear();
    updateStatusCounts();
    renderFilteredMovies();

    showToast(
      `Updated ${data.count} films to ${newActive ? 'Available for Scheduling' : 'Archived / Off-Air'}`,
      'success'
    );
  } catch (err) {
    console.error('Bulk state update failed:', err);
    showToast('Failed to bulk update state: ' + err.message, 'error');
  }
}

export async function bulkDeleteMovies() {
  if (!selectedMovieIds.size) return;
  const count = selectedMovieIds.size;

  if (!confirm(`Are you sure you want to permanently DELETE ${count} selected film(s) and their showings?`)) {
    return;
  }

  try {
    const ids = Array.from(selectedMovieIds);
    const res = await fetch('/api/admin/movies/bulk-delete', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ids })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to bulk delete films');
    }

    const data = await res.json();
    selectedMovieIds.clear();
    showToast(`Permanently deleted ${data.count} films`, 'success');
    await loadMovies(currentPage);
  } catch (err) {
    console.error('Bulk delete failed:', err);
    showToast('Failed to bulk delete films: ' + err.message, 'error');
  }
}

// =========================================================================
// 3. Bulk Selection & Floating Toolbar UI
// =========================================================================

function updateBulkToolbar() {
  const bar = document.getElementById('movieBulkToolbar');
  const countEl = document.getElementById('bulkSelectedCount');
  const selectAll = document.getElementById('selectAllMoviesCheckbox');

  if (!bar) return;

  const count = selectedMovieIds.size;
  if (count > 0) {
    bar.style.display = 'flex';
    if (countEl) countEl.textContent = `${count} film${count > 1 ? 's' : ''} selected`;
  } else {
    bar.style.display = 'none';
  }

  if (selectAll) {
    const visibleCheckboxes = document.querySelectorAll('.movie-row-checkbox');
    selectAll.checked = visibleCheckboxes.length > 0 && Array.from(visibleCheckboxes).every(cb => cb.checked);
  }
}

export function clearMovieSelection() {
  selectedMovieIds.clear();
  renderFilteredMovies();
}

export function toggleSelectAllMovies(checked) {
  const visibleCheckboxes = document.querySelectorAll('.movie-row-checkbox');
  visibleCheckboxes.forEach(cb => {
    const id = cb.dataset.movieId;
    if (checked) {
      selectedMovieIds.add(id);
    } else {
      selectedMovieIds.delete(id);
    }
  });
  renderFilteredMovies();
}

export function toggleMovieSelection(movieId, checked) {
  if (checked) {
    selectedMovieIds.add(movieId);
  } else {
    selectedMovieIds.delete(movieId);
  }
  const tr = document.querySelector(`tr[data-movie-id="${movieId}"]`);
  if (tr) {
    tr.classList.toggle('row-selected', checked);
  }
  updateBulkToolbar();
}

export function toggleStagingSelection(index, checked) {
  const rec = stagingRecords[index];
  if (rec && rec.valid) {
    rec.selected = checked;
    const summaryEl = document.getElementById('stagingReadySummary');
    const commitBtn = document.getElementById('btnCommitIngest');
    const validCount = stagingRecords.filter(r => r.valid).length;
    const selectedCount = stagingRecords.filter(r => r.selected).length;
    if (summaryEl) {
      summaryEl.textContent = `${selectedCount} of ${validCount} valid films ready to import`;
    }
    if (commitBtn) {
      commitBtn.disabled = selectedCount === 0;
      commitBtn.textContent = `Import Selected (${selectedCount} Films)`;
    }
    const selectAllStaging = document.getElementById('selectAllStagingCheckbox');
    if (selectAllStaging) {
      const validRecs = stagingRecords.filter(r => r.valid);
      selectAllStaging.checked = validRecs.length > 0 && validRecs.every(r => r.selected);
    }
  }
}

export function toggleSelectAllStaging(checked) {
  stagingRecords.forEach(r => {
    if (r.valid) {
      r.selected = checked;
    }
  });
  renderStagingTable();
}

// =========================================================================
// 4. Filtering & Search Controls
// =========================================================================

export function setMovieSearch(val) {
  searchQuery = (val || '').trim();
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    loadMovies(1);
  }, 300);
}

export function clearMovieSearch() {
  searchQuery = '';
  const inp = document.getElementById('movieSearchInput');
  if (inp) inp.value = '';
  loadMovies(1);
}

export function setMovieStatusFilter(status) {
  currentStatusFilter = status;
  document.querySelectorAll('#movieStatusChips .chip-btn').forEach(btn => {
    if (btn.dataset.status === status) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  loadMovies(1);
}

export function setMovieGenreFilter(genre) {
  currentGenreFilter = genre;
  loadMovies(1);
}

export function setMovieYearRange(min, max) {
  const minInp = document.getElementById('movieYearMin');
  const maxInp = document.getElementById('movieYearMax');
  const errEl = document.getElementById('movieYearRangeError');

  const minVal = min ? parseInt(min, 10) : null;
  const maxVal = max ? parseInt(max, 10) : null;

  if (minVal && maxVal && minVal > maxVal) {
    if (minInp) minInp.style.borderColor = '#f43f5e';
    if (maxInp) maxInp.style.borderColor = '#f43f5e';
    if (errEl) {
      errEl.textContent = 'Min year cannot exceed Max year';
      errEl.style.display = 'inline-block';
    }
    return;
  }

  if (minInp) minInp.style.borderColor = '';
  if (maxInp) maxInp.style.borderColor = '';
  if (errEl) {
    errEl.textContent = '';
    errEl.style.display = 'none';
  }

  minYearFilter = minVal;
  maxYearFilter = maxVal;
  loadMovies(1);
}

export function setMovieSort(sortKey) {
  currentSort = sortKey;
  loadMovies(1);
}

export function resetAllFilters() {
  searchQuery = '';
  currentStatusFilter = 'all';
  currentGenreFilter = 'all';
  minYearFilter = null;
  maxYearFilter = null;
  currentSort = 'created_at_desc';

  const sInp = document.getElementById('movieSearchInput');
  const gSel = document.getElementById('movieGenreFilter');
  const yMin = document.getElementById('movieYearMin');
  const yMax = document.getElementById('movieYearMax');
  const sortSel = document.getElementById('movieSortSelect');
  const errEl = document.getElementById('movieYearRangeError');

  if (sInp) sInp.value = '';
  if (gSel) gSel.value = 'all';
  if (yMin) {
    yMin.value = '';
    yMin.style.borderColor = '';
  }
  if (yMax) {
    yMax.value = '';
    yMax.style.borderColor = '';
  }
  if (errEl) {
    errEl.textContent = '';
    errEl.style.display = 'none';
  }
  if (sortSel) sortSel.value = 'created_at_desc';

  document.querySelectorAll('#movieStatusChips .chip-btn').forEach(btn => {
    if (btn.dataset.status === 'all') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  loadMovies(1);
}

// =========================================================================
// 5. Bulk Ingest Engine: Modal, Parser, Validation & Staging Preview
// =========================================================================

export function openBulkIngestModal() {
  const modal = document.getElementById('movieBulkIngestModal');
  if (modal) {
    modal.style.display = 'flex';
    resetIngestModal();
  }
}

export function closeBulkIngestModal() {
  const modal = document.getElementById('movieBulkIngestModal');
  if (modal) {
    modal.style.display = 'none';
    resetIngestModal();
  }
}

function resetIngestModal() {
  stagingRecords = [];
  const fileInp = document.getElementById('bulkMovieFileInput');
  const textInp = document.getElementById('rawIngestInput');
  const stagingSection = document.getElementById('ingestStagingSection');
  const stagingTbody = document.getElementById('stagingRowsList');
  const commitBtn = document.getElementById('btnCommitIngest');

  if (fileInp) fileInp.value = '';
  if (textInp) textInp.value = '';
  if (stagingSection) stagingSection.style.display = 'none';
  if (stagingTbody) stagingTbody.innerHTML = '';
  if (commitBtn) {
    commitBtn.disabled = true;
    commitBtn.textContent = 'Import Selected Films';
  }

  switchIngestTab('upload');
}

export function switchIngestTab(tab) {
  activeIngestTab = tab;
  const upPanel = document.getElementById('ingestUploadPanel');
  const pastePanel = document.getElementById('ingestPastePanel');
  const upTabBtn = document.getElementById('btnTabUploadFile');
  const pasteTabBtn = document.getElementById('btnTabPasteRaw');

  if (tab === 'upload') {
    if (upPanel) upPanel.style.display = 'block';
    if (pastePanel) pastePanel.style.display = 'none';
    upTabBtn?.classList.add('active');
    pasteTabBtn?.classList.remove('active');
  } else {
    if (upPanel) upPanel.style.display = 'none';
    if (pastePanel) pastePanel.style.display = 'block';
    upTabBtn?.classList.remove('active');
    pasteTabBtn?.classList.add('active');
  }
}

export function triggerFileBrowse() {
  const input = document.getElementById('bulkMovieFileInput');
  if (input) input.click();
}

export function handleFileSelect(file) {
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    showToast('File size exceeds maximum 10MB limit', 'error');
    return;
  }

  const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
  const isJson = file.name.toLowerCase().endsWith('.json') || file.type === 'application/json';

  if (!isCsv && !isJson) {
    showToast('Unsupported file format. Please upload .json or .csv', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    processIngestText(content, isCsv ? 'csv' : 'json');
  };
  reader.onerror = () => {
    showToast('Failed to read file from disk', 'error');
  };
  reader.readAsText(file);
}

export function parseRawPastedData() {
  const text = (document.getElementById('rawIngestInput')?.value || '').trim();
  if (!text) {
    showToast('Please paste JSON or CSV text first', 'warning');
    return;
  }

  const format = text.startsWith('[') || text.startsWith('{') ? 'json' : 'csv';
  processIngestText(text, format);
}

export function processIngestText(rawText, format) {
  let rawList = [];

  try {
    if (format === 'json') {
      const parsed = JSON.parse(rawText);
      rawList = Array.isArray(parsed) ? parsed : [parsed];
    } else {
      rawList = parseCsv(rawText);
    }
  } catch (err) {
    console.error('Parse error:', err);
    showToast(`Failed to parse ${format.toUpperCase()}: ${err.message}`, 'error');
    return;
  }

  if (!rawList.length) {
    showToast('No records found in uploaded data', 'warning');
    return;
  }

  // Normalize and validate records
  stagingRecords = rawList.map((m, idx) => validateAndNormalizeRecord(m, idx));

  renderStagingTable();
}

function parseCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse CSV line taking quotes into account
  const parseLine = (line) => {
    const entries = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        entries.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    entries.push(cur.trim());
    return entries;
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (!values.length || (values.length === 1 && !values[0])) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx] : '';
    });
    records.push(row);
  }

  return records;
}

function validateAndNormalizeRecord(raw, idx) {
  // Field aliases mapping
  const title = (raw.title || raw.filmtitle || raw.name || '').trim();
  const poster_url = (raw.logourl || raw.posterurl || raw.poster_url || raw.poster || raw.image || '').trim();
  const yearRaw = raw.releaseyear || raw.year || raw.yearreleased || 2024;
  const year = parseInt(yearRaw, 10);
  const blurb = (raw.description || raw.blurb || raw.synopsis || '').trim();

  // Genre
  let genre = raw.genres || raw.genre || 'Cinema';
  if (Array.isArray(genre)) {
    genre = genre.join(', ');
  } else if (typeof genre === 'string') {
    genre = genre.trim();
  }

  // Duration / Runtime
  let runtime = raw.durationminutes || raw.duration || raw.runtime || '2H';
  if (typeof runtime === 'number' || (!isNaN(parseInt(runtime, 10)) && !runtime.includes('H'))) {
    const totalMins = parseInt(runtime, 10);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    runtime = h > 0 ? `${h}H ${m}M` : `${m}M`;
  } else {
    runtime = String(runtime).trim();
  }

  const director = (raw.director || raw.dir || 'Staff Selection').trim();
  const hall = (raw.hall || raw.venue || raw.auditorium || 'D Block 3rd Floor').trim();
  const rating = (raw.rating || raw.agerating || 'UA').trim().toUpperCase();
  
  const isScreeningReadyRaw = raw.isscreeningready !== undefined ? raw.isscreeningready : (raw.is_active !== undefined ? raw.is_active : true);
  const is_active = isScreeningReadyRaw === true || isScreeningReadyRaw === 'true' || isScreeningReadyRaw === 1 || isScreeningReadyRaw === '1';

  // Validation Flags
  const errors = [];
  const warnings = [];

  if (!title) {
    errors.push('Missing required film title');
  }

  if (!poster_url) {
    errors.push('Missing required key art URL (logoUrl/posterUrl)');
  } else if (!/^https?:\/\//i.test(poster_url)) {
    warnings.push('Key art URL does not start with http:// or https://');
  }

  if (!year || isNaN(year) || year < 1880 || year > 2100) {
    errors.push('Invalid 4-digit release year');
  }

  if (!blurb) {
    errors.push('Missing required synopsis/description');
  }

  // Duplicate Check against existing database catalogue
  const existingDup = allMovies.find(m => m.title && m.title.trim().toLowerCase() === title.toLowerCase());
  const isDuplicate = !!existingDup;
  if (isDuplicate) {
    warnings.push(`Duplicate title: already exists in catalogue`);
  }

  const valid = errors.length === 0;

  return {
    index: idx,
    raw,
    normalized: {
      title,
      director,
      genre,
      runtime,
      year,
      rating,
      blurb,
      hall,
      poster_url,
      is_active
    },
    valid,
    errors,
    warnings,
    isDuplicate,
    selected: valid // Auto-select valid records
  };
}

function renderStagingTable() {
  const section = document.getElementById('ingestStagingSection');
  const tbody = document.getElementById('stagingRowsList');
  const metricsBar = document.getElementById('stagingMetricsBar');
  const summaryEl = document.getElementById('stagingReadySummary');
  const commitBtn = document.getElementById('btnCommitIngest');

  if (!section || !tbody) return;

  section.style.display = 'block';

  const total = stagingRecords.length;
  const validCount = stagingRecords.filter(r => r.valid).length;
  const invalidCount = stagingRecords.filter(r => !r.valid).length;
  const dupCount = stagingRecords.filter(r => r.isDuplicate).length;
  const selectedCount = stagingRecords.filter(r => r.selected).length;

  if (metricsBar) {
    metricsBar.innerHTML = `
      <span class="badge-valid">✓ ${validCount} Valid</span>
      ${dupCount > 0 ? `<span class="badge-warning">⚠ ${dupCount} Duplicate</span>` : ''}
      ${invalidCount > 0 ? `<span class="badge-invalid">✕ ${invalidCount} Invalid</span>` : ''}
      <span style="color: var(--muted); padding: 2px 6px;">Total: ${total}</span>
    `;
  }

  tbody.innerHTML = '';

  stagingRecords.forEach(rec => {
    const norm = rec.normalized;
    const tr = document.createElement('tr');
    tr.style.opacity = rec.valid ? '1' : '0.65';

    let statusBadge = '';
    if (!rec.valid) {
      statusBadge = `<span class="badge-invalid">✕ Error</span>`;
    } else if (rec.isDuplicate) {
      statusBadge = `<span class="badge-warning">⚠ Duplicate</span>`;
    } else {
      statusBadge = `<span class="badge-valid">✓ Ready</span>`;
    }

    let flagsHtml = '';
    if (rec.errors.length) {
      flagsHtml += `<div style="color: #ff8585; font-size: 0.72rem;">${escapeHtml(rec.errors.join('; '))}</div>`;
    }
    if (rec.warnings.length) {
      flagsHtml += `<div style="color: #ffb703; font-size: 0.72rem;">${escapeHtml(rec.warnings.join('; '))}</div>`;
    }
    if (!flagsHtml) {
      flagsHtml = `<span style="color: var(--muted); font-size: 0.72rem;">Valid schema</span>`;
    }

    tr.innerHTML = `
      <td style="text-align: center;">
        <input type="checkbox" class="staging-row-checkbox" data-index="${rec.index}" ${rec.selected ? 'checked' : ''} ${!rec.valid ? 'disabled' : ''} />
      </td>
      <td>${statusBadge}</td>
      <td>
        <img src="${escapeHtml(norm.poster_url || '')}" alt="" class="staging-poster-thumb" onerror="this.src='https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800';" />
      </td>
      <td style="font-weight: 600; color: #fff;">${escapeHtml(norm.title || '--')}</td>
      <td style="font-family: monospace;">${norm.year || '--'}</td>
      <td>${escapeHtml(norm.genre || '--')}</td>
      <td style="font-family: monospace;">${escapeHtml(norm.runtime || '--')}</td>
      <td>
        <span class="status-badge" style="font-size: 0.65rem; background: ${norm.is_active ? 'rgba(56,176,0,0.15)' : 'rgba(168,134,152,0.15)'}; color: ${norm.is_active ? '#70e000' : 'var(--muted)'};">
          ${norm.is_active ? 'Available' : 'Archived'}
        </span>
      </td>
      <td>${flagsHtml}</td>
    `;

    tbody.appendChild(tr);
  });

  if (summaryEl) {
    summaryEl.textContent = `${selectedCount} of ${validCount} valid films ready to import`;
  }

  if (commitBtn) {
    commitBtn.disabled = selectedCount === 0;
    commitBtn.textContent = `Import Selected (${selectedCount} Films)`;
  }
}

export async function commitBulkIngest() {
  const toIngest = stagingRecords
    .filter(r => r.selected && r.valid)
    .map(r => r.normalized);

  if (!toIngest.length) {
    showToast('No valid films selected for import', 'warning');
    return;
  }

  const commitBtn = document.getElementById('btnCommitIngest');
  if (commitBtn) {
    commitBtn.disabled = true;
    commitBtn.textContent = 'Ingesting Films...';
  }

  try {
    const res = await fetch('/api/admin/movies/bulk-ingest', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ movies: toIngest })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Server rejected batch ingestion');
    }

    const data = await res.json();
    closeBulkIngestModal();
    await loadMovies();

    showToast(
      `Successfully batch-imported ${data.count} films into catalogue!`,
      'success',
      5000
    );
  } catch (err) {
    console.error('Commit ingest error:', err);
    showToast('Bulk ingest failed: ' + err.message, 'error');
    if (commitBtn) {
      commitBtn.disabled = false;
      commitBtn.textContent = 'Retry Import';
    }
  }
}

// =========================================================================
// 6. Template Generators (JSON & CSV)
// =========================================================================

export function downloadTemplateJson() {
  const sample = [
    {
      title: "Interstellar",
      logoUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800",
      releaseYear: 2014,
      genres: ["Adventure", "Drama", "Sci-Fi"],
      durationMinutes: 169,
      rating: "PG-13",
      description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
      isScreeningReady: true
    },
    {
      title: "Blade Runner 2049",
      logoUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800",
      releaseYear: 2017,
      genres: ["Sci-Fi", "Mystery"],
      durationMinutes: 164,
      rating: "R",
      description: "Young Blade Runner K's discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard.",
      isScreeningReady: false
    }
  ];

  const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
  triggerDownload(blob, 'daydreamers_movies_template.json');
}

export function downloadTemplateCsv() {
  const csv = [
    'title,logoUrl,releaseYear,genres,durationMinutes,rating,description,isScreeningReady',
    '"Inception","https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800",2010,"Action, Sci-Fi",148,"PG-13","A thief who steals corporate secrets through the use of dream-sharing technology.",true',
    '"Arrival","https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800",2016,"Drama, Sci-Fi",116,"PG-13","A linguist works with the military to communicate with alien lifeforms.",true'
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  triggerDownload(blob, 'daydreamers_movies_template.csv');
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// =========================================================================
// 7. Single Movie Creation & Deletion
// =========================================================================

export async function deleteMovie(id) {
  if (!id) return;
  const movie = allMovies.find(m => m.id === id);
  const name = movie ? `"${movie.title}"` : 'this film';

  if (!confirm(`Are you sure you want to remove ${name} from the schedule? All associated showings will also be removed.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/movies/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (res.ok) {
      showToast(`${name} removed successfully`, 'info');
      await loadMovies(currentPage);
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || 'Failed to delete movie', 'error');
    }
  } catch (err) {
    showToast('Error deleting movie: ' + err.message, 'error');
  }
}

export async function handleAddMovieSubmit(e) {
  if (e) e.preventDefault();

  const title = (document.getElementById('newTitle')?.value || '').trim();
  const director = (document.getElementById('newDir')?.value || '').trim() || 'Staff Selection';
  const genre = (document.getElementById('newGenre')?.value || '').trim();
  let runtime = (document.getElementById('newRuntime')?.value || '').trim();
  const year = parseInt(document.getElementById('newYear')?.value || 2024, 10);
  const hall = (document.getElementById('newHall')?.value || '').trim() || 'D Block 3rd Floor';
  const rating = document.getElementById('newRating')?.value || 'UA';
  const poster_url = (document.getElementById('newPoster')?.value || '').trim();
  const quote = (document.getElementById('newQuote')?.value || '').trim();
  const quote_author = (document.getElementById('newQuoteAuthor')?.value || '').trim();
  const blurb = (document.getElementById('newBlurb')?.value || '').trim();

  // Convert runtime if pure minutes
  if (!isNaN(parseInt(runtime, 10)) && !runtime.includes('H')) {
    const totalM = parseInt(runtime, 10);
    const h = Math.floor(totalM / 60);
    const m = totalM % 60;
    runtime = h > 0 ? `${h}H ${m}M` : `${m}M`;
  }

  const payload = {
    title,
    director,
    genre,
    runtime,
    year,
    hall,
    rating,
    poster_url,
    quote,
    quote_author,
    blurb,
    is_active: true
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
      showToast(`"${title}" added to schedule and activated`, 'success');
      await loadMovies();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || 'Failed to add movie', 'error');
    }
  } catch (err) {
    showToast('Network error: ' + err.message, 'error');
  }
}

// Helper: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =========================================================================
// 8. Event Delegation & Lifecycle Initialization
// =========================================================================

export function initMovies() {
  const form = document.getElementById('newMovieForm');
  if (form) {
    form.removeEventListener('submit', handleAddMovieSubmit);
    form.addEventListener('submit', handleAddMovieSubmit);
  }

  setupDropzoneEvents();
  return loadMovies();
}

function setupDropzoneEvents() {
  const dropzone = document.getElementById('ingestDropzone');
  const fileInput = document.getElementById('bulkMovieFileInput');

  if (dropzone && !dropzone.dataset.eventsBound) {
    dropzone.dataset.eventsBound = 'true';

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    });

    dropzone.addEventListener('click', () => {
      fileInput?.click();
    });
  }

  if (fileInput && !fileInput.dataset.eventsBound) {
    fileInput.dataset.eventsBound = 'true';
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
      }
    });
  }
}
