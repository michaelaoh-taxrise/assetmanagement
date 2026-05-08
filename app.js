/**
 * TaxRise Asset Hub — client-side state + read-only roster lookup.
 *
 * ROSTER TABLE CONTRACT: This app never INSERTs, UPDATEs, or DELETEs rows in the
 * Supabase `roster` table (or any roster view). Only `.from(roster).select(...)`
 * is used to retrieve data for search/autofill.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const STORAGE_KEY = 'taxrise-asset-hub-state-v2';

/** Match your Supabase `roster` column names (read-only). */
const ROSTER = {
  table: 'roster',
  columns: {
    employeeId: 'employee_id',
    firstName: 'first_name',
    lastName: 'last_name',
    /** Set to e.g. 'full_name' if your roster uses one name column; leave null if you only have first/last. */
    fullName: null,
    workLocation: 'work_location',
    address1: 'address_1',
    address2: 'address_2',
    city: 'city',
    state: 'state',
    zipCode: 'zip_code',
  },
};

function meta(name) {
  const el = document.querySelector(`meta[name="${name}"]`);
  return el?.getAttribute('content')?.trim() ?? '';
}

const supabaseUrl = meta('supabase-url');
const supabaseAnonKey = meta('supabase-anon-key');

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let rosterClient = null;
if (supabaseUrl && supabaseAnonKey) {
  rosterClient = createClient(supabaseUrl, supabaseAnonKey);
}

function rosterSelectList() {
  return '*';
}

/**
 * Escape `%`, `_`, `\` for use inside PostgREST `ilike` patterns.
 * @param {string} s
 */
function escapeIlike(s) {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Build `.or()` filter so roster search matches employee ID **or** first name **or** last name
 * (and optional full_name column). This fixes “name search shows nothing” when only ID was queried.
 * @param {string} rawQuery
 */
function rosterSearchOrFilter(rawQuery) {
  const term = rawQuery.trim();
  if (!term) return '';
  const safe = escapeIlike(term);
  const wild = `%${safe}%`;
  const c = ROSTER.columns;
  const parts = [
    `${c.employeeId}.ilike.${wild}`,
    `${c.firstName}.ilike.${wild}`,
    `${c.lastName}.ilike.${wild}`,
  ];
  if (c.fullName) {
    parts.push(`${c.fullName}.ilike.${wild}`);
  }
  return parts.join(',');
}

/**
 * Read-only roster query — never mutate roster data.
 * @param {string} query
 */
async function searchRoster(query) {
  if (!rosterClient) {
    return { rows: [], error: new Error('Configure supabase-url and supabase-anon-key meta tags.') };
  }
  const orFilter = rosterSearchOrFilter(query);
  if (!orFilter) {
    return { rows: [], error: null };
  }
  const { data, error } = await rosterClient.from(ROSTER.table).select(rosterSelectList()).or(orFilter).limit(25);

  if (error) {
    return { rows: [], error };
  }
  return { rows: data ?? [], error: null };
}

function displayNameFromRosterRow(row) {
  const c = ROSTER.columns;
  const fn = row[c.firstName];
  const ln = row[c.lastName];
  if (fn != null && String(fn).trim() !== '' && ln != null && String(ln).trim() !== '') {
    return `${fn} ${ln}`.trim();
  }
  if (c.fullName && row[c.fullName]) {
    return String(row[c.fullName]).trim();
  }
  if (fn != null && String(fn).trim() !== '') return String(fn).trim();
  if (ln != null && String(ln).trim() !== '') return String(ln).trim();
  return '';
}

function applyRosterRowToForm(row) {
  const form = document.getElementById('employeeForm');
  if (!form) return;
  const c = ROSTER.columns;

  form.elements.employeeId.value = row[c.employeeId] ?? '';

  const fn = row[c.firstName];
  const ln = row[c.lastName];
  if (fn != null && String(fn).trim() !== '') {
    form.elements.firstName.value = String(fn).trim();
  } else if (c.fullName && row[c.fullName]) {
    const parts = String(row[c.fullName]).trim().split(/\s+/);
    form.elements.firstName.value = parts[0] ?? '';
    form.elements.lastName.value = parts.slice(1).join(' ');
    return;
  } else {
    form.elements.firstName.value = '';
  }

  if (ln != null && String(ln).trim() !== '') {
    form.elements.lastName.value = String(ln).trim();
  } else if (!c.fullName || !row[c.fullName]) {
    form.elements.lastName.value = '';
  }

  const wl = row[c.workLocation];
  if (wl != null && String(wl).trim() !== '') {
    const sel = form.elements.workLocation;
    const opt = [...sel.options].find((o) => o.value === String(wl).trim());
    if (opt) sel.value = opt.value;
  }

  if (row[c.address1] != null) form.elements.address1.value = String(row[c.address1]);
  if (row[c.address2] != null) form.elements.address2.value = String(row[c.address2]);
  if (row[c.city] != null) form.elements.city.value = String(row[c.city]);
  if (row[c.state] != null) form.elements.state.value = String(row[c.state]).slice(0, 2).toUpperCase();
  if (row[c.zipCode] != null) form.elements.zipCode.value = String(row[c.zipCode]);
}

// --- Local app state (browser only; not the roster table) ---

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { employees: [] };
    const parsed = JSON.parse(raw);
    if (!parsed.employees) parsed.employees = [];
    return parsed;
  } catch {
    return { employees: [] };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function migrateEmployeeRecord(e) {
  if (e.firstName != null || e.lastName != null) return e;
  if (e.fullName) {
    const parts = String(e.fullName).trim().split(/\s+/);
    return {
      ...e,
      firstName: parts[0] ?? '',
      lastName: parts.slice(1).join(' ') ?? '',
    };
  }
  return { ...e, firstName: '', lastName: '' };
}

function fullName(e) {
  const migrated = migrateEmployeeRecord(e);
  return `${migrated.firstName} ${migrated.lastName}`.trim();
}

/** @typedef {{ employeeId: string, firstName: string, lastName: string, workLocation: string, address: object, assets: object[], pendingReturn: object | null }} Employee */

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.hidden = true;
  }, 3200);
}

