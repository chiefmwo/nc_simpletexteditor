/**
 * Files plugin – registers the Simple Text Editor as the DEFAULT opener
 * for text/plain files in Nextcloud Files (API v4 / Nextcloud 30+).
 *
 * DefaultType.DEFAULT means the action fires on single click (not just
 * in the context menu).  A proper webpack build via `npm run build` or
 * the GitHub Actions CI workflow is required for this to work reliably.
 */

import { registerFileAction, FileAction, Permission, DefaultType } from '@nextcloud/files'
import { generateUrl } from '@nextcloud/router'

export function registerFilesPlugin() {
	console.info('[simpletexteditor] registering FileAction')
	registerFileAction(new FileAction({
		id: 'simpletexteditor-open',

		displayName: () => 'Mit Simple Text Editor bearbeiten',

		iconSvgInline: () =>
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
				stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
				aria-hidden="true">
				<path d="M12 20h9"/>
				<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
			</svg>`,

		// Only show for text/* files the user may at least read
		enabled(nodes) {
			if (!nodes || nodes.length !== 1) return false
			const node = nodes[0]
			if (!node.mime?.startsWith('text/')) return false
			return (node.permissions & Permission.READ) !== 0
		},

		// Fires on file click (DefaultType.DEFAULT) and in the context menu
		async exec({ node }) {
			const fileId = node.fileid ?? node.fileId
			if (!fileId) return null
			window.location.href = generateUrl(`/apps/simpletexteditor/edit/${fileId}`)
			return null
		},

		// DEFAULT = fires on single click; also stays visible in context menu
		default: DefaultType.DEFAULT,

		order: 20,
	}))
}
