import 'mocha';
import * as chai from 'chai';
import { resolve } from 'path';
import { SinonMock, SinonExpectation, mock, spy, stub, assert } from 'sinon';
import * as webpack from 'webpack';
import Compiler = webpack.Compiler;
const expect = chai.expect;

import * as fs from 'fs';
import { WebpackWarPlugin } from './WebpackWarPlugin';
import archiver = require('archiver');

describe('WebpackWarPlugin', function () {
  let compiler: Compiler;
  let compilation: { assets: { [name: string]: any } };

  let mockFs: SinonMock;
  let expectationCreateWriteStream: SinonExpectation;

  beforeEach('Setup compiler dummy', function () {
    compilation = {
      assets: {}
    };
    compiler = {
      context: resolve('./'),
      options: {
        output: {
          path: 'dist'
        }
      },
      plugin: (event, cb) => {
        if (event == 'after-emit') cb(compilation, () => null);
      }
    } as Partial<Compiler> as Compiler;
  });

  beforeEach('Setup fs mock and createWriteStream expectation', function () {
    mockFs = mock(fs);

    // create a mock for createWriteStream to prevent real fs access
    expectationCreateWriteStream = mockFs.expects('createWriteStream');
    expectationCreateWriteStream.returns({
      write: () => null,
      once: () => null,
      emit: () => null,
      on: () => null
    });
  });

  afterEach('Remove fs mock', function () {
    mockFs.restore();
  });

  it('Should run without errors', function () {
    const plugin = new WebpackWarPlugin({ archiveName: 'Test' });
    expect(() => {
      plugin.apply(compiler);
    }).not.to.throw();
  });

  describe('Webpack integration', function () {
    it('Should be hooked into the after-emit step', function () {
      const spyPlugin = spy(compiler, 'plugin');

      const plugin = new WebpackWarPlugin({ archiveName: 'Test' });
      plugin.apply(compiler);

      assert.calledWith(spyPlugin, 'after-emit');
    });
  });

  describe('Filesystem usage', function () {
    context('Without specified archive name', function () {
      it('Should create the archive in the correct destination and with the correct name', function () {
        const archiveName = 'Test';
        expectationCreateWriteStream.once().withExactArgs(`${resolve('./', (compiler as any).options.output.path, `${archiveName}.war`)}`);

        const originalReadFileSync = fs.readFileSync;
        const stubReadFileSync = stub(fs, 'readFileSync')
          .callsFake(function fakeReadFileSync(path: string, encoding) {
            // just fake the call inside the plugin,
            // otherwise the test suite fails because the test tool use readFileSync, too
            if (path.includes((compiler as any).context) && path.includes('package.json')) {
              return Buffer.from(`{"name": "${archiveName}"}`)
            } else {
              return originalReadFileSync(path, encoding);
            }
          });

        const plugin = new WebpackWarPlugin();
        plugin.apply(compiler);

        mockFs.verify();
        stubReadFileSync.restore();
      });
    });

    context('Without specified extension', function () {
      it('Should create the archive in the correct destination and with the correct name', function () {
        const archiveName = 'Test';
        expectationCreateWriteStream.once().withExactArgs(`${resolve('./', (compiler as any).options.output.path, `${archiveName}.war`)}`);

        const plugin = new WebpackWarPlugin({ archiveName });
        plugin.apply(compiler);

        expectationCreateWriteStream.verify();
      });
    });

    context('With specified extension', function () {
      it('Should create the archive in the correct destination and with the correct name', function () {
        const archiveName = 'Test.war';
        expectationCreateWriteStream.once().withExactArgs(`${resolve('./', (compiler as any).options.output.path, `${archiveName}`)}`);

        const plugin = new WebpackWarPlugin({ archiveName });
        plugin.apply(compiler);

        expectationCreateWriteStream.verify();
      });
    });
  });

  describe('Asset bundling', function () {
    it('Should add all assets to the archive', function () {
      const ArchiverDummy = {
        append: (() => null),
        pipe: (() => null),
        on: (() => null),
        finalize: (() => null)
      };
      const spyAppend = spy(ArchiverDummy, 'append');

      compilation.assets = {
        'asset1.txt': {},
        'asset2.bla': {},
        'asset3.blub': {}
      };

      const plugin = new WebpackWarPlugin({ archiveName: 'Test' });
      (plugin as any).archiver = (() => ArchiverDummy);
      plugin.apply(compiler);

      Object.getOwnPropertyNames(compilation.assets).map(asset =>
        assert.calledWith(spyAppend, resolve((compiler as any).options.output.path, asset), { name: asset }));
    });

    it('Should normalize asset paths', function () {
      const ArchiverDummy = {
        append: (() => null),
        pipe: (() => null),
        on: (() => null),
        finalize: (() => null)
      };
      const spyAppend = spy(ArchiverDummy, 'append');

      const assets = {
        './asset1.txt': {},
        './assets/./asset2.txt': {}
      };

      compilation.assets = assets;

      const plugin = new WebpackWarPlugin({ archiveName: 'Test' });
      (plugin as any).archiver = (() => ArchiverDummy);
      plugin.apply(compiler);

      assert.calledWith(spyAppend,
        resolve((compiler as any).options.output.path, Object.getOwnPropertyNames(assets)[0]),
        { name: 'asset1.txt' }
      );
      assert.calledWith(spyAppend,
        resolve((compiler as any).options.output.path, Object.getOwnPropertyNames(assets)[1]),
        { name: 'assets/asset2.txt' }
      );
    });

    it('Should add the WEB-INF folder to the archive', function () {
      const ArchiverStub = {
        append: (() => null),
        pipe: (() => null),
        directory: (() => null),
        on: (() => null),
        finalize: (() => null)
      };
      const spyDirectory = spy(ArchiverStub, 'directory');
      const stubLstatSync = stub(fs, 'lstatSync');
      stubLstatSync.returns({ isDirectory: (() => true) });

      const plugin = new WebpackWarPlugin({ archiveName: 'Test', webInf: 'WEB-INF' });
      (plugin as any).archiver = (() => ArchiverStub);
      plugin.apply(compiler);

      assert.alwaysCalledWith(spyDirectory, resolve('./', 'WEB-INF'), 'WEB-INF');

      spyDirectory.restore();
      stubLstatSync.restore();
    });

    it('Should add all additional elements to the archive', function () {
      const ArchiverStub = {
        append: (() => null),
        pipe: (() => null),
        directory: (() => null),
        on: (() => null),
        finalize: (() => null)
      };
      const spyAppend = spy(ArchiverStub, 'append');
      const spyDirectory = spy(ArchiverStub, 'directory');
      const stubLstatSync = stub(fs, 'lstatSync');
      stubLstatSync.callsFake((path: string) => {
        return { isDirectory: () => path.includes('dir') };
      });

      const additionalElements: { path: string, destPath?: string }[] = [
        { path: './dir1' },
        { path: 'dir2' },
        { path: 'dir3', destPath: 'dir' },
        { path: 'dir4', destPath: 'dir4/dir' },
        { path: './file1' },
        { path: 'file2' },
        { path: 'file3', destPath: 'file' },
        { path: 'file4', destPath: 'file4/file' }
      ];

      const plugin = new WebpackWarPlugin({ archiveName: 'Test', additionalElements });
      (plugin as any).archiver = (() => ArchiverStub);
      plugin.apply(compiler);

      additionalElements.forEach(({ path }) => {
        switch (path) {
          case './dir1':
            return assert.calledWith(spyDirectory, resolve('./', 'dir1'), 'dir1');
          case 'dir2':
            return assert.calledWith(spyDirectory, resolve('./', 'dir2'), 'dir2');
          case 'dir3':
            return assert.calledWith(spyDirectory, resolve('./', 'dir3'), 'dir');
          case 'dir4':
            return assert.calledWith(spyDirectory, resolve('./', 'dir4'), 'dir4/dir');
          case './file1':
            return assert.calledWith(spyAppend, resolve('./', 'file1'), { name: 'file1' });
          case 'file2':
            return assert.calledWith(spyAppend, resolve('./', 'file2'), { name: 'file2' });
          case 'file3':
            return assert.calledWith(spyAppend, resolve('./', 'file3'), { name: 'file' });
          case 'file4':
            return assert.calledWith(spyAppend, resolve('./', 'file4'), { name: 'file4/file' });
        }
      });

      stubLstatSync.restore();
    });
  });
});