function gatherAssetsFromForm(form) {
  const rows = form.querySelectorAll('.asset-row');
  const assets = [];
  rows.forEach((row) => {
    const label = row.querySelector('[name="assetLabel"]');
    const serial = row.querySelector('[name="assetSerial"]');
    const lentDate = row.querySelector('[name="assetLentDate"]');
    const name = label?.value?.trim();
    if (!name) return;
    assets.push({
      label: name,
      serial: serial?.value?.trim() ?? '',
      lentDate: lentDate?.value ?? '',
    });
  });
  return assets;
}

function addAssetRow(container, preset = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'asset-row';
  wrap.innerHTML = `
    <label>
      Asset / equipment
      <input name="assetLabel" required placeholder="e.g. Laptop, monitor" />
    </label>
    <label>
      Serial / asset tag
      <input name="assetSerial" placeholder="Optional" />
    </label>
    <label>
      Date lent
      <input name="assetLentDate" type="date" />
    </label>
    <button type="button" class="icon-button asset-row-remove" aria-label="Remove asset">&times;</button>
  `;
  const inputs = wrap.querySelectorAll('input');
  if (preset.label) inputs[0].value = preset.label;
  if (preset.serial) inputs[1].value = preset.serial;
  if (preset.lentDate) inputs[2].value = preset.lentDate;
  wrap.querySelector('.asset-row-remove')?.addEventListener('click', () => wrap.remove());
  container.appendChild(wrap);
}

function renderStats(state) {
  const active = state.employees.filter((e) => !e.pendingReturn);
  const pending = state.employees.filter((e) => e.pendingReturn);
  let lent = 0;
  active.forEach((e) => {
    lent += (e.assets ?? []).length;
  });
  let overdue = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  pending.forEach((e) => {
    if (e.pendingReturn?.returnDueDate) {
      const d = new Date(e.pendingReturn.returnDueDate);
      if (d < today) overdue += 1;
    }
  });

  document.getElementById('activeEmployeeCount').textContent = String(active.length);
  document.getElementById('lentAssetCount').textContent = String(lent);
  document.getElementById('pendingReturnCount').textContent = String(pending.length);
  document.getElementById('overdueCount').textContent = String(overdue);
}

