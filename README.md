# DEKurs · Deutsch B1.1 — installable version

A self-contained offline study app. Once installed on your phone it never touches the network again.

## Why this exists

The iPhone Files app previews HTML with JavaScript disabled, and iOS Safari cannot open local
`file://` pages. So a downloaded single HTML file cannot run on an iPhone. Putting the same app
behind any https URL solves it: Safari runs it properly, and the service worker caches everything
so it works in airplane mode.

## Deploy (about two minutes, needs a computer once)

**Vercel**
1. Go to vercel.com/new
2. Drag this whole folder onto the page
3. Deploy. You get a URL like `karteikasten.vercel.app`

**Netlify** — same idea: app.netlify.com/drop, drag the folder.

**GitHub Pages** — push the folder to a repo, Settings → Pages → deploy from branch.

Any static host works. There is no build step and no dependencies.

## Install on the phone

**iPhone** — open the URL in **Safari** (this only works in Safari, not Chrome):
Share button → Add to Home Screen → Add. Open it once from the home screen while online so the
service worker finishes caching. After that it runs in airplane mode.

**Android** — open the URL in Chrome, then menu → Install app / Add to home screen.

## Files

- `index.html` — the whole app: data, styles, logic
- `sw.js` — service worker, caches everything for offline use
- `manifest.webmanifest` — app name, icon, standalone display
- `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` — home screen icons

## Notes

- Progress lives in the browser's local storage for that URL. Use **Sicherung speichern** in the
  Fortschritt tab to export a JSON backup, and **Sicherung laden** to restore it on another device.
- To edit the word list or the drills, open `index.html` and look for the `VOCAB`, `GRAMMAR`,
  `VERBS` and `SENTENCES` arrays near the top of the script.
- After editing, bump `CACHE = "dekurs-v4"` in `sw.js` to the next number so installed phones pick up
  the new version.
