const path = require('path');

module.exports = {
  entry: './src/webview/index', // Adjust with your entry point
  output: {
    path: path.resolve(__dirname, 'dist/webview'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.tsx?$/,
        use: ['ts-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  },
  devtool: 'inline-source-map' // This will generate a source map for debugging
};
