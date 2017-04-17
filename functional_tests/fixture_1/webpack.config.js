const { WebpackWarPlugin } = require('../../dist');

module.exports = {
  entry: {
    file1: './src/file1.js',
    file2: './src/file2.js',
    file3: './src/file3.js',
    'dir1/file4': './src/dir1/file4.js',
  },
  context: __dirname,
  output: {
    path: __dirname + "/dist",
    filename: "[name].js"
  },
  plugins: [
    new WebpackWarPlugin()
  ]
};
