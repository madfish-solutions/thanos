/*
  Reference for this config:
  https://github.com/facebook/create-react-app/blob/main/packages/react-scripts/config/webpack.config.js
*/

import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import CreateFileWebpack from 'create-file-webpack';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import * as Path from 'path';
import ExtensionReloaderMV3BadlyTyped, {
  ExtensionReloader as ExtensionReloaderMV3Type
} from 'webpack-ext-reloader-mv3';
import WebExtensionTargetPlugin from 'webpack-target-webextension';
import WebpackBar from 'webpackbar';

import { buildBaseConfig } from './webpack/base.config';
import {
  DEVELOPMENT_ENV,
  PRODUCTION_ENV,
  TARGET_BROWSER,
  MANIFEST_VERSION,
  BACKGROUND_IS_WORKER,
  RELOADER_PORTS,
  MAX_JS_CHUNK_SIZE_IN_BYTES
} from './webpack/env';
import usePagesLiveReload from './webpack/live-reload';
import { buildManifest } from './webpack/manifest';
import { PATHS } from './webpack/paths';
import { isTruthy } from './webpack/utils';

const ExtensionReloaderMV3 = ExtensionReloaderMV3BadlyTyped as ExtensionReloaderMV3Type;

const PAGES_NAMES = ['popup', 'fullpage', 'confirm', 'options'];
const HTML_TEMPLATES = PAGES_NAMES.map(name => {
  const filename = `${name}.html`;
  const path = Path.join(PATHS.PUBLIC, filename);
  return { name, filename, path };
});

const CONTENT_SCRIPTS = ['contentScript', 'replaceAds'];
if (BACKGROUND_IS_WORKER) CONTENT_SCRIPTS.push('keepBackgroundWorkerAlive');

const mainConfig = (() => {
  const config = buildBaseConfig();

  /* Page reloading in development mode */
  const liveReload = DEVELOPMENT_ENV && usePagesLiveReload(RELOADER_PORTS.PAGES);

  config.entry = Object.fromEntries(PAGES_NAMES.map(name => [name, Path.join(PATHS.SOURCE, `${name}.tsx`)]));

  if (liveReload) config.entry.live_reload = liveReload.client_entry;

  config.output = {
    ...config.output,
    filename: 'pages/[name].js',
    chunkFilename: 'pages/[id].bundle-chunk.js'
  };

  config.plugins!.push(
    ...[
      new WebpackBar({
        name: 'Temple Wallet | Main',
        color: '#ed8936'
      }),

      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: [`**/*`, `!scripts/**`, `!background/**`, PATHS.OUTPUT_PACKED],
        cleanStaleWebpackAssets: false,
        verbose: false
      }),

      new MiniCssExtractPlugin({
        filename: 'styles/[name].css',
        chunkFilename: 'styles/[name].chunk.css'
      }),

      ...HTML_TEMPLATES.map(
        ({ name, filename, path }) =>
          new HtmlWebpackPlugin({
            template: path,
            filename,
            chunks: liveReload ? [name, 'live_reload'] : [name],
            inject: 'body',
            ...(PRODUCTION_ENV
              ? {
                  minify: {
                    removeComments: true,
                    collapseWhitespace: true,
                    removeRedundantAttributes: true,
                    useShortDoctype: true,
                    removeEmptyAttributes: true,
                    removeStyleLinkTypeAttributes: true,
                    keepClosingSlash: true,
                    minifyJS: true,
                    minifyCSS: true,
                    minifyURLs: true
                  }
                }
              : {})
          })
      ),

      new CopyWebpackPlugin({
        patterns: [
          {
            from: PATHS.PUBLIC,
            to: PATHS.OUTPUT,
            globOptions: {
              /*
                - HTML files are taken care of by the `html-webpack-plugin`. Copying them here leads to:
                  `ERROR in Conflict: Multiple assets emit different content to the same filename [name].html`
                - Manifest file is copied next, along with transformation of it.
              */
              ignore: ['**/*.html']
            }
          },
          /*
            Using `asset/resource` rule type with `webworker` target isn't working.
            See: https://github.com/vercel/next.js/issues/22581
          */
          { from: PATHS.LIBTHEMIS_WASM_FILE, to: PATHS.OUTPUT_WASM }
        ]
      }),

      new CreateFileWebpack({
        path: PATHS.OUTPUT,
        fileName: 'manifest.json',
        content: (() => {
          const manifest = buildManifest(TARGET_BROWSER);
          return JSON.stringify(manifest, null, 2);
        })()
      }),

      ...(liveReload ? liveReload.plugins : [])
    ].filter(isTruthy)
  );

  config.optimization!.splitChunks = {
    chunks: 'all',
    maxSize: MAX_JS_CHUNK_SIZE_IN_BYTES,
    enforceSizeThreshold: MAX_JS_CHUNK_SIZE_IN_BYTES,
    name: (_: any, chunks: any) => chunks.map((chunk: any) => chunk.name).join('-') + '.split-chunk'
  };

  config.optimization!.minimizer!.push(
    // This is only used in production mode
    new CssMinimizerPlugin()
  );

  return config;
})();

const scriptsConfig = (() => {
  const config = buildBaseConfig();

  // Required for dynamic imports `import()`
  config.output!.chunkFormat = 'module';

  config.entry = {
    contentScript: Path.join(PATHS.SOURCE, 'contentScript.ts'),
    replaceAds: Path.join(PATHS.SOURCE, 'replaceAds.ts'),
    googleAuthCommunication: Path.join(PATHS.SOURCE, 'googleAuthCommunication.ts')
  };

  if (BACKGROUND_IS_WORKER)
    config.entry.keepBackgroundWorkerAlive = Path.join(PATHS.SOURCE, 'keepBackgroundWorkerAlive.ts');

  config.output = {
    ...config.output,
    filename: 'scripts/[name].js',
    chunkFilename: 'scripts/[name].chunk.js'
  };

  config.plugins!.push(
    ...[
      new WebpackBar({
        name: 'Temple Wallet | Scripts',
        color: '#ed8936'
      }),

      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: ['scripts/**'],
        cleanStaleWebpackAssets: false,
        verbose: false
      })
    ].filter(isTruthy)
  );

  return config;
})();

const backgroundConfig = (() => {
  const config = buildBaseConfig();

  if (BACKGROUND_IS_WORKER) config.target = 'webworker';

  config.entry = {
    background: Path.join(PATHS.SOURCE, 'background.ts')
  };

  config.output = {
    ...config.output,
    filename: 'background/index.js',
    chunkFilename: 'background/[name].chunk.js'
  };

  config.plugins!.push(
    ...[
      new WebpackBar({
        name: 'Temple Wallet | Background',
        color: '#ed8936'
      }),

      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: ['background/**'],
        cleanStaleWebpackAssets: false,
        verbose: false
      }),

      /*
        Handling dynamic imports, converted to ServiceWorker's `importScripts`, and failing
        over being called deferred, not at the root of the script.
      */
      BACKGROUND_IS_WORKER &&
        new WebExtensionTargetPlugin({
          background: {
            entry: 'background',
            manifest: MANIFEST_VERSION
          }
        }),

      /* Page reloading in development mode */
      DEVELOPMENT_ENV &&
        new ExtensionReloaderMV3({
          port: RELOADER_PORTS.BACKGROUND,
          reloadPage: true,
          entries: { background: 'background', contentScript: [] }
        })
    ].filter(isTruthy)
  );

  return config;
})();

const configurations = [mainConfig, scriptsConfig, backgroundConfig];

export default configurations;
export const parallelism = 3;
