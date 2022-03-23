import webpack = require('webpack');
import Compiler = webpack.Compiler;
// import Plugin = webpack.Plugin;

import { resolve, extname, posix } from 'path';
const normalize = posix.normalize;
import { createWriteStream } from 'fs';
import * as archiver from 'archiver';
import { green, bold, red } from 'colors/safe';
import * as filesize from 'filesize';
import { lstatSync } from 'fs';
import { readFileSync } from 'fs';

export type WebpackWarPluginOptions = {
  archiveName?: string,
  webInf?: string,
  additionalElements?: { path: string, destPath?: string }[],
  archiverOptions?: archiver.ArchiverOptions,
}

export class WebpackWarPlugin {
  // private archiver property to inject a Mock archiver in tests
  private archiver = archiver;

  constructor(private options: WebpackWarPluginOptions = {}) {
  }

  apply(compiler: Compiler) {
    const context = compiler['context'];

    const archiveBaseName = this.options.archiveName || JSON.parse(readFileSync(resolve(context, 'package.json')).toString()).name;
    const archiveName = extname(archiveBaseName) == '' ? `${archiveBaseName}.war` : archiveBaseName;

    const archiverOptions = this.options.archiverOptions || { store: true };

    const additionalElements = (this.options.additionalElements || [])
      .concat(this.options.webInf ? { path: this.options.webInf, destPath: 'WEB-INF' } : []);

    const outputPath = (compiler['options']['output'] ? compiler['options']['output']['path'] : null) || compiler['outputPath'];

    compiler.hooks.afterEmit.tapAsync('after-emit', (compilation: { assets: {[name: string]: any} }, cb: Function) => {
      const archive = this.archiver('zip', archiverOptions);
      const outStream = createWriteStream(resolve(outputPath, archiveName));
      archive.pipe(outStream);

      Object.getOwnPropertyNames(compilation.assets).forEach(asset => {
        const srcPath = resolve(outputPath, asset);
        archive.append(srcPath, { name: normalize(asset) });
      });

      additionalElements.forEach(({ path, destPath }) => {
        const srcPath = resolve(context, path);

        if (lstatSync(srcPath).isDirectory()) {
          archive.directory(srcPath, destPath || normalize(path));
        } else {
          archive.append(srcPath, { name: destPath || normalize(path) });
        }
      });

      outStream.on('close', () => {
        const archiveSize = filesize(archive['pointer']());

        console.log(bold('\n\tWAR Archive'));
        console.log(bold(green(`\t\t${archiveName}\t${archiveSize}\t[written]`)));
      });

      archive.on('error', (err) => {
        console.error(bold(red(`Error while creating WAR archive: ${err}`)));
      });

      compiler.hooks.done.tap('done', () => {
        archive.finalize();
      });

      compiler.hooks.failed.tap('failed', () => {
        archive.finalize();
      });

      cb();
    });
  }
}