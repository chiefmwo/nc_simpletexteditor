/**
 * Files plugin – registers the Simple Text Editor as the DEFAULT opener
 * for text/plain files in Nextcloud Files (API v4 / Nextcloud 30+).
 *
 * v4 API: actions are plain objects implementing IFileAction; all
 * callbacks receive a destructured ActionContext with a `nodes` array.
 * State is stored under window._nc_files_scope.v4_0, so the bundled
 * @nextcloud/files MUST match the major version NC uses internally.
 */

import { registerFileAction, Permission, DefaultType, getFileActions } from '@nextcloud/files'
import { generateUrl } from '@nextcloud/router'

export function registerFilesPlugin() {
	console.info('[simpletexteditor] registering FileAction')
	registerFileAction({
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
		enabled({ nodes }) {
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

		// Fires on single file click (DefaultType.DEFAULT)
		async exec({ nodes }) {
			const node = nodes?.[0]
			const fileId = node?.fileid ?? node?.fileId
			console.info('[simpletexteditor] exec() ->', { fileId })
			if (!fileId) return null
			window.location.href = generateUrl(`/apps/simpletexteditor/edit/${fileId}`)
			return null
		},

		// Claim the single-click default for matching files
		default: DefaultType.DEFAULT,

		// Very low order to win against any other default action
		order: -1000,
	})

	// Confirm the v4 scoped global is what we're talking to.
	const dump = (label) => {
		try {
			const fromApi = getFileActions().map(a => a.id)
			const v4Scope = window?._nc_files_scope?.v4_0
			const v4Actions = v4Scope?.fileActions
				? [...v4Scope.fileActions.keys()]
				: '<absent>'
			console.info(`[simpletexteditor] ${label}`, {
				fromApi,
				v4Actions,
			})
		} catch (e) {
			console.warn(`[simpletexteditor] ${label} failed:`, e)
		}
	}

	dump('registry probe (immediately)')
	setTimeout(() => dump('registry probe (after 2s)'), 2000)
}
