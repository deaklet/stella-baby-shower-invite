// === CONFIGURATION ===
const ADMIN_PASSWORD = 'stella123'; // Change this!
const SPREADSHEET_ID = '13be29XNkqqnqLnsONN6wUVHnXwMWIt7p8JSnWeEVIpc'; // Replace after creating sheet

function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

// === WEB APP ENTRY POINTS ===

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const action = (e.parameter && e.parameter.action) || '';
  let result;

  try {
    switch (action) {
      case 'getGifts':
        result = getGifts();
        break;
      case 'claimGift':
        result = claimGift(e.parameter.row, e.parameter.claimedBy);
        break;
      case 'submitRsvp':
        result = submitRsvp(JSON.parse(e.postData.contents));
        break;
      case 'getConfig':
        result = getConfig();
        break;
      // Admin actions
      case 'adminGetRsvps':
        result = adminAuth(e.parameter.password, () => getRsvps());
        break;
      case 'adminGetGifts':
        result = adminAuth(e.parameter.password, () => getGifts());
        break;
      case 'adminAddGift':
        result = adminAuth(e.parameter.password, () =>
          addGift(JSON.parse(e.postData.contents)));
        break;
      case 'adminEditGift':
        result = adminAuth(e.parameter.password, () =>
          editGift(e.parameter.row, JSON.parse(e.postData.contents)));
        break;
      case 'adminDeleteGift':
        result = adminAuth(e.parameter.password, () =>
          deleteGift(e.parameter.row));
        break;
      case 'adminUnclaimGift':
        result = adminAuth(e.parameter.password, () =>
          unclaimGift(e.parameter.row));
        break;
      case 'testExtract':
        result = testExtract(e.parameter.url);
        break;
      default:
        result = { error: 'Unknown action' };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// === AUTH ===

function adminAuth(password, fn) {
  if (password !== ADMIN_PASSWORD) {
    return { error: 'Invalid password' };
  }
  return fn();
}

// === CONFIG ===

function getConfig() {
  const sheet = getSheet('Config');
  const data = sheet.getDataRange().getValues();
  const config = {};
  data.forEach(row => { config[row[0]] = row[1]; });
  return { success: true, config };
}

// === IMAGE EXTRACTION ===

function extractImageFromUrl(url) {
  if (!url) return '';
  try {
    var apiUrl = 'https://api.microlink.io?url=' + encodeURIComponent(url);
    var response = UrlFetchApp.fetch(apiUrl, { muteHttpExceptions: true });
    var data = JSON.parse(response.getContentText());
    if (data.status === 'success' && data.data && data.data.image && data.data.image.url) {
      return data.data.image.url;
    }
  } catch (e) {
    // Silently fail — image is optional
  }
  return '';
}

function testExtract(url) {
  if (!url) return { error: 'No URL provided' };
  try {
    var apiUrl = 'https://api.microlink.io?url=' + encodeURIComponent(url);
    var response = UrlFetchApp.fetch(apiUrl, { muteHttpExceptions: true });
    var raw = response.getContentText();
    var data = JSON.parse(raw);
    var imageUrl = (data.status === 'success' && data.data && data.data.image && data.data.image.url) ? data.data.image.url : '';
    return { success: true, imageUrl: imageUrl, microlinkStatus: data.status };
  } catch (e) {
    return { error: e.message, stack: e.stack };
  }
}

// === GIFTS ===

function getGifts() {
  const sheet = getSheet('Gifts');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const gifts = [];
  for (let i = 1; i < data.length; i++) {
    gifts.push({
      row: i + 1,
      name: data[i][0],
      imageUrl: data[i][1],
      link: data[i][2],
      claimedBy: data[i][3] || '',
      claimedAt: data[i][4] || ''
    });
  }
  return { success: true, gifts };
}

function claimGift(row, claimedBy) {
  const sheet = getSheet('Gifts');
  row = parseInt(row);
  const current = sheet.getRange(row, 4).getValue();
  if (current) {
    return { error: 'This gift has already been claimed.' };
  }
  sheet.getRange(row, 4).setValue(claimedBy);
  sheet.getRange(row, 5).setValue(new Date().toISOString());
  return { success: true };
}

function addGift(data) {
  const sheet = getSheet('Gifts');
  const imageUrl = data.imageUrl || extractImageFromUrl(data.link);
  sheet.appendRow([data.name, imageUrl, data.link, '', '']);
  return { success: true };
}

function editGift(row, data) {
  const sheet = getSheet('Gifts');
  row = parseInt(row);
  const imageUrl = data.imageUrl || extractImageFromUrl(data.link);
  sheet.getRange(row, 1).setValue(data.name);
  sheet.getRange(row, 2).setValue(imageUrl);
  sheet.getRange(row, 3).setValue(data.link);
  return { success: true };
}

function deleteGift(row) {
  const sheet = getSheet('Gifts');
  sheet.deleteRow(parseInt(row));
  return { success: true };
}

function unclaimGift(row) {
  const sheet = getSheet('Gifts');
  row = parseInt(row);
  sheet.getRange(row, 4).setValue('');
  sheet.getRange(row, 5).setValue('');
  return { success: true };
}

// === RSVPS ===

function submitRsvp(data) {
  // If bringing a gift from registry, claim it first
  if (data.giftRow && data.giftRow !== 'surprise') {
    const giftSheet = getSheet('Gifts');
    const row = parseInt(data.giftRow);
    const current = giftSheet.getRange(row, 4).getValue();
    if (current) {
      return { success: false, error: 'This gift has already been claimed by someone else. Please select a different gift.' };
    }
    giftSheet.getRange(row, 4).setValue(data.name);
    giftSheet.getRange(row, 5).setValue(new Date().toISOString());
  }

  const sheet = getSheet('RSVPs');
  sheet.appendRow([
    data.name,
    data.attending,
    data.partySize || 1,
    data.notes || '',
    new Date().toISOString()
  ]);
  return { success: true };
}

function getRsvps() {
  const sheet = getSheet('RSVPs');
  const data = sheet.getDataRange().getValues();
  const rsvps = [];
  for (let i = 1; i < data.length; i++) {
    rsvps.push({
      name: data[i][0],
      attending: data[i][1],
      partySize: data[i][2],
      notes: data[i][3],
      timestamp: data[i][4]
    });
  }
  return { success: true, rsvps };
}
