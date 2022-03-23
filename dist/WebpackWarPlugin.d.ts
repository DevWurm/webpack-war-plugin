import webpack = require('webpack');
import Compiler = webpack.Compiler;
import * as archiver from 'archiver';
export declare type WebpackWarPluginOptions = {
    archiveName?: string;
    webInf?: string;
    additionalElements?: {
        path: string;
        destPath?: string;
    }[];
    archiverOptions?: archiver.ArchiverOptions;
};
export declare class WebpackWarPlugin {
    private options;
    private archiver;
    constructor(options?: WebpackWarPluginOptions);
    apply(compiler: Compiler): void;
}