function renderTables(state) {
  const activeBody = document.getElementById('activeEmployeesTable');
  const pendingBody = document.getElementById('pendingReturnTable');
  const activeEmpty = document.getElementById('activeEmptyState');
  const pendingEmpty = document.getElementById('pendingEmptyState');

  const active = state.employees.filter((e) => !e.pendingReturn);
  const pending = state.employees.filter((e) => e.pendingReturn);

  activeBody.innerHTML = '';
  active.forEach((emp) => {
    const tr = document.createElement('tr');
    const realIndex = state.employees.indexOf(emp);
    tr.innerHTML = `
      <td>${escapeHtml(emp.employeeId)}</td>
      <td>${escapeHtml(fullName(emp))}</td>
      <td>${escapeHtml(emp.workLocation)}</td>
      <td>${(emp.assets ?? []).length}</td>
      <td><button type="button" class="link-button" data-action="profile" data-index="${realIndex}">View</button></td>
      <td><button type="button" class="secondary-button compact" data-action="return" data-index="${realIndex}">Start return</button></td>
    `;
    activeBody.appendChild(tr);
  });

  pendingBody.innerHTML = '';
  pending.forEach((emp) => {
    const tr = document.createElement('tr');
    const realIndex = state.employees.indexOf(emp);
    const pr = emp.pendingReturn ?? {};
    tr.innerHTML = `
      <td>${escapeHtml(emp.employeeId)}</td>
      <td>${escapeHtml(fullName(emp))}</td>
      <td>${(emp.assets ?? []).length}</td>
      <td>${escapeHtml(pr.returnDueDate ?? '—')}</td>
      <td>${escapeHtml(pr.upsTracking ?? '—')}</td>
      <td><button type="button" class="link-button" data-action="profile" data-index="${realIndex}">View</button></td>
    `;
    pendingBody.appendChild(tr);
  });

  activeEmpty.style.display = active.length ? 'none' : 'block';
  pendingEmpty.style.display = pending.length ? 'none' : 'block';
  renderStats(state);
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function openDialog(id) {
  const d = document.getElementById(id);
  if (d && typeof d.showModal === 'function') d.showModal();
}

function closeDialog(id) {
  const d = document.getElementById(id);
  if (d && typeof d.close === 'function') d.close();
}

function renderProfile(emp) {
  document.getElementById('profileName').textContent = fullName(emp);
  const addr = emp.address ?? {};
  const assets = emp.assets ?? [];
  let html = `
    <dl class="profile-dl">
      <dt>Employee ID</dt><dd>${escapeHtml(emp.employeeId)}</dd>
      <dt>Work location</dt><dd>${escapeHtml(emp.workLocation)}</dd>
      <dt>Address</dt><dd>${escapeHtml(addr.address1 ?? '')}${addr.address2 ? `, ${escapeHtml(addr.address2)}` : ''}<br />
      ${escapeHtml(addr.city ?? '')}, ${escapeHtml(addr.state ?? '')} ${escapeHtml(addr.zipCode ?? '')}</dd>
    </dl>
    <h4 class="profile-assets-heading">Assets</h4>
    <ul class="profile-asset-list">
  `;
  if (!assets.length) {
    html += '<li>No assets recorded.</li>';
  } else {
    assets.forEach((a) => {
      html += `<li><strong>${escapeHtml(a.label)}</strong> — SN: ${escapeHtml(a.serial || '—')} — Lent: ${escapeHtml(a.lentDate || '—')}</li>`;
    });
  }
  html += '</ul>';
  if (emp.pendingReturn) {
    const pr = emp.pendingReturn;
    html += `<div class="profile-pending"><p><strong>Pending return</strong></p>
      <p>Due: ${escapeHtml(pr.returnDueDate ?? '')}</p>
      <p>UPS: ${escapeHtml(pr.upsTracking ?? '—')}</p></div>`;
  }
  document.getElementById('profileContent').innerHTML = html;
}

function wireEmployeeDialog(state) {
  const dialog = document.getElementById('employeeDialog');
  const form = document.getElementById('employeeForm');
  const assetRows = document.getElementById('assetRows');
  const searchInput = document.getElementById('rosterSearchInput');
  const searchStatus = document.getElementById('rosterSearchStatus');
  const searchResults = document.getElementById('rosterSearchResults');

  document.getElementById('openEmployeeForm')?.addEventListener('click', () => {
    form.reset();
    assetRows.innerHTML = '';
    addAssetRow(assetRows);
    searchInput.value = '';
    searchResults.hidden = true;
    searchResults.innerHTML = '';
    searchStatus.textContent = rosterClient
      ? ''
      : 'Roster lookup disabled — add supabase-url and supabase-anon-key meta tags to enable search.';
    openDialog('employeeDialog');
  });

  document.getElementById('openEmployeeFormSecondary')?.addEventListener('click', () => {
    document.getElementById('openEmployeeForm').click();
  });

  document.getElementById('addAssetRow')?.addEventListener('click', () => addAssetRow(assetRows));

  let searchTimer = null;
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = searchInput.value;
    searchTimer = setTimeout(async () => {
      searchResults.innerHTML = '';
      if (!q.trim()) {
        searchResults.hidden = true;
        searchStatus.textContent = '';
        return;
      }
      if (!rosterClient) {
        searchStatus.textContent = 'Configure Supabase meta tags to search the roster.';
        searchResults.hidden = true;
        return;
      }
      searchStatus.textContent = 'Searching roster…';
      const { rows, error } = await searchRoster(q);
      if (error) {
        searchStatus.textContent = `Roster search failed: ${error.message}`;
        searchResults.hidden = true;
        return;
      }
      searchStatus.textContent = rows.length ? `${rows.length} match(es)` : 'No matches';
      if (!rows.length) {
        searchResults.hidden = true;
        return;
      }
      searchResults.hidden = false;
      rows.forEach((row, i) => {
        const li = document.createElement('li');
        const c = ROSTER.columns;
        const id = row[c.employeeId] ?? '—';
        const dn = displayNameFromRosterRow(row) || '—';
        li.innerHTML = `<button type="button" class="roster-pick">${escapeHtml(String(id))} — ${escapeHtml(dn)}</button>`;
        li.querySelector('button').addEventListener('click', () => {
          applyRosterRowToForm(row);
          searchResults.hidden = true;
          searchStatus.textContent = 'Selected from roster.';
          showToast('Form filled from roster (read-only).');
        });
        searchResults.appendChild(li);
      });
    }, 280);
  });

  form?.addEventListener('submit', () => {
    const fd = new FormData(form);
    const employeeId = String(fd.get('employeeId') ?? '').trim();
    const firstName = String(fd.get('firstName') ?? '').trim();
    const lastName = String(fd.get('lastName') ?? '').trim();
    if (!employeeId || !firstName || !lastName) return;

    const existing = state.employees.findIndex((e) => e.employeeId === employeeId);
    const assets = gatherAssetsFromForm(form);
    const entry = {
      employeeId,
      firstName,
      lastName,
      workLocation: String(fd.get('workLocation') ?? ''),
      address: {
        address1: String(fd.get('address1') ?? ''),
        address2: String(fd.get('address2') ?? ''),
        city: String(fd.get('city') ?? ''),
        state: String(fd.get('state') ?? ''),
        zipCode: String(fd.get('zipCode') ?? ''),
      },
      assets,
      pendingReturn: null,
    };

    if (existing >= 0) {
      state.employees[existing] = { ...state.employees[existing], ...entry, pendingReturn: state.employees[existing].pendingReturn };
    } else {
      state.employees.push(entry);
    }
    saveState(state);
    renderTables(state);
    showToast('Asset profile saved locally.');
    closeDialog('employeeDialog');
  });
}

