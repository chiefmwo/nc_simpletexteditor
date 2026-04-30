/**
 * Simple Text Editor – core editor logic.
 * Mounts itself into #ste-app and communicates with the PHP backend.
 */

// ─── DOM skeleton ────────────────────────────────────────────────────────────

function buildUI(container) {
	container.innerHTML = `
<div class="ste-layout">
  <div class="ste-toolbar">
    <span class="ste-filename" id="ste-filename"></span>

    <div class="ste-toolbar-group">
      <button id="ste-save-btn" class="ste-btn ste-btn-primary" title="Save (Ctrl+S)">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        Speichern
      </button>
      <span id="ste-status" class="ste-status"></span>
    </div>

    <div class="ste-toolbar-group ste-search-group">
      <input id="ste-search-input" class="ste-input" type="text" placeholder="Suchen…" aria-label="Suchen">
      <button id="ste-prev-btn"  class="ste-btn" title="Vorheriger Treffer (Shift+Enter)">&#8679;</button>
      <button id="ste-next-btn"  class="ste-btn" title="Nächster Treffer (Enter)">&#8681;</button>
      <span id="ste-match-info" class="ste-match-info"></span>
    </div>

    <div class="ste-toolbar-group ste-replace-group">
      <input id="ste-replace-input" class="ste-input" type="text" placeholder="Ersetzen durch…" aria-label="Ersetzen durch">
      <button id="ste-replace-btn"     class="ste-btn">Ersetzen</button>
      <button id="ste-replace-all-btn" class="ste-btn">Alle ersetzen</button>
    </div>
  </div>

  <textarea id="ste-editor" class="ste-editor" spellcheck="false" autocorrect="off"
            autocapitalize="off" wrap="off"></textarea>
</div>`
}

// ─── Search state ─────────────────────────────────────────────────────────────

const searchState = {
	term: '',
	matches: [],   // array of start-indices
	current: -1,
}

function buildMatches(text, term) {
	if (!term) return []
	const matches = []
	let idx = 0
	const lower = text.toLowerCase()
	const lowerTerm = term.toLowerCase()
	while ((idx = lower.indexOf(lowerTerm, idx)) !== -1) {
		matches.push(idx)
		idx += lowerTerm.length
	}
	return matches
}

function highlightMatch(textarea, matches, index) {
	if (matches.length === 0 || index < 0) return
	const start = matches[index]
	const end = start + searchState.term.length
	textarea.focus()
	textarea.setSelectionRange(start, end)
	// Scroll the match into view
	const lineHeight = parseInt(getComputedStyle(textarea).lineHeight, 10) || 20
	const lines = textarea.value.substring(0, start).split('\n').length
	textarea.scrollTop = Math.max(0, (lines - 3) * lineHeight)
}

function updateMatchInfo(el, matches, current) {
	if (!searchState.term) {
		el.textContent = ''
		return
	}
	el.textContent = matches.length === 0
		? '0 Treffer'
		: `${current + 1} / ${matches.length}`
}

// ─── Autosave ────────────────────────────────────────────────────────────────

let autosaveTimer = null

function scheduleAutosave(saveCallback) {
	clearTimeout(autosaveTimer)
	autosaveTimer = setTimeout(saveCallback, 1500)
}

// ─── Status display ──────────────────────────────────────────────────────────

let statusTimer = null

function showStatus(el, msg, isError = false) {
	clearTimeout(statusTimer)
	el.textContent = msg
	el.className = 'ste-status' + (isError ? ' ste-status-error' : ' ste-status-ok')
	statusTimer = setTimeout(() => { el.textContent = '' ; el.className = 'ste-status' }, 3000)
}

// ─── API helpers ─────────────────────────────────────────────────────────────

async function loadFile(url, requestToken) {
	const res = await fetch(url, {
		headers: {
			'requesttoken': requestToken,
			'Accept': 'application/json',
		},
	})
	if (!res.ok) throw new Error(`HTTP ${res.status}`)
	const data = await res.json()
	return data.content ?? ''
}

async function saveFile(url, content, requestToken) {
	const res = await fetch(url, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			'requesttoken': requestToken,
		},
		body: JSON.stringify({ content }),
	})
	if (!res.ok) {
		const data = await res.json().catch(() => ({}))
		throw new Error(data.error ?? `HTTP ${res.status}`)
	}
}

// ─── Mount ───────────────────────────────────────────────────────────────────

export function mountEditor(container) {
	const fileId       = container.dataset.fileId
	const fileName     = container.dataset.fileName
	const loadUrl      = container.dataset.loadUrl
	const saveUrl      = container.dataset.saveUrl
	const requestToken = container.dataset.requestToken

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

	filenameLbl.textContent = fileName

	// ── Load content ────────────────────────────────────────────────────────
	loadFile(loadUrl, requestToken)
		.then(content => { textarea.value = content })
		.catch(err => showStatus(statusEl, `Ladefehler: ${err.message}`, true))

	// ── Save ────────────────────────────────────────────────────────────────
	const doSave = () => {
		saveFile(saveUrl, textarea.value, requestToken)
			.then(() => showStatus(statusEl, 'Gespeichert ✓'))
			.catch(err => showStatus(statusEl, `Fehler: ${err.message}`, true))
	}

	saveBtn.addEventListener('click', doSave)

	textarea.addEventListener('input', () => scheduleAutosave(doSave))

	document.addEventListener('keydown', e => {
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault()
			doSave()
		}
	})

	// ── Search ──────────────────────────────────────────────────────────────
	const runSearch = () => {
		const term = searchInput.value
		searchState.term = term
		searchState.matches = buildMatches(textarea.value, term)
		searchState.current = searchState.matches.length > 0 ? 0 : -1
		if (searchState.current >= 0) highlightMatch(textarea, searchState.matches, searchState.current)
		updateMatchInfo(matchInfo, searchState.matches, searchState.current)
	}

	searchInput.addEventListener('input', runSearch)

	searchInput.addEventListener('keydown', e => {
		if (e.key === 'Enter') {
			e.preventDefault()
			e.shiftKey ? goPrev() : goNext()
		}
	})

	const goNext = () => {
		if (searchState.matches.length === 0) return
		searchState.current = (searchState.current + 1) % searchState.matches.length
		highlightMatch(textarea, searchState.matches, searchState.current)
		updateMatchInfo(matchInfo, searchState.matches, searchState.current)
	}

	const goPrev = () => {
		if (searchState.matches.length === 0) return
		searchState.current = (searchState.current - 1 + searchState.matches.length) % searchState.matches.length
		highlightMatch(textarea, searchState.matches, searchState.current)
		updateMatchInfo(matchInfo, searchState.matches, searchState.current)
	}

	nextBtn.addEventListener('click', goNext)
	prevBtn.addEventListener('click', goPrev)

	// ── Replace ─────────────────────────────────────────────────────────────
	replaceBtn.addEventListener('click', () => {
		if (searchState.matches.length === 0 || searchState.current < 0) return
		const start = searchState.matches[searchState.current]
		const end   = start + searchState.term.length
		const val   = textarea.value
		textarea.value = val.substring(0, start) + replaceInput.value + val.substring(end)
		// Re-run search to update match list
		runSearch()
		scheduleAutosave(doSave)
	})

	replAllBtn.addEventListener('click', () => {
		if (!searchState.term) return
		const escaped = searchState.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		textarea.value = textarea.value.replace(new RegExp(escaped, 'gi'), replaceInput.value)
		runSearch()
		scheduleAutosave(doSave)
	})
}
