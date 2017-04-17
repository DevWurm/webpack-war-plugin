const { WebpackWarPlugin } = require('../../dist');

module.exports = {
  entry: {
    file1: './src/file1.js',
  },
  context: __dirname,
  output: {
    path: __dirname + "/dist",
    filename: "[name].js"
  },
  plugins: [
    new WebpackWarPlugin({webInf: 'WEB-INF',additionalElements: [{path: './META-INF'}, {path: './pom.xml'}, {path: './manifest.xml', destPath: 'dir/man.xml'}]})
  ]
};
