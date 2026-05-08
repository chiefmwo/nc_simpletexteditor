/**
 * Entry point – loaded on every Nextcloud page that includes this bundle.
 *
 * 1. If #ste-app is present  →  mount the editor.
 * 2. Always register the Files plugin so the context-menu action is available.
 */

import { registerFilesPlugin } from './filesPlugin.js'
import { mountEditor }         from './editor.js'

try {
	registerFilesPlugin()
} catch {
	// Not loaded inside the Files app — safe to ignore.
}

document.addEventListener('DOMContentLoaded', () => {
	const container = document.getElementById('ste-app')
	if (container) {
		mountEditor(container)
	}
})
