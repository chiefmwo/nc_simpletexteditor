/*!
 * Simple Text Editor – Nextcloud 33 App
 * Pre-built bundle (Vanilla JS, no transpiler required)
 *
 * This file is committed so the app works without a Node.js build step.
 * Run `npm install && npm run build` to regenerate from src/ with proper
 * tree-shaking and the official @nextcloud/files API.
 */
(function () {
    'use strict';

    // =========================================================================
    // 1.  FILES PLUGIN  (registers the context-menu action in NC Files)
    //     Uses the @nextcloud/event-bus global so the Files app picks it up
    //     regardless of which bundle each action came from.
    // =========================================================================

    function generateUrl(path) {
        const base = window.OC?.generateUrl ? window.OC.generateUrl(path) : path;
        return base;
    }

    function buildFileAction() {
        return {
            id: 'simpletexteditor-open',

            // @nextcloud/files v3 handler: (nodes, view) => string
            displayName: function () { return 'Mit Simple Text Editor bearbeiten'; },

            iconSvgInline: function () {
                return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"' +
                    ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<path d="M12 20h9"/>' +
                    '<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>' +
                    '</svg>';
            },

            // Only show for text/plain files the current user may read
            enabled: function (nodes) {
                if (!nodes || nodes.length !== 1) return false;
                var node = nodes[0];
                var mime = node.mime || node.mimetype || '';
                if (mime !== 'text/plain') return false;
                // Permission 1 = READ
                var perms = node.permissions !== undefined ? node.permissions : node.sharePermissions;
                return perms === undefined || (perms & 1) !== 0;
            },

            // Handler: navigate to the editor page
            exec: function (node /*, view, dir */) {
                var fileId = node.fileid ?? node.fileId ?? node.id;
                if (!fileId) return Promise.resolve(null);
                var url = generateUrl('/apps/simpletexteditor/edit/' + fileId);
                window.location.href = url;
                return Promise.resolve(null);
            },

            order: 20,
        };
    }

    function registerFileAction() {
        var action = buildFileAction();

        // Primary: use the shared @nextcloud/event-bus global.
        // The Files app (Nextcloud 30+) subscribes to 'files:action:updated'
        // and adds the action from the event payload to its internal list.
        var bus = window.__nc_event_bus;
        if (bus && typeof bus.emit === 'function') {
            bus.emit('files:action:updated', { action: action });
        }

        // Fallback: older Nextcloud / OCA.Files.fileActions shim
        var legacyActions = window.OCA && window.OCA.Files && window.OCA.Files.fileActions;
        if (legacyActions && typeof legacyActions.register === 'function') {
            legacyActions.register(
                'text/plain',
                'simpletexteditor-open',
                OC.PERMISSION_READ,
                '',
                function (filename, context) {
                    var fileId = context.$file && context.$file.data('id');
                    if (!fileId) return;
                    window.location.href = generateUrl('/apps/simpletexteditor/edit/' + fileId);
                },
                'Mit Simple Text Editor bearbeiten'
            );
        }
    }

    // Try once immediately (if Files app already booted) and once after load.
    function initFilesPlugin() {
        try {
            registerFileAction();
        } catch (e) {
            console.debug('[simpletexteditor] filesPlugin error:', e);
        }
    }

    // The Files app may not have set up the event bus yet at script-parse time.
    // Attempt registration at DOMContentLoaded and additionally a bit later.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFilesPlugin);
    } else {
        initFilesPlugin();
    }
    // Second attempt after a tick, in case the bus is created asynchronously
    setTimeout(initFilesPlugin, 0);

    // =========================================================================
    // 2.  EDITOR UI  (only active when #ste-app exists in the DOM)
    // =========================================================================

    // ── DOM builder ──────────────────────────────────────────────────────────

    function buildUI(container) {
        container.innerHTML =
            '<div class="ste-layout">' +
            '  <div class="ste-toolbar">' +
            '    <span class="ste-filename" id="ste-filename"></span>' +
            '    <div class="ste-toolbar-group">' +
            '      <button id="ste-save-btn" class="ste-btn ste-btn-primary" title="Speichern (Ctrl+S)">' +
            '        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"' +
            '             fill="none" stroke="currentColor" stroke-width="2"' +
            '             stroke-linecap="round" stroke-linejoin="round">' +
            '          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>' +
            '          <polyline points="17 21 17 13 7 13 7 21"/>' +
            '          <polyline points="7 3 7 8 15 8"/>' +
            '        </svg>' +
            '        Speichern' +
            '      </button>' +
            '      <span id="ste-status" class="ste-status"></span>' +
            '    </div>' +
            '    <div class="ste-toolbar-group ste-search-group">' +
            '      <input id="ste-search-input" class="ste-input" type="text"' +
            '             placeholder="Suchen…" aria-label="Suchen">' +
            '      <button id="ste-prev-btn" class="ste-btn" title="Vorheriger Treffer (Shift+Enter)">↑</button>' +
            '      <button id="ste-next-btn" class="ste-btn" title="Nächster Treffer (Enter)">↓</button>' +
            '      <span id="ste-match-info" class="ste-match-info"></span>' +
            '    </div>' +
            '    <div class="ste-toolbar-group ste-replace-group">' +
            '      <input id="ste-replace-input" class="ste-input" type="text"' +
            '             placeholder="Ersetzen durch…" aria-label="Ersetzen durch">' +
            '      <button id="ste-replace-btn"     class="ste-btn">Ersetzen</button>' +
            '      <button id="ste-replace-all-btn" class="ste-btn">Alle ersetzen</button>' +
            '    </div>' +
            '  </div>' +
            '  <textarea id="ste-editor" class="ste-editor" spellcheck="false"' +
            '            autocorrect="off" autocapitalize="off" wrap="off"></textarea>' +
            '</div>';
    }

    // ── Search helpers ────────────────────────────────────────────────────────

    var searchState = { term: '', matches: [], current: -1 };

    function buildMatches(text, term) {
        if (!term) return [];
        var matches = [];
        var idx = 0;
        var lower = text.toLowerCase();
        var lowerTerm = term.toLowerCase();
        while ((idx = lower.indexOf(lowerTerm, idx)) !== -1) {
            matches.push(idx);
            idx += lowerTerm.length;
        }
        return matches;
    }

    function highlightMatch(textarea, matches, index) {
        if (!matches.length || index < 0) return;
        var start = matches[index];
        var end = start + searchState.term.length;
        textarea.focus();
        textarea.setSelectionRange(start, end);
        var lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight, 10) || 20;
        var lines = textarea.value.substring(0, start).split('\n').length;
        textarea.scrollTop = Math.max(0, (lines - 3) * lineHeight);
    }

    function updateMatchInfo(el, matches, current) {
        if (!searchState.term) { el.textContent = ''; return; }
        el.textContent = matches.length === 0
            ? '0 Treffer'
            : (current + 1) + ' / ' + matches.length;
    }

    // ── Autosave ──────────────────────────────────────────────────────────────

    var autosaveTimer = null;

    function scheduleAutosave(cb) {
        clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(cb, 1500);
    }

    // ── Status display ────────────────────────────────────────────────────────

    var statusTimer = null;

    function showStatus(el, msg, isError) {
        clearTimeout(statusTimer);
        el.textContent = msg;
        el.className = 'ste-status' + (isError ? ' ste-status-error' : ' ste-status-ok');
        statusTimer = setTimeout(function () {
            el.textContent = '';
            el.className = 'ste-status';
        }, 3000);
    }

    // ── API helpers ───────────────────────────────────────────────────────────

    function getRequestToken(container) {
        return container.dataset.requestToken ||
            document.querySelector('head[data-requesttoken]')?.dataset.requesttoken ||
            window.OC?.requestToken || '';
    }

    function loadFile(url, token) {
        return fetch(url, {
            headers: { 'requesttoken': token, 'Accept': 'application/json' },
        }).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        }).then(function (data) {
            return data.content !== undefined ? data.content : '';
        });
    }

    function saveFile(url, content, token) {
        return fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'requesttoken': token,
            },
            body: JSON.stringify({ content: content }),
        }).then(function (res) {
            if (!res.ok) {
                return res.json().catch(function () { return {}; }).then(function (data) {
                    throw new Error(data.error || 'HTTP ' + res.status);
                });
            }
        });
    }

    // ── Mount ─────────────────────────────────────────────────────────────────

    function mountEditor(container) {
        var fileName     = container.dataset.fileName   || '';
        var loadUrl      = container.dataset.loadUrl    || '';
        var saveUrl      = container.dataset.saveUrl    || '';
        var requestToken = getRequestToken(container);

        buildUI(container);

        var textarea     = document.getElementById('ste-editor');
        var filenameLbl  = document.getElementById('ste-filename');
        var saveBtn      = document.getElementById('ste-save-btn');
        var statusEl     = document.getElementById('ste-status');
        var searchInput  = document.getElementById('ste-search-input');
        var prevBtn      = document.getElementById('ste-prev-btn');
        var nextBtn      = document.getElementById('ste-next-btn');
        var matchInfo    = document.getElementById('ste-match-info');
        var replaceInput = document.getElementById('ste-replace-input');
        var replaceBtn   = document.getElementById('ste-replace-btn');
        var replAllBtn   = document.getElementById('ste-replace-all-btn');

        filenameLbl.textContent = fileName;
        textarea.focus();

        // Load file
        if (loadUrl) {
            loadFile(loadUrl, requestToken)
                .then(function (content) { textarea.value = content; })
                .catch(function (err) { showStatus(statusEl, 'Ladefehler: ' + err.message, true); });
        }

        // Save
        function doSave() {
            saveFile(saveUrl, textarea.value, requestToken)
                .then(function () { showStatus(statusEl, 'Gespeichert ✓'); })
                .catch(function (err) { showStatus(statusEl, 'Fehler: ' + err.message, true); });
        }

        saveBtn.addEventListener('click', doSave);
        textarea.addEventListener('input', function () { scheduleAutosave(doSave); });
        document.addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                doSave();
            }
        });

        // Search
        function runSearch() {
            searchState.term = searchInput.value;
            searchState.matches = buildMatches(textarea.value, searchState.term);
            searchState.current = searchState.matches.length > 0 ? 0 : -1;
            if (searchState.current >= 0) {
                highlightMatch(textarea, searchState.matches, searchState.current);
            }
            updateMatchInfo(matchInfo, searchState.matches, searchState.current);
        }

        function goNext() {
            if (!searchState.matches.length) return;
            searchState.current = (searchState.current + 1) % searchState.matches.length;
            highlightMatch(textarea, searchState.matches, searchState.current);
            updateMatchInfo(matchInfo, searchState.matches, searchState.current);
        }

        function goPrev() {
            if (!searchState.matches.length) return;
            searchState.current = (searchState.current - 1 + searchState.matches.length) % searchState.matches.length;
            highlightMatch(textarea, searchState.matches, searchState.current);
            updateMatchInfo(matchInfo, searchState.matches, searchState.current);
        }

        searchInput.addEventListener('input', runSearch);
        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? goPrev() : goNext(); }
        });
        nextBtn.addEventListener('click', goNext);
        prevBtn.addEventListener('click', goPrev);

        // Replace
        replaceBtn.addEventListener('click', function () {
            if (!searchState.matches.length || searchState.current < 0) return;
            var start = searchState.matches[searchState.current];
            var end   = start + searchState.term.length;
            var val   = textarea.value;
            textarea.value = val.substring(0, start) + replaceInput.value + val.substring(end);
            runSearch();
            scheduleAutosave(doSave);
        });

        replAllBtn.addEventListener('click', function () {
            if (!searchState.term) return;
            var escaped = searchState.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            textarea.value = textarea.value.replace(new RegExp(escaped, 'gi'), replaceInput.value);
            runSearch();
            scheduleAutosave(doSave);
        });
    }

    // ── Boot ──────────────────────────────────────────────────────────────────

    function boot() {
        var container = document.getElementById('ste-app');
        if (container) {
            mountEditor(container);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

}());
