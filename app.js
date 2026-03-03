// ============================================================
// Baby Shower Invite — Guest Page JavaScript
// ============================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbxAhaOluuSMr4f3FPjeYFqDT0apj8XgMrQDtZL8Q6-36EzXotb_iq2uOFwVTQPuPIM/exec'; // Replace after deploying

document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  loadGifts();
  setupRsvpForm();
  setupAttendingToggle();
});

// ============================================================
// CONFIG — fetches event details from Google Sheet Config tab
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
      // Set honoree name if available
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
// RSVP — show/hide party size based on attending Yes/No
// ============================================================
function setupAttendingToggle() {
  const radios = document.querySelectorAll('input[name="attending"]');
  const partyGroup = document.getElementById('party-size-group');

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'Yes' && radio.checked) {
        partyGroup.style.display = 'block';
      } else if (radio.value === 'No' && radio.checked) {
        partyGroup.style.display = 'none';
      }
    });
  });
}

// ============================================================
// RSVP — form submission
// ============================================================
function setupRsvpForm() {
  const form = document.getElementById('rsvp-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    const payload = {
      name: form.querySelector('#rsvp-name').value.trim(),
      attending: form.querySelector('input[name="attending"]:checked')?.value || 'No',
      partySize: parseInt(form.querySelector('#party-size').value) || 1,
      notes: form.querySelector('#rsvp-notes').value.trim()
    };

    try {
      const res = await fetch(`${API_URL}?action=submitRsvp`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        form.innerHTML =
          '<p class="success-msg">' +
            "Thank you for your RSVP! We can't wait to celebrate with you." +
          '</p>';
      } else {
        alert('Something went wrong. Please try again.');
        btn.disabled = false;
        btn.textContent = 'Submit RSVP';
      }
    } catch (err) {
      alert('Network error. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Submit RSVP';
    }
  });
}

// ============================================================
// GIFTS — load from API
// ============================================================
async function loadGifts() {
  const grid = document.getElementById('gift-grid');
  grid.innerHTML = '<p class="loading">Loading gifts...</p>';

  try {
    const res = await fetch(`${API_URL}?action=getGifts`);
    const data = await res.json();
    if (data.success) {
      renderGifts(data.gifts);
    }
  } catch (err) {
    grid.innerHTML = '<p class="loading">Gift list will appear once connected.</p>';
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
    return `
      <div class="gift-card ${claimed ? 'claimed' : 'available'}"
           ${!claimed ? `onclick="openClaimModal(${gift.row}, '${escapeAttr(gift.name)}')"` : ''}>
        ${claimed ? '<span class="taken-badge">Taken</span>' : ''}
        ${gift.imageUrl ? `<div class="gift-img"><img src="${escapeAttr(gift.imageUrl)}" alt="${escapeAttr(gift.name)}" loading="lazy"></div>` : ''}
        <h3>${escapeHtml(gift.name)}</h3>
        ${gift.link ? `<a class="gift-link" href="${escapeAttr(gift.link)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">View Reference</a>` : ''}
      </div>`;
  }).join('');
}

// ============================================================
// CLAIM MODAL
// ============================================================
function openClaimModal(row, giftName) {
  const modal = document.getElementById('claim-modal');
  document.getElementById('claim-gift-name').textContent = giftName;
  document.getElementById('claim-row').value = row;
  document.getElementById('claim-name').value = '';
  modal.style.display = 'flex';
}

function closeClaimModal() {
  document.getElementById('claim-modal').style.display = 'none';
}

// Close modal when clicking the backdrop (outside the card)
document.addEventListener('click', (e) => {
  const modal = document.getElementById('claim-modal');
  if (e.target === modal) {
    closeClaimModal();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeClaimModal();
  }
});

async function confirmClaim() {
  const row = document.getElementById('claim-row').value;
  const name = document.getElementById('claim-name').value.trim();

  if (!name) {
    alert('Please enter your name.');
    return;
  }

  const btn = document.querySelector('#claim-modal button.confirm');
  btn.disabled = true;
  btn.textContent = 'Claiming...';

  try {
    const res = await fetch(
      `${API_URL}?action=claimGift&row=${row}&claimedBy=${encodeURIComponent(name)}`
    );
    const data = await res.json();

    if (data.success) {
      closeClaimModal();
      loadGifts(); // Refresh the gift list
    } else {
      alert(data.error || 'Could not claim gift. It may have already been taken.');
    }
  } catch (err) {
    alert('Network error. Please try again.');
  }

  btn.disabled = false;
  btn.textContent = 'Claim This Gift';
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Escapes HTML entities to prevent XSS in rendered content.
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Escapes a string for safe use inside an HTML attribute (e.g. onclick).
 * Handles quotes and backslashes.
 */
function escapeAttr(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;');
}
