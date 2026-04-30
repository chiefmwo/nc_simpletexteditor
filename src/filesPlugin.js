/**
 * Files plugin – registers the "Edit with Simple Text Editor" context-menu
 * action for text/plain files in Nextcloud Files (API v4 / Nextcloud 30+).
 *
 * NOTE: When bundled properly with `npm run build`, this module uses the
 * official @nextcloud/files API and is guaranteed to work. The pre-built
 * js/editor-bundle.js uses a fallback event-bus approach instead.
 */

import { registerFileAction, FileAction, Permission } from '@nextcloud/files'
import { generateUrl } from '@nextcloud/router'

export function registerFilesPlugin() {
	const action = new FileAction({
		id: 'simpletexteditor-open',
		displayName: () => 'Mit Simple Text Editor bearbeiten',
		iconSvgInline: () =>
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
				stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
				aria-hidden="true">
				<path d="M12 20h9"/>
				<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
			</svg>`,

		// Only show for text/plain files the user may at least read
		enabled(nodes) {
			if (!nodes || nodes.length !== 1) return false
			const node = nodes[0]
			if (!node.mime?.startsWith('text/')) return false
			return (node.permissions & Permission.READ) !== 0
		},

		// @nextcloud/files v4 handler signature: ({ node, view, dir })
		async exec({ node }) {
			const fileId = node.fileid ?? node.fileId
			if (!fileId) return null
			window.location.href = generateUrl(`/apps/simpletexteditor/edit/${fileId}`)
			return null
		},

		order: 20,
	})

	registerFileAction(action)
}
