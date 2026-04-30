/**
 * Entry point – loaded on every Nextcloud page that includes this bundle.
 *
 * 1. If #ste-app is present  →  mount the editor.
 * 2. Always register the Files plugin so the context-menu action is available.
 */

import { registerFilesPlugin } from './filesPlugin.js'
import { mountEditor }         from './editor.js'

// Register the Files action globally (runs in the Files app context)
try {
	registerFilesPlugin()
} catch (e) {
	// @nextcloud/files may not be available outside the Files app – that's fine.
	console.debug('[simpletexteditor] filesPlugin skipped:', e.message)
}

// Mount the editor when the dedicated view is loaded
document.addEventListener('DOMContentLoaded', () => {
	const container = document.getElementById('ste-app')
	if (container) {
		mountEditor(container)
	}
})