function wireReturnDialog(state) {
  const form = document.getElementById('returnForm');
  form?.addEventListener('submit', () => {
    const fd = new FormData(form);
    const employeeId = String(fd.get('employeeId') ?? '');
    const term = String(fd.get('terminationDate') ?? '');
    if (!employeeId || !term) return;

    const emp = state.employees.find((e) => e.employeeId === employeeId);
    if (!emp) return;

    const termDate = new Date(term);
    const due = new Date(termDate);
    due.setDate(due.getDate() + 10);
    const returnDueDate = due.toISOString().slice(0, 10);

    emp.pendingReturn = {
      terminationDate: term,
      returnDueDate,
      upsTracking: '',
    };
    saveState(state);
    renderTables(state);
    showToast('Employee moved to pending return.');
    closeDialog('returnDialog');
  });
}

function wireTableActions(state) {
  document.body.addEventListener('click', (ev) => {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const btn = t.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const index = Number(btn.getAttribute('data-index'));
    const emp = state.employees[index];
    if (!emp) return;

    if (action === 'profile') {
      renderProfile(emp);
      openDialog('profileDialog');
    }
    if (action === 'return') {
      document.getElementById('returnEmployeeName').textContent = `Return — ${fullName(emp)}`;
      const form = document.getElementById('returnForm');
      form.elements.employeeId.value = emp.employeeId;
      openDialog('returnDialog');
    }
  });
}

function wireCloseButtons() {
  document.querySelectorAll('[data-close-dialog]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-close-dialog');
      if (id) closeDialog(id);
    });
  });
}

function init() {
  const state = loadState();
  state.employees = state.employees.map(migrateEmployeeRecord);

  wireCloseButtons();
  wireEmployeeDialog(state);
  wireReturnDialog(state);
  wireTableActions(state);
  renderTables(state);

  const assetRows = document.getElementById('assetRows');
  if (assetRows && !assetRows.children.length) {
    addAssetRow(assetRows);
  }
}

init();
