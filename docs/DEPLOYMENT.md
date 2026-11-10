# Deployment & installation

LifeOS is a static site: HTML, CSS, JavaScript and icons. Any HTTPS static host works. The code contains no personal data, so the code can be public; your data never leaves your phone.

> Do not commit backups (`lifeos-backup-*.json`), starter files or CSV exports to the repository. `.gitignore` blocks the usual file names.

## Option A: GitHub Pages

1. Merge the `lifeos-3.0` branch into `main` (or choose the branch in step 2).
2. Repository → **Settings → Pages → Build and deployment → Deploy from a branch** → `main` / root → Save.
3. Wait for the green check, then open `https://<username>.github.io/lifeos/`.

## Option B: Netlify Drop

Drag the `lifeos` folder onto https://app.netlify.com/drop. You get an HTTPS link immediately.

## Install on Android (Chrome)

1. Open the HTTPS link in Chrome and wait a few seconds on the home screen.
2. Tap **⋮ → Install app** (or **Add to Home screen**).
3. Open LifeOS from the home-screen icon once while online. The service worker caches every file.
4. Check **More → Settings → Offline status**: "Offline engine: Active" and "Cached app files: 30".
5. Turn on airplane mode and open LifeOS. Everything should work.

On iPhone use Safari → Share → **Add to Home Screen**. Haptics are not available on iOS browsers.

## First run

- Fill in the profile form, **or** tap **Restore a backup or starter file** and choose your private `lifeos-starter-dhruv.json`.
- Set a CMA weekly target, a monthly budget and the Dubai target date when you are ready.

## Updating

When you change any file, bump `VERSION` in `sw.js` (for example `lifeos-v3.0.1`). Installed apps download the new files in the background and show "Update ready. Reopen LifeOS to use it."

## Moving to a new phone

Settings → **JSON backup** on the old phone → copy the file privately (USB, personal drive) → install LifeOS on the new phone → **Restore**.
