const { WebpackWarPlugin } = require('../../dist');

module.exports = {
  entry: {
    file1: './src/file1.js'
  },
  context: __dirname,
  output: {
    path: __dirname + "/dist",
    filename: "[name].js"
  },
  plugins: [
    new WebpackWarPlugin({archiveName: 'archive.war'})
  ]
};
