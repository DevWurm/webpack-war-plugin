"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const normalize = path_1.posix.normalize;
const fs_1 = require("fs");
const archiver = require("archiver");
const safe_1 = require("colors/safe");
const filesize = require("filesize");
const fs_2 = require("fs");
const fs_3 = require("fs");
class WebpackWarPlugin {
    constructor(options = {}) {
        this.options = options;
        // private archiver property to inject a Mock archiver in tests
        this.archiver = archiver;
    }
    apply(compiler) {
        const context = compiler['context'];
        const archiveBaseName = this.options.archiveName || JSON.parse(fs_3.readFileSync(path_1.resolve(context, 'package.json')).toString()).name;
        const archiveName = path_1.extname(archiveBaseName) == '' ? `${archiveBaseName}.war` : archiveBaseName;
        const additionalElements = (this.options.additionalElements || [])
            .concat(this.options.webInf ? { path: this.options.webInf, destPath: 'WEB-INF' } : []);
        const outputPath = (compiler['options']['output'] ? compiler['options']['output']['path'] : null) || compiler['outputPath'];
        compiler.hooks.afterEmit.tapAsync('myAfterEmitPlugin', (compilation, cb) => {
            const archive = this.archiver('zip', { store: true });
            const outStream = fs_1.createWriteStream(path_1.resolve(outputPath, archiveName));
            archive.pipe(outStream);
            Object.getOwnPropertyNames(compilation.assets).forEach(asset => {
                const srcPath = path_1.resolve(outputPath, asset);
                archive.append(fs_3.readFileSync(srcPath), { name: normalize(asset) });
            });
            additionalElements.forEach(({ path, destPath }) => {
                const srcPath = path_1.resolve(context, path);
                if (fs_2.lstatSync(srcPath).isDirectory()) {
                    archive.directory(srcPath, destPath || normalize(path));
                }
                else {
                    archive.append(fs_3.readFileSync(srcPath), { name: destPath || normalize(path) });
                }
            });
            outStream.on('close', () => {
                const archiveSize = filesize(archive['pointer']());
                console.log(safe_1.bold('\n\tWAR Archive'));
                console.log(safe_1.bold(safe_1.green(`\t\t${archiveName}\t${archiveSize}\t[written]`)));
            });
            archive.on('error', (err) => {
                console.error(safe_1.bold(safe_1.red(`Error while creating WAR archive: ${err}`)));
            });
            compiler.hooks.done.tapAsync('myDonePlugin', (stats) => {
                archive.finalize();
            });
            compiler.hooks.failed.tap('myFailedPlugin', (error) => {
                archive.finalize();
            });
            cb();
        });
    }
}
exports.WebpackWarPlugin = WebpackWarPlugin;
//# sourceMappingURL=WebpackWarPlugin.js.map