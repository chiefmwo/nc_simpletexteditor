# Simple Text Editor – Nextcloud App

A modern, dark-themed plain-text editor for Nextcloud 30–33 with search, replace and autosave.

## Features

- Opens `text/plain` files directly in the browser via a Files context-menu action
- Full-screen dark editor with JetBrains Mono font (bundled, no Google Fonts)
- Incremental search with **Next / Previous** navigation
- Optional **Replace** and **Replace all**
- **Autosave** 1.5 s after the last keystroke, plus manual save (button or `Ctrl+S`)
- Pure PHP backend, no external PHP packages needed

---

## Installation

### 1. Copy the app into Nextcloud

```bash
cp -r nc_simpletexteditor /path/to/nextcloud/apps/simpletexteditor
```

The target directory name **must** be `simpletexteditor` (matches the app ID in `info.xml`).

### 2. Enable the app

```bash
php /path/to/nextcloud/occ app:enable simpletexteditor
```

Or enable it through **Settings → Apps → Not enabled → Simple Text Editor**.

### 3. (Optional) Rebuild the JS bundle

A pre-built `js/editor-bundle.js` is included so the app works out of the box.  
If you want to rebuild from source (e.g. after modifying `src/`):

```bash
cd /path/to/nextcloud/apps/simpletexteditor
npm install
npm run build          # production build → js/editor-bundle.js
# or:
npm run dev            # development build with watch
```

Node.js ≥ 18 and npm ≥ 9 are required for the build step.

---

## Where the action appears

1. Open the **Files** app in Nextcloud.
2. Right-click (or click the `⋯` kebab menu) on any `.txt` or `text/plain` file.
3. Select **"Mit Simple Text Editor bearbeiten"**.

The editor opens in the same browser tab.  Clicking the browser's Back button returns you to the file list.

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+S` / `⌘S` | Save |
| `Enter` in search box | Next match |
| `Shift+Enter` in search box | Previous match |

---

## Routes

| Method | URL | Purpose |
|--------|-----|---------|
| `GET` | `/index.php/apps/simpletexteditor/edit/{fileId}` | Editor HTML view |
| `GET` | `/index.php/apps/simpletexteditor/api/file/{fileId}` | Load file content |
| `PUT` | `/index.php/apps/simpletexteditor/api/file/{fileId}` | Save file content |

---

## Directory structure

```
simpletexteditor/
├── appinfo/
│   ├── info.xml           # App metadata, NC version requirements
│   └── routes.php         # URL → controller mapping
├── css/
│   ├── editor.css         # Dark-theme stylesheet
│   └── fonts/
│       └── JetBrainsMono-Regular.woff2
├── js/
│   └── editor-bundle.js   # Pre-built standalone bundle (committed)
├── lib/
│   ├── AppInfo/
│   │   └── Application.php
│   └── Controller/
│       └── EditorController.php
├── src/                   # Build sources (Webpack)
│   ├── main.js
│   ├── editor.js
│   └── filesPlugin.js
├── templates/
│   └── editor.php
├── package.json
├── webpack.config.js
└── README.md
```

---

## Compatibility

| Nextcloud | Status |
|-----------|--------|
| 33.x (Hub 26 Winter) | ✅ tested target |
| 30–32 | ✅ should work |
| < 30 | ⚠️ untested |

PHP 8.1 or later required.

---

## License

AGPL-3.0-or-later – see [LICENSE](LICENSE).
