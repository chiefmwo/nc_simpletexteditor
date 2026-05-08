/**
 * Files plugin – registers the Simple Text Editor as the default opener
 * for text/* files in Nextcloud Files (API v4 / Nextcloud 30+).
 */

import { registerFileAction, Permission, DefaultType } from '@nextcloud/files'
import { generateUrl } from '@nextcloud/router'

export function registerFilesPlugin() {
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

		enabled: ({ nodes }) =>
			nodes
			&& nodes.length === 1
			&& nodes[0].mime?.startsWith('text/')
			&& (nodes[0].permissions & Permission.READ) !== 0,

		async exec({ nodes }) {
			const fileId = nodes?.[0]?.fileid ?? nodes?.[0]?.fileId
			if (!fileId) return null
			window.location.href = generateUrl(`/apps/simpletexteditor/edit/${fileId}`)
			return null
		},

		default: DefaultType.DEFAULT,
		order: -1000,
	})
}
