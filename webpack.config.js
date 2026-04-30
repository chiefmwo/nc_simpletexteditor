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
    // Suppress Node.js polyfill warnings for browser-only deps
    fallback: {
      path: false,
      fs: false,
    },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: '> 1%, not dead' }],
            ],
          },
        },
      },
    ],
  },
  // Mark Nextcloud globals as externals so the bundle stays slim.
  // These are provided by the Nextcloud server at runtime.
  externals: {
    '@nextcloud/auth':     'OC',
    '@nextcloud/initial-state': 'OCA.InitialState',
  },
  optimization: {
    minimize: true,
  },
  performance: {
    hints: false,
  },
}
