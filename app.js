// ============================================================
// Baby Shower Invite — Guest Page JavaScript
// ============================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbz6uVPfP45HHCC7Z4kXMJm2_p0jkdZ9cudwcUFR_w7qiN5xJx7GKuYUJERIKtUWaHji/exec';

// State
let selectedGiftRow = null;
let selectedGiftName = '';
let giftSelectionMode = false;

document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  loadGifts();
  setupRsvpForm();
  setupAttendingToggle();
  setupBringingGiftToggle();
});

// ============================================================
// CONFIG
// ============================================================
async function loadConfig() {
  try {
    const res = await fetch(`${API_URL}?action=getConfig`);
    const data = await res.json();
    if (data.success) {
      const c = data.config;
      document.getElementById('event-title').textContent = c.event_name || 'Baby Shower';
      document.getElementById('event-date').textContent = c.date || '';
      document.getElementById('event-time').textContent = c.time || '';
      const locationEl = document.getElementById('event-location');
      const locationText = c.location || '';
      locationEl.textContent = locationText;
      if (locationText) {
        locationEl.href = 'https://www.google.com/maps/search/' + encodeURIComponent(locationText);
      }
      document.getElementById('event-message').textContent = c.message || '';
      const honoreeEl = document.getElementById('honoree-name');
      if (honoreeEl) {
        honoreeEl.textContent = c.honoree || '';
      }
    }
  } catch (err) {
    console.error('Failed to load config:', err);
  }
}

// ============================================================
// RSVP — show/hide party size + bringing gift question
// ============================================================
function setupAttendingToggle() {
  const radios = document.querySelectorAll('input[name="attending"]');
  const partyGroup = document.getElementById('party-size-group');
  const giftGroup = document.getElementById('bringing-gift-group');

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'Yes' && radio.checked) {
        partyGroup.style.display = 'block';
        giftGroup.style.display = 'block';
      } else if (radio.value === 'No' && radio.checked) {
        partyGroup.style.display = 'none';
        giftGroup.style.display = 'none';
        // Reset gift state
        document.getElementById('selected-gift-group').style.display = 'none';
        resetGiftSelection();
        // Reset bringing gift radios
        document.querySelectorAll('input[name="bringingGift"]').forEach(r => r.checked = false);
      }
    });
  });
}

// ============================================================
// RSVP — bringing gift toggle + auto-scroll
// ============================================================
function setupBringingGiftToggle() {
  const radios = document.querySelectorAll('input[name="bringingGift"]');
  const selectedGiftGroup = document.getElementById('selected-gift-group');

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'Yes' && radio.checked) {
        giftSelectionMode = true;
        selectedGiftGroup.style.display = 'block';
        // Re-render gifts with selectable state
        reRenderGiftsSelectable();
        // Auto-scroll to gift registry
        document.getElementById('gifts').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (radio.value === 'No' && radio.checked) {
        giftSelectionMode = false;
        selectedGiftGroup.style.display = 'none';
        resetGiftSelection();
        reRenderGiftsSelectable();
      }
    });
  });
}

function resetGiftSelection() {
  selectedGiftRow = null;
  selectedGiftName = '';
  giftSelectionMode = false;
  document.getElementById('selected-gift-row').value = '';
  const display = document.getElementById('selected-gift-display');
  display.textContent = 'None selected \u2014 please choose a gift from the registry below';
  display.classList.remove('has-gift');
}

