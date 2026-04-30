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
        return window.OC && typeof window.OC.generateUrl === 'function'
            ? window.OC.generateUrl(path)
            : path;
    }

    function buildFileAction() {
        return {
            id: 'simpletexteditor-open',
            displayName: function () { return 'Mit Simple Text Editor bearbeiten'; },
            iconSvgInline: function () {
                return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"' +
                    ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' +
                    ' aria-hidden="true">' +
                    '<path d="M12 20h9"/>' +
                    '<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>' +
                    '</svg>';
            },
            // Only show for text/* files the user may read (NC permission READ = 1)
            enabled: function (nodes) {
                if (!nodes || nodes.length !== 1) return false;
                var node = nodes[0];
                var mime = node.mime || node.mimetype || '';
                if (!mime.startsWith('text/')) return false;
                var perms = node.permissions !== undefined ? node.permissions : node.sharePermissions;
                return perms === undefined || (perms & 1) !== 0;
            },
            exec: function (node) {
                var fileId = node.fileid !== undefined ? node.fileid
                           : node.fileId !== undefined ? node.fileId
                           : node.id;
                if (!fileId) return Promise.resolve(null);
                window.location.href = generateUrl('/apps/simpletexteditor/edit/' + fileId);
                return Promise.resolve(null);
            },
            order: 20,
        };
    }

    function tryRegisterFileAction() {
        var action = buildFileAction();

        // Primary: shared @nextcloud/event-bus global (Nextcloud 30+).
        // The Files app (Vue SPA) subscribes to 'files:action:updated' and reads
        // the action object directly from the event payload.
        var bus = window.__nc_event_bus;
        if (bus && typeof bus.emit === 'function') {
            bus.emit('files:action:updated', { action: action });
        }

        // Fallback: legacy OCA.Files.fileActions shim (Nextcloud < 30)
        var legacyActions = window.OCA && window.OCA.Files && window.OCA.Files.fileActions;
        if (legacyActions && typeof legacyActions.register === 'function') {
            legacyActions.register(
                'text/plain',
                'simpletexteditor-open',
                window.OC ? window.OC.PERMISSION_READ : 1,
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

    // The Files app is a Vue SPA that mounts asynchronously after DOMContentLoaded.
    // We emit on a backoff schedule so we catch the window after the Vue app has
    // set up its event-bus subscriptions, regardless of client/server speed.
    // Emitting more than once is harmless – the Files app deduplicates by action id.
    var _retryDelays = [0, 250, 1000, 3000];
    var _retryCount  = 0;

    function scheduleRetries() {
        _retryDelays.forEach(function (delay) {
            setTimeout(function () {
                _retryCount++;
                try { tryRegisterFileAction(); } catch (e) { /* intentionally silent */ }
            }, delay);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleRetries);
    } else {
        scheduleRetries();
    }

    // =========================================================================
    // 2.  EDITOR UI  (only active when #ste-app exists in the DOM)
    // =========================================================================

    // ── DOM builder ──────────────────────────────────────────────────────────

    function buildUI(container) {
        container.innerHTML =
            '<div class="ste-layout">' +
            '<div class="ste-toolbar">' +
            '<span class="ste-filename" id="ste-filename"></span>' +
            '<div class="ste-toolbar-group">' +
            '<button id="ste-save-btn" class="ste-btn ste-btn-primary" title="Speichern (Ctrl+S)">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"' +
            ' fill="none" stroke="currentColor" stroke-width="2"' +
            ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>' +
            '<polyline points="17 21 17 13 7 13 7 21"/>' +
            '<polyline points="7 3 7 8 15 8"/>' +
            '</svg>Speichern</button>' +
            '<span id="ste-status" class="ste-status" aria-live="polite"></span>' +
            '</div>' +
            '<div class="ste-toolbar-group ste-search-group">' +
            '<input id="ste-search-input" class="ste-input" type="search"' +
            ' placeholder="Suchen…" aria-label="Suchen">' +
            '<button id="ste-prev-btn" class="ste-btn" title="Vorheriger Treffer (Shift+Enter)"' +
            ' aria-label="Vorheriger Treffer">↑</button>' +
            '<button id="ste-next-btn" class="ste-btn" title="Nächster Treffer (Enter)"' +
            ' aria-label="Nächster Treffer">↓</button>' +
            '<span id="ste-match-info" class="ste-match-info" aria-live="polite"></span>' +
            '</div>' +
            '<div class="ste-toolbar-group ste-replace-group">' +
            '<input id="ste-replace-input" class="ste-input" type="text"' +
            ' placeholder="Ersetzen durch…" aria-label="Ersetzen durch">' +
            '<button id="ste-replace-btn" class="ste-btn">Ersetzen</button>' +
            '<button id="ste-replace-all-btn" class="ste-btn">Alle ersetzen</button>' +
            '</div>' +
            '</div>' +
            '<textarea id="ste-editor" class="ste-editor" spellcheck="false"' +
            ' autocorrect="off" autocapitalize="off" wrap="off"></textarea>' +
            '</div>';
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    function debounce(fn, delay) {
        var timer = null;
        return function () {
            var args = arguments;
            var ctx = this;
            clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
        };
    }

    function makeStatusShower(el) {
        var timer = null;
        return function (msg, isError) {
            clearTimeout(timer);
            el.textContent = msg;
            el.className = 'ste-status' + (isError ? ' ste-status-error' : ' ste-status-ok');
            timer = setTimeout(function () {
                el.textContent = '';
                el.className = 'ste-status';
            }, 3000);
        };
    }

    // ── Search ────────────────────────────────────────────────────────────────

    function buildMatches(text, term) {
        if (!term) return [];
        var matches = [];
        var lower = text.toLowerCase();
        var lowerTerm = term.toLowerCase();
        var termLen = lowerTerm.length;
        var idx = 0;
        while ((idx = lower.indexOf(lowerTerm, idx)) !== -1) {
            matches.push(idx);
            idx += termLen;
        }
        return matches;
    }

    function highlightMatch(textarea, matches, index, termLen) {
        if (!matches.length || index < 0) return;
        var start = matches[index];
        textarea.focus();
        textarea.setSelectionRange(start, start + termLen);
        // Avoid O(n) split: count newlines up to the match position only.
        var linesBefore = 0;
        var pos = -1;
        var text = textarea.value;
        while ((pos = text.indexOf('\n', pos + 1)) !== -1 && pos < start) {
            linesBefore++;
        }
        var lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight, 10) || 20;
        var visibleLines = Math.floor(textarea.clientHeight / lineHeight);
        textarea.scrollTop = Math.max(0, (linesBefore - Math.floor(visibleLines / 2)) * lineHeight);
    }

    function updateMatchInfo(el, matches, current) {
        if (!matches.length) {
            el.textContent = matches._searched ? '0 Treffer' : '';
            return;
        }
        el.textContent = (current + 1) + ' / ' + matches.length;
    }

    // ── API helpers ───────────────────────────────────────────────────────────

    function getRequestToken(container) {
        return container.dataset.requestToken ||
            (document.querySelector('head[data-requesttoken]') || {}).dataset.requesttoken ||
            (window.OC && window.OC.requestToken) || '';
    }

    function loadFile(url, token) {
        return fetch(url, {
            headers: { requesttoken: token, Accept: 'application/json' },
        }).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        }).then(function (data) {
            return data.content !== undefined ? data.content : '';
        });
    }

    // Returns a save function that cancels any in-flight request before sending a new one.
    function makeSaver(url, token) {
        var controller = null;
        return {
            save: function (content) {
                if (controller) { controller.abort(); }
                controller = new AbortController();
                var signal = controller.signal;
                var self = this;
                return fetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', requesttoken: token },
                    body: JSON.stringify({ content: content }),
                    signal: signal,
                }).then(function (res) {
                    controller = null;
                    if (!res.ok) {
                        return res.json().catch(function () { return {}; }).then(function (data) {
                            throw new Error(data.error || 'HTTP ' + res.status);
                        });
                    }
                });
            },
            abort: function () { if (controller) controller.abort(); },
        };
    }

    // ── Mount ─────────────────────────────────────────────────────────────────

    function mountEditor(container) {
        var fileName     = container.dataset.fileName || '';
        var loadUrl      = container.dataset.loadUrl  || '';
        var saveUrl      = container.dataset.saveUrl  || '';
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

        // Local state per mount (no global leak)
        var state = { term: '', matches: [], current: -1 };
        var showStatus = makeStatusShower(statusEl);
        var saver = makeSaver(saveUrl, requestToken);

        // Load
        if (loadUrl) {
            loadFile(loadUrl, requestToken)
                .then(function (content) { textarea.value = content; })
                .catch(function (err) { showStatus('Ladefehler: ' + err.message, true); });
        }

        // Save
        function doSave() {
            saver.save(textarea.value)
                .then(function () { showStatus('Gespeichert ✓'); })
                .catch(function (err) {
                    if (err.name !== 'AbortError') showStatus('Fehler: ' + err.message, true);
                });
        }

        var debouncedAutosave = debounce(doSave, 1500);

        saveBtn.addEventListener('click', doSave);
        textarea.addEventListener('input', debouncedAutosave);

        // Global Ctrl+S – captured for cleanup
        function onKeydown(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                doSave();
            }
        }
        document.addEventListener('keydown', onKeydown);

        // Search – debounced 150 ms so large files aren't scanned on every keystroke
        var runSearch = debounce(function () {
            state.term = searchInput.value;
            var matches = buildMatches(textarea.value, state.term);
            matches._searched = !!state.term;
            state.matches = matches;
            state.current = matches.length > 0 ? 0 : -1;
            if (state.current >= 0) highlightMatch(textarea, matches, state.current, state.term.length);
            updateMatchInfo(matchInfo, matches, state.current);
        }, 150);

        searchInput.addEventListener('input', runSearch);
        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? goPrev() : goNext(); }
        });

        function goNext() {
            if (!state.matches.length) return;
            state.current = (state.current + 1) % state.matches.length;
            highlightMatch(textarea, state.matches, state.current, state.term.length);
            updateMatchInfo(matchInfo, state.matches, state.current);
        }

        function goPrev() {
            if (!state.matches.length) return;
            state.current = (state.current - 1 + state.matches.length) % state.matches.length;
            highlightMatch(textarea, state.matches, state.current, state.term.length);
            updateMatchInfo(matchInfo, state.matches, state.current);
        }

        nextBtn.addEventListener('click', goNext);
        prevBtn.addEventListener('click', goPrev);

        // Replace
        replaceBtn.addEventListener('click', function () {
            if (!state.matches.length || state.current < 0) return;
            var start = state.matches[state.current];
            var end   = start + state.term.length;
            var val   = textarea.value;
            textarea.value = val.substring(0, start) + replaceInput.value + val.substring(end);
            runSearch();
            debouncedAutosave();
        });

        replAllBtn.addEventListener('click', function () {
            if (!state.term) return;
            // Compile once per click, not inside a loop
            var escaped = state.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            textarea.value = textarea.value.replace(new RegExp(escaped, 'gi'), replaceInput.value);
            runSearch();
            debouncedAutosave();
        });

        // Return cleanup function for dynamic unmount scenarios
        return function cleanup() {
            document.removeEventListener('keydown', onKeydown);
            saver.abort();
        };
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
