# Baby Shower Invite — Setup Guide

Follow these steps to get your baby shower invite site live in about 15 minutes.

---

## 1. Create Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet.
2. Rename the default sheet tab to **RSVPs** and add these headers in Row 1:

   | A | B | C | D | E |
   |---|---|---|---|---|
   | Name | Attending | Party Size | Notes | Timestamp |

3. Add a second tab named **Gifts** with these headers in Row 1:

   | A | B | C | D | E |
   |---|---|---|---|---|
   | Name | Description | Price Range | Claimed By | Claimed At |

4. Add a third tab named **Config** with two columns. Fill in your event details:

   | A (key) | B (value) |
   |---------|-----------|
   | event_name | Your event name |
   | date | Saturday, April 12, 2026 |
   | time | 2:00 PM – 5:00 PM |
   | location | Venue name and address |
   | message | Welcome message for guests |

5. Copy the **Spreadsheet ID** from the URL — it's the long string between `/d/` and `/edit`:

   ```
   https://docs.google.com/spreadsheets/d/THIS_IS_YOUR_ID/edit
   ```

---

## 2. Set Up Google Apps Script

1. In your Google Sheet, go to **Extensions > Apps Script**.
2. Delete any existing code in `Code.gs`.
3. Copy and paste the entire contents of `gas/Code.gs` from this project.
4. At the top of the script, update these two constants:

   ```javascript
   const SPREADSHEET_ID = 'paste-your-spreadsheet-id-here';
   const ADMIN_PASSWORD = 'choose-a-password';
   ```

5. Save with **Ctrl+S** (or **Cmd+S** on Mac).

---

## 3. Deploy as Web App

1. Click **Deploy > New deployment**.
2. Click the **gear icon** next to "Select type" and choose **Web app**.
3. Fill in the settings:
   - **Description**: Baby Shower Invite API (or anything you like)
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**.
5. When prompted, click **Authorize access** and sign in with your Google account.
   - You may see an "unsafe app" warning — click **Advanced > Go to [project name] (unsafe)**. This is your own script; it's safe.
6. Copy the **Web App URL** — you'll need it in the next step.

---

## 4. Connect Frontend to API

1. Open `app.js` and replace `YOUR_APPS_SCRIPT_URL` with the Web App URL:

   ```javascript
   const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
   ```

2. Open `admin.js` and replace `YOUR_APPS_SCRIPT_URL` with the same URL.

---

## 5. Test Locally

1. Open `index.html` in your browser (double-click the file or drag it into Chrome).
2. Check that the event details (date, time, location, message) load from your Config tab.
3. Submit a test RSVP and verify a new row appears in the **RSVPs** sheet tab.
4. Open `admin.html` and log in with your admin password.
5. Add a test gift via the admin page, then go back to `index.html` and claim it — confirm it shows as "Taken".

---

## 6. Deploy to GitHub Pages

1. Create a new repository at [github.com/new](https://github.com/new).
   - Give it any name, e.g. `baby-shower-invite`.
   - Set it to **Public**.
2. Push the contents of this folder to the repo:

   ```bash
   cd /path/to/baby-shower-invite
   git init
   git add .
   git commit -m "Initial deploy"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/baby-shower-invite.git
   git push -u origin main
   ```

3. In the repo on GitHub, go to **Settings > Pages**.
4. Under **Build and deployment**, set:
   - **Source**: Deploy from a branch
   - **Branch**: main
   - **Folder**: / (root)
5. Click **Save**. GitHub will build the site — it usually takes 1–2 minutes.
6. Your site will be live at:

   ```
   https://YOUR_USERNAME.github.io/baby-shower-invite/
   ```

---

## 7. Share!

- Send the GitHub Pages URL to your guests.
- Use `admin.html` (same URL, just open the file or navigate to `/admin.html`) to manage the gift list and view RSVPs.

---

## Troubleshooting

**Event details not loading / RSVP fails**
- Double-check that `API_URL` in `app.js` and `admin.js` matches the Web App URL exactly.
- Make sure the deployment is set to "Execute as: Me" and "Who has access: Anyone".
- If you change the script code, you must create a **new deployment** (not update the existing one) for the URL to reflect the latest code.

**"Authorization required" error in the browser console**
- Open the Web App URL directly in a browser tab. If it asks you to log in, your deployment permissions may not be set to "Anyone". Re-deploy with the correct setting.

**Admin page won't log in**
- Confirm `ADMIN_PASSWORD` in `Code.gs` matches what you're typing.
- Make sure you re-deployed after changing the password.

**GitHub Pages shows a blank page**
- Check that `index.html` is at the root of the repo (not inside a subfolder).
- Wait a couple of minutes and hard-refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`).
