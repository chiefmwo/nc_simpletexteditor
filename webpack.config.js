const path = require('path')

// @nextcloud/webpack-vue-config sets up the Nextcloud-standard webpack
// environment: Babel transpilation, module aliases, optimization settings
// and – crucially – ensures @nextcloud/* packages are treated as singletons
// so registerFileAction() shares the same module instance as the Files app.
const webpackConfig = require('@nextcloud/webpack-vue-config')

module.exports = {
	...webpackConfig,

	// Single entry → js/editor-bundle.js
	entry: {
		'editor-bundle': path.join(__dirname, 'src', 'main.js'),
	},

	// Keep bundle-size warnings so regressions are visible in CI
	performance: {
		hints:              'warning',
		maxEntrypointSize:  512 * 1024,
		maxAssetSize:       512 * 1024,
	},
}
