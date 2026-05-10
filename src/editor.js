/**
 * Simple Text Editor – core editor logic.
 * Mounts itself into #ste-app and communicates with the PHP backend.
 */

// ─── DOM skeleton ─────────────────────────────────────────────────────────────

function buildUI(container) {
	container.innerHTML = `
<div class="ste-layout">
  <div class="ste-toolbar">
    <div class="ste-toolbar-inner">
      <span class="ste-filename" id="ste-filename"></span>

      <div class="ste-toolbar-group">
        <button id="ste-save-btn" class="ste-btn ste-btn-primary" title="Save (Ctrl+S)">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
               aria-hidden="true">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Speichern
        </button>
        <span id="ste-status" class="ste-status" aria-live="polite"></span>
      </div>

      <div class="ste-toolbar-group ste-replace-group">
        <input id="ste-find-input"    class="ste-input" type="text" placeholder="Suchtext…"       aria-label="Suchtext">
        <input id="ste-replace-input" class="ste-input" type="text" placeholder="Ersetzen durch…" aria-label="Ersetzen durch">
        <button id="ste-replace-all-btn" class="ste-btn">Alle ersetzen</button>
      </div>

      <div class="ste-toolbar-group ste-theme-group">
        <button id="ste-theme-btn" class="ste-btn" title="Theme wechseln" aria-label="Theme wechseln">
          <svg class="ste-theme-icon ste-theme-icon-moon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
               aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <svg class="ste-theme-icon ste-theme-icon-sun" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
               aria-hidden="true">
            <circle cx="12" cy="12" r="4"/>
            <line x1="12" y1="2"  x2="12" y2="4"/>
            <line x1="12" y1="20" x2="12" y2="22"/>
            <line x1="2"  y1="12" x2="4"  y2="12"/>
            <line x1="20" y1="12" x2="22" y2="12"/>
            <line x1="4.93"  y1="4.93"  x2="6.34"  y2="6.34"/>
            <line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/>
            <line x1="4.93"  y1="19.07" x2="6.34"  y2="17.66"/>
            <line x1="17.66" y1="6.34"  x2="19.07" y2="4.93"/>
          </svg>
        </button>
      </div>

      <div class="ste-toolbar-group ste-exit-group">
        <button id="ste-exit-btn" class="ste-btn" title="Schließen (Esc)" aria-label="Editor schließen">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
               aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Schließen
        </button>
      </div>
    </div>
  </div>

  <textarea id="ste-editor" class="ste-editor" spellcheck="false" autocorrect="off"
            autocapitalize="off" wrap="soft"></textarea>
</div>`
}

// ─── Theme handling ───────────────────────────────────────────────────────────

function initTheme() {
	const stored = (() => {
		try { return localStorage.getItem('ste-theme') } catch { return null }
	})()
	const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
	const theme = stored || (prefersDark ? 'dark' : 'light')
	document.documentElement.setAttribute('data-theme', theme)
	return theme
}

function setupThemeToggle(btn) {
	btn.addEventListener('click', () => {
		const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
		const next    = current === 'dark' ? 'light' : 'dark'
		document.documentElement.setAttribute('data-theme', next)
		try { localStorage.setItem('ste-theme', next) } catch { /* ignore */ }
	})
}

// ─── Autosave / debounce ──────────────────────────────────────────────────────

function debounce(fn, delay) {
	let timer = null
	return (...args) => {
		clearTimeout(timer)
		timer = setTimeout(() => fn(...args), delay)
	}
}

// ─── Status display ───────────────────────────────────────────────────────────

