const path = require('path')
const webpackConfig = require('@nextcloud/webpack-vue-config')

module.exports = {
	...webpackConfig,

	entry: {
		'editor-bundle': path.join(__dirname, 'src', 'main.js'),
	},

	output: {
		...webpackConfig.output,
		path:     path.resolve(__dirname, 'js'),
		filename: '[name].js',
		// Never delete existing files in js/ – the pre-built fallback bundle
		// and any other app assets must survive between builds.
		clean: false,
	},

	performance: {
		hints:             'warning',
		maxEntrypointSize: 512 * 1024,
		maxAssetSize:      512 * 1024,
	},
}