// ============================================================
// RSVP — form submission
// ============================================================
function setupRsvpForm() {
  const form = document.getElementById('rsvp-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous validation messages
    const existingMsg = form.querySelector('.gift-validation-msg');
    if (existingMsg) existingMsg.remove();

    const attending = form.querySelector('input[name="attending"]:checked')?.value || 'No';
    const bringingGift = form.querySelector('input[name="bringingGift"]:checked')?.value;

    // Validate gift selection if attending and bringing a gift
    if (attending === 'Yes' && bringingGift === 'Yes' && !selectedGiftRow) {
      const msg = document.createElement('p');
      msg.className = 'gift-validation-msg';
      msg.textContent = 'Please select a gift from the registry below, or choose "Something of your choice".';
      const selectedGiftGroup = document.getElementById('selected-gift-group');
      selectedGiftGroup.appendChild(msg);
      document.getElementById('gifts').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    const payload = {
      name: form.querySelector('#rsvp-name').value.trim(),
      attending: attending,
      partySize: parseInt(form.querySelector('#party-size').value) || 1,
      notes: form.querySelector('#rsvp-notes').value.trim()
    };

    // Include gift selection if applicable
    if (attending === 'Yes' && bringingGift === 'Yes' && selectedGiftRow) {
      payload.giftRow = selectedGiftRow;
    }

    try {
      const res = await fetch(`${API_URL}?action=submitRsvp`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        form.innerHTML =
          '<p class="success-msg">' +
            "Thank you for your RSVP! We can\u2019t wait to celebrate with you." +
          '</p>';
        // Refresh gifts to show the claimed status
        loadGifts();
      } else {
        alert(data.error || 'Something went wrong. Please try again.');
        btn.disabled = false;
        btn.textContent = 'Send RSVP';
      }
    } catch (err) {
      alert('Network error. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Send RSVP';
    }
  });
}

// ============================================================
// GIFTS — load from API
// ============================================================
let cachedGifts = [];

async function loadGifts() {
  const grid = document.getElementById('gift-grid');
  grid.innerHTML = '<p class="loading">Loading gifts...</p>';

  try {
    const res = await fetch(`${API_URL}?action=getGifts`);
    const data = await res.json();
    if (data.success) {
      cachedGifts = data.gifts;
      renderGifts(data.gifts);
    }
  } catch (err) {
    grid.innerHTML = '<p class="loading">Gift list will appear once connected.</p>';
  }
}

function reRenderGiftsSelectable() {
  if (cachedGifts.length > 0) {
    renderGifts(cachedGifts);
  }
}

function renderGifts(gifts) {
  const grid = document.getElementById('gift-grid');

  if (!gifts || gifts.length === 0) {
    grid.innerHTML = '<p>No gifts listed yet. Check back soon!</p>';
    return;
  }

  grid.innerHTML = gifts.map(gift => {
    const claimed = !!gift.claimedBy;
    const isSelected = selectedGiftRow === String(gift.row);
    const selectable = giftSelectionMode && !claimed;

    return `
      <div class="gift-card ${claimed ? 'claimed' : ''} ${selectable ? 'selectable' : ''} ${!claimed && !giftSelectionMode ? 'available' : ''} ${isSelected ? 'selected' : ''}"
           ${selectable ? `onclick="selectGift(${gift.row}, '${escapeAttr(gift.name)}')"` : ''}
           ${!claimed && !giftSelectionMode ? `onclick="openClaimPrompt()"` : ''}>
        ${claimed ? '<span class="taken-badge">Taken</span>' : ''}
        ${gift.imageUrl ? `<div class="gift-img"><img src="${escapeAttr(gift.imageUrl)}" alt="${escapeAttr(gift.name)}" loading="lazy"></div>` : ''}
        <h3>${escapeHtml(gift.name)}</h3>
        ${gift.link ? `<a class="gift-link" href="${escapeAttr(gift.link)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">View Reference</a>` : ''}
      </div>`;
  }).join('') +
  `<div class="gift-card gift-card-surprise ${giftSelectionMode ? 'selectable' : ''} ${selectedGiftRow === 'surprise' ? 'selected' : ''}"
        ${giftSelectionMode ? `onclick="selectGift('surprise', 'Something of your choice')"` : ''}>
      <div class="gift-img gift-surprise-icon">
        <span>\uD83C\uDF81</span>
      </div>
      <h3>Something of your choice</h3>
      <p class="gift-surprise-text">Feel free to surprise us with something you'd love to give!</p>
    </div>`;
}

// ============================================================
// GIFT SELECTION
// ============================================================
function selectGift(row, giftName) {
  selectedGiftRow = String(row);
  selectedGiftName = giftName;
  document.getElementById('selected-gift-row').value = selectedGiftRow;

  const display = document.getElementById('selected-gift-display');
  display.textContent = '\u2713 ' + giftName;
  display.classList.add('has-gift');

  // Remove validation message if present
  const msg = document.querySelector('.gift-validation-msg');
  if (msg) msg.remove();

  // Re-render to update selection highlighting
  reRenderGiftsSelectable();

  // Scroll back to RSVP form
  document.getElementById('rsvp').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openClaimPrompt() {
  // When not in selection mode, prompt user to RSVP first
  alert('Please fill out the RSVP form above and select "Yes" to bringing a gift to claim a gift from the registry.');
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;');
}