function makeStatusShower(el) {
	let timer = null
	return (msg, isError = false) => {
		clearTimeout(timer)
		el.textContent = msg
		el.className = 'ste-status' + (isError ? ' ste-status-error' : ' ste-status-ok')
		timer = setTimeout(() => { el.textContent = ''; el.className = 'ste-status' }, 3000)
	}
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function loadFile(url, requestToken) {
	const res = await fetch(url, {
		headers: { requesttoken: requestToken, Accept: 'application/json' },
	})
	if (!res.ok) throw new Error(`HTTP ${res.status}`)
	const data = await res.json()
	return data.content ?? ''
}

// Returns a cancel function; calling it aborts any in-flight request.
function makeSaveFile(url, requestToken) {
	let controller = null
	return {
		save: async (content) => {
			// Cancel any still-running save before starting a new one.
			if (controller) controller.abort()
			controller = new AbortController()
			const signal = controller.signal
			const res = await fetch(url, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					requesttoken: requestToken,
				},
				body: JSON.stringify({ content }),
				signal,
			})
			controller = null
			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				throw new Error(data.error ?? `HTTP ${res.status}`)
			}
		},
		abort: () => { if (controller) controller.abort() },
	}
}

// ─── Mount ────────────────────────────────────────────────────────────────────

export function mountEditor(container) {
	const fileName     = container.dataset.fileName   || ''
	const loadUrl      = container.dataset.loadUrl    || ''
	const saveUrl      = container.dataset.saveUrl    || ''
	const requestToken = container.dataset.requestToken
		|| document.querySelector('head[data-requesttoken]')?.dataset.requesttoken
		|| window.OC?.requestToken
		|| ''

	initTheme()
	buildUI(container)

	const textarea     = document.getElementById('ste-editor')
	const filenameLbl  = document.getElementById('ste-filename')
	const saveBtn      = document.getElementById('ste-save-btn')
	const statusEl     = document.getElementById('ste-status')
	const findInput    = document.getElementById('ste-find-input')
	const replaceInput = document.getElementById('ste-replace-input')
	const replAllBtn   = document.getElementById('ste-replace-all-btn')
	const exitBtn      = document.getElementById('ste-exit-btn')
	const themeBtn     = document.getElementById('ste-theme-btn')

	filenameLbl.textContent = fileName

	setupThemeToggle(themeBtn)

	const showStatus = makeStatusShower(statusEl)
	const saver = makeSaveFile(saveUrl, requestToken)

	// ── Load content ────────────────────────────────────────────────────────
	if (loadUrl) {
		loadFile(loadUrl, requestToken)
			.then(content => { textarea.value = content })
			.catch(err => showStatus(`Ladefehler: ${err.message}`, true))
	}

	// ── Save ────────────────────────────────────────────────────────────────
	const doSave = () => {
		saver.save(textarea.value)
			.then(() => showStatus('Gespeichert ✓'))
			.catch(err => {
				if (err.name !== 'AbortError') showStatus(`Fehler: ${err.message}`, true)
			})
	}

	const debouncedAutosave = debounce(doSave, 1500)

	saveBtn.addEventListener('click', doSave)
	textarea.addEventListener('input', debouncedAutosave)

	// ── Exit (button + Escape key) ──────────────────────────────────────────
	const exitEditor = async () => {
		showStatus('Speichere…')
		try {
			await saver.save(textarea.value)
		} catch {
			// Best-effort save before navigating; ignore errors.
		}
		if (history.length > 1) {
			history.back()
		} else {
			window.location.href = '/'
		}
	}
	exitBtn.addEventListener('click', exitEditor)

	// Global Ctrl+S and Escape – stored for cleanup
	const onKeydown = (e) => {
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault()
			doSave()
			return
		}
		if (e.key === 'Escape') {
			e.preventDefault()
			exitEditor()
		}
	}
	document.addEventListener('keydown', onKeydown)

	// ── Replace all ─────────────────────────────────────────────────────────
	replAllBtn.addEventListener('click', () => {
		const term = findInput.value
		if (!term) return
		const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		const re = new RegExp(escaped, 'gi')
		textarea.value = textarea.value.replace(re, replaceInput.value)
		debouncedAutosave()
	})

	// ── Cleanup (call if editor is ever unmounted) ───────────────────────────
	return () => {
		document.removeEventListener('keydown', onKeydown)
		saver.abort()
	}
}
