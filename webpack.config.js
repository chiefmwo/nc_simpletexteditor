const path = require('path')

module.exports = {
  entry: './src/main.js',
  output: {
    path: path.resolve(__dirname, 'js'),
    filename: 'editor-bundle.js',
    clean: false,
  },
  resolve: {
    extensions: ['.js'],
    fallback: { path: false, fs: false },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        // Only transpile our own source, not node_modules
        include: path.resolve(__dirname, 'src'),
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: '> 1%, not dead, not ie 11' }],
            ],
          },
        },
      },
    ],
  },
  // Nextcloud globals provided at runtime – don't bundle them
  externals: {
    '@nextcloud/auth':   'OC',
  },
  optimization: {
    minimize: true,
  },
  // Keep bundle-size warnings visible so regressions are caught early
  performance: {
    hints: 'warning',
    maxEntrypointSize: 256 * 1024,
    maxAssetSize:      256 * 1024,
  },
}
