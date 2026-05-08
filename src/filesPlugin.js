/**
 * Files plugin – registers the Simple Text Editor as the DEFAULT opener
 * for text/plain files in Nextcloud Files (API v4 / Nextcloud 30+).
 *
 * DefaultType.DEFAULT means the action fires on single click (not just
 * in the context menu).  A proper webpack build via `npm run build` or
 * the GitHub Actions CI workflow is required for this to work reliably.
 */

import { registerFileAction, FileAction, Permission, DefaultType, getFileActions } from '@nextcloud/files'
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
			const ok = nodes
				&& nodes.length === 1
				&& nodes[0].mime?.startsWith('text/')
				&& (nodes[0].permissions & Permission.READ) !== 0
			console.info('[simpletexteditor] enabled() ->', ok, {
				count: nodes?.length,
				mime: nodes?.[0]?.mime,
				permissions: nodes?.[0]?.permissions,
			})
			return !!ok
		},

		// Fires on file click (DefaultType.DEFAULT)
		async exec(node) {
			const fileId = node?.fileid ?? node?.fileId
			console.info('[simpletexteditor] exec() ->', { fileId, node })
			if (!fileId) return null
			window.location.href = generateUrl(`/apps/simpletexteditor/edit/${fileId}`)
			return null
		},

		// Claim the single-click default for matching files
		default: DefaultType.DEFAULT,

		// Very low order to win against any other default action
		order: -1000,
	}))

	// Diagnose: is our action in the *same* registry the Files app reads from?
	// If we see only "simpletexteditor-open" here, our bundle has its own
	// private @nextcloud/files singleton and the Files app never sees us.
	try {
		const actions = getFileActions()
		console.info('[simpletexteditor] registry contents (immediately):',
			actions.map(a => a.id))

		setTimeout(() => {
			const later = getFileActions()
			console.info('[simpletexteditor] registry contents (after 2s):',
				later.map(a => a.id))
		}, 2000)
	} catch (e) {
		console.warn('[simpletexteditor] could not inspect registry:', e)
	}
}
