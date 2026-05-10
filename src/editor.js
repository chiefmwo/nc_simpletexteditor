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

      <div class="ste-toolbar-group ste-search-group">
        <input id="ste-search-input" class="ste-input" type="search" placeholder="Suchen…" aria-label="Suchen">
        <button id="ste-prev-btn"  class="ste-btn" title="Vorheriger Treffer (Shift+Enter)" aria-label="Vorheriger Treffer">↑</button>
        <button id="ste-next-btn"  class="ste-btn" title="Nächster Treffer (Enter)"         aria-label="Nächster Treffer">↓</button>
        <span id="ste-match-info" class="ste-match-info" aria-live="polite"></span>
      </div>

      <div class="ste-toolbar-group ste-replace-group">
        <input id="ste-replace-input" class="ste-input" type="text" placeholder="Ersetzen durch…" aria-label="Ersetzen durch">
        <button id="ste-replace-btn"     class="ste-btn">Ersetzen</button>
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

// ─── Search helpers ───────────────────────────────────────────────────────────

function buildMatches(text, term) {
	if (!term) return []
	const matches = []
	const lower = text.toLowerCase()
	const lowerTerm = term.toLowerCase()
	const termLen = lowerTerm.length
	let idx = 0
	while ((idx = lower.indexOf(lowerTerm, idx)) !== -1) {
		matches.push(idx)
		idx += termLen
	}
	return matches
}

function highlightMatch(textarea, matches, index, termLen) {
	if (!matches.length || index < 0) return
	const start = matches[index]
	textarea.focus()
	textarea.setSelectionRange(start, start + termLen)
	// scrollTop estimation: avoid O(n) split by using the caret position
	// natively exposed by the browser after setSelectionRange.
	// We nudge scrollTop only when the caret is outside the visible area.
	const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight, 10) || 20
	const visibleLines = Math.floor(textarea.clientHeight / lineHeight)
	// Approximate line of the match without splitting the whole string:
	// count newlines only up to `start` using lastIndexOf in a loop – still
	// O(k) where k = match position, but avoids allocating a new array.
	let linesBefore = 0
	let pos = -1
	while ((pos = textarea.value.indexOf('\n', pos + 1)) !== -1 && pos < start) {
		linesBefore++
	}
	const targetScrollTop = Math.max(0, (linesBefore - Math.floor(visibleLines / 2)) * lineHeight)
	textarea.scrollTop = targetScrollTop
}

function updateMatchInfo(el, matches, current) {
	if (!matches.length) {
		el.textContent = matches._searched ? '0 Treffer' : ''
		return
	}
	el.textContent = `${current + 1} / ${matches.length}`
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
	const searchInput  = document.getElementById('ste-search-input')
	const prevBtn      = document.getElementById('ste-prev-btn')
	const nextBtn      = document.getElementById('ste-next-btn')
	const matchInfo    = document.getElementById('ste-match-info')
	const replaceInput = document.getElementById('ste-replace-input')
	const replaceBtn   = document.getElementById('ste-replace-btn')
	const replAllBtn   = document.getElementById('ste-replace-all-btn')
	const exitBtn      = document.getElementById('ste-exit-btn')
	const themeBtn     = document.getElementById('ste-theme-btn')

	filenameLbl.textContent = fileName

	setupThemeToggle(themeBtn)

	// Local search state – not shared across mounts
	const state = { term: '', matches: [], current: -1 }

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
			// Inside a non-empty search field, clear it instead of exiting
			if (document.activeElement === searchInput && searchInput.value) {
				searchInput.value = ''
				runSearch()
				return
			}
			e.preventDefault()
			exitEditor()
		}
	}
	document.addEventListener('keydown', onKeydown)

	// ── Search (debounced 150 ms to avoid scanning on every keystroke) ──────
	const runSearch = debounce(() => {
		state.term    = searchInput.value
		state.matches = buildMatches(textarea.value, state.term)
		state.matches._searched = !!state.term
		state.current = state.matches.length > 0 ? 0 : -1
		if (state.current >= 0) highlightMatch(textarea, state.matches, state.current, state.term.length)
		updateMatchInfo(matchInfo, state.matches, state.current)
	}, 150)

	searchInput.addEventListener('input', runSearch)
	searchInput.addEventListener('keydown', e => {
		if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? goPrev() : goNext() }
	})

	const goNext = () => {
		if (!state.matches.length) return
		state.current = (state.current + 1) % state.matches.length
		highlightMatch(textarea, state.matches, state.current, state.term.length)
		updateMatchInfo(matchInfo, state.matches, state.current)
	}

	const goPrev = () => {
		if (!state.matches.length) return
		state.current = (state.current - 1 + state.matches.length) % state.matches.length
		highlightMatch(textarea, state.matches, state.current, state.term.length)
		updateMatchInfo(matchInfo, state.matches, state.current)
	}

	nextBtn.addEventListener('click', goNext)
	prevBtn.addEventListener('click', goPrev)

	// ── Replace ─────────────────────────────────────────────────────────────
	replaceBtn.addEventListener('click', () => {
		if (!state.matches.length || state.current < 0) return
		const start = state.matches[state.current]
		const end   = start + state.term.length
		const val   = textarea.value
		textarea.value = val.substring(0, start) + replaceInput.value + val.substring(end)
		runSearch()
		debouncedAutosave()
	})

	replAllBtn.addEventListener('click', () => {
		if (!state.term) return
		// Compile the regex once per click (not in a loop)
		const escaped = state.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		const re = new RegExp(escaped, 'gi')
		textarea.value = textarea.value.replace(re, replaceInput.value)
		runSearch()
		debouncedAutosave()
	})

	// ── Cleanup (call if editor is ever unmounted) ───────────────────────────
	return () => {
		document.removeEventListener('keydown', onKeydown)
		saver.abort()
	}
}
