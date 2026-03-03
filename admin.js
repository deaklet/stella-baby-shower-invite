// ============================================================
// Baby Shower Invite — Admin Page JavaScript
// ============================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbzsb2QY_NXejESHKvfzKU7xckM_alsjtuAG3j7pA1m-v9EN_3rZv1y8NHzIKR7GchFZ/exec'; // Replace after deploying
let adminPassword = 'stella1221';

// ============================================================
// LOGIN
// ============================================================
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  adminPassword = document.getElementById('admin-password').value;

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  try {
    const res = await fetch(
      `${API_URL}?action=adminGetGifts&password=${encodeURIComponent(adminPassword)}`
    );
    const data = await res.json();

    if (data.error) {
      document.getElementById('login-error').textContent = data.error;
      document.getElementById('login-error').style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Sign In';
      return;
    }

    // Success — show admin panel
    document.getElementById('login-gate').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    renderAdminGifts(data.gifts);
    loadRsvps();
  } catch (err) {
    document.getElementById('login-error').textContent =
      'Connection error. Please try again.';
    document.getElementById('login-error').style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});

// ============================================================
// TABS
// ============================================================
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document
      .querySelectorAll('.tab-content')
      .forEach((c) => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

// ============================================================
// GIFTS — Render Table
// ============================================================
function renderAdminGifts(gifts) {
  const tbody = document.getElementById('gifts-tbody');
  const empty = document.getElementById('gifts-empty');

  if (!gifts || gifts.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    document.getElementById('gifts-table').style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  document.getElementById('gifts-table').style.display = '';

  tbody.innerHTML = gifts
    .map((gift) => {
      const claimed = !!gift.claimedBy;
      return `<tr>
      <td>${escapeHtml(gift.name)}</td>
      <td>${gift.imageUrl ? `<img src="${escapeAttr(gift.imageUrl)}" alt="" style="width:48px;height:48px;object-fit:contain;border-radius:4px;">` : '\u2014'}</td>
      <td>${gift.link ? `<a href="${escapeAttr(gift.link)}" target="_blank" rel="noopener noreferrer" style="color:#4a90d9;">View</a>` : '\u2014'}</td>
      <td>${
        claimed
          ? `<span class="badge badge-claimed">Claimed by ${escapeHtml(gift.claimedBy)}</span>`
          : '<span class="badge badge-available">Available</span>'
      }</td>
      <td class="actions">
        <button class="btn btn-sm" onclick="openEditModal(${gift.row}, '${escapeAttr(gift.name)}', '${escapeAttr(gift.link || '')}', '${escapeAttr(gift.imageUrl || '')}')">Edit</button>${
          claimed
            ? ` <button class="btn btn-sm btn-warning" onclick="unclaimGift(${gift.row})">Unclaim</button>`
            : ''
        }
        <button class="btn btn-sm btn-danger" onclick="deleteGift(${gift.row})">Delete</button>
      </td>
    </tr>`;
    })
    .join('');
}

// ============================================================
// GIFTS — Add
// ============================================================
function openAddGiftForm() {
  document.getElementById('add-gift-form').style.display = 'block';
  document.getElementById('new-gift-name').focus();
}

function closeAddGiftForm() {
  document.getElementById('add-gift-form').style.display = 'none';
  document.getElementById('new-gift-name').value = '';
  document.getElementById('new-gift-link').value = '';
  document.getElementById('new-gift-image').value = '';
}

async function submitAddGift(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('new-gift-name').value.trim(),
    link: document.getElementById('new-gift-link').value.trim(),
    imageUrl: document.getElementById('new-gift-image').value.trim(),
  };

  try {
    const res = await fetch(
      `${API_URL}?action=adminAddGift&password=${encodeURIComponent(adminPassword)}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (data.success) {
      closeAddGiftForm();
      refreshGifts();
    } else {
      alert(data.error || 'Failed to add gift.');
    }
  } catch (err) {
    alert('Network error.');
  }
}

// ============================================================
// GIFTS — Edit Modal
// ============================================================
function openEditModal(row, name, link, imageUrl) {
  document.getElementById('edit-row').value = row;
  document.getElementById('edit-gift-name').value = name;
  document.getElementById('edit-gift-link').value = link;
  document.getElementById('edit-gift-image').value = imageUrl;
  document.getElementById('edit-modal').style.display = 'flex';
  document.getElementById('edit-gift-name').focus();
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
}

async function submitEditGift() {
  const row = document.getElementById('edit-row').value;
  const payload = {
    name: document.getElementById('edit-gift-name').value.trim(),
    link: document.getElementById('edit-gift-link').value.trim(),
    imageUrl: document.getElementById('edit-gift-image').value.trim(),
  };

  try {
    const res = await fetch(
      `${API_URL}?action=adminEditGift&row=${row}&password=${encodeURIComponent(adminPassword)}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (data.success) {
      closeEditModal();
      refreshGifts();
    } else {
      alert(data.error || 'Failed to edit gift.');
    }
  } catch (err) {
    alert('Network error.');
  }
}

// ============================================================
// GIFTS — Delete
// ============================================================
async function deleteGift(row) {
  if (!confirm('Are you sure you want to delete this gift?')) return;
  try {
    const res = await fetch(
      `${API_URL}?action=adminDeleteGift&row=${row}&password=${encodeURIComponent(adminPassword)}`
    );
    const data = await res.json();
    if (data.success) refreshGifts();
    else alert(data.error || 'Failed to delete.');
  } catch (err) {
    alert('Network error.');
  }
}

// ============================================================
// GIFTS — Unclaim
// ============================================================
async function unclaimGift(row) {
  if (!confirm('Unclaim this gift? It will become available again.')) return;
  try {
    const res = await fetch(
      `${API_URL}?action=adminUnclaimGift&row=${row}&password=${encodeURIComponent(adminPassword)}`
    );
    const data = await res.json();
    if (data.success) refreshGifts();
    else alert(data.error || 'Failed to unclaim.');
  } catch (err) {
    alert('Network error.');
  }
}

// ============================================================
// GIFTS — Refresh
// ============================================================
async function refreshGifts() {
  try {
    const res = await fetch(
      `${API_URL}?action=adminGetGifts&password=${encodeURIComponent(adminPassword)}`
    );
    const data = await res.json();
    if (data.success) renderAdminGifts(data.gifts);
  } catch (err) {
    alert('Failed to refresh gifts.');
  }
}

// ============================================================
// RSVPs — Load & Render
// ============================================================
async function loadRsvps() {
  try {
    const res = await fetch(
      `${API_URL}?action=adminGetRsvps&password=${encodeURIComponent(adminPassword)}`
    );
    const data = await res.json();
    if (data.success) renderRsvps(data.rsvps);
  } catch (err) {
    console.error('Failed to load RSVPs:', err);
  }
}

function renderRsvps(rsvps) {
  const tbody = document.getElementById('rsvps-tbody');
  const empty = document.getElementById('rsvps-empty');
  const summary = document.getElementById('rsvp-summary');

  if (!rsvps || rsvps.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    summary.innerHTML = '';
    document.getElementById('rsvps-table').style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  document.getElementById('rsvps-table').style.display = '';

  // Summary calculations
  const attending = rsvps.filter((r) => r.attending === 'Yes');
  const totalGuests = attending.reduce(
    (sum, r) => sum + (parseInt(r.partySize) || 1),
    0
  );
  const declined = rsvps.filter((r) => r.attending === 'No').length;

  summary.innerHTML = `
    <span class="summary-item">${attending.length} attending (${totalGuests} total guests)</span>
    <span class="summary-item">${declined} declined</span>
    <span class="summary-item">${rsvps.length} total responses</span>`;

  tbody.innerHTML = rsvps
    .map(
      (r) => `<tr>
    <td>${escapeHtml(r.name)}</td>
    <td><span class="badge ${r.attending === 'Yes' ? 'badge-available' : 'badge-claimed'}">${escapeHtml(r.attending)}</span></td>
    <td>${r.partySize || '\u2014'}</td>
    <td>${escapeHtml(r.notes || '\u2014')}</td>
    <td>${r.timestamp ? new Date(r.timestamp).toLocaleDateString() : '\u2014'}</td>
  </tr>`
    )
    .join('');
}

// ============================================================
// MODAL — Close on backdrop click or Escape key
// ============================================================
document.addEventListener('click', (e) => {
  const modal = document.getElementById('edit-modal');
  if (e.target === modal) {
    closeEditModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeEditModal();
  }
});

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Escapes HTML entities to prevent XSS in rendered content.
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Escapes a string for safe use inside an HTML attribute (e.g. onclick).
 */
function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
