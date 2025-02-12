# Temple Wallet

Cryptocurrency wallet for [Tezos blockchain](https://tezos.com) as Web Extension for your Browser.<br>
Providing ability to manage NFT, tez tokens and interact with dApps.

![Temple Wallet](https://user-images.githubusercontent.com/11996139/108867944-64e7fc00-75fe-11eb-975e-87c0fda9bfbe.png)

<hr />

## ▶️ Install

You can install Temple Wallet right now: https://templewallet.com/download.

## Browser Support

| [![Chrome](https://raw.github.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png)](https://chrome.google.com/webstore/detail/temple-tezos-wallet-ex-th/ookjlbkiijinhpmnjffcofjonbfbgaoc) | [![Firefox](https://raw.github.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png)](https://addons.mozilla.org/en-US/firefox/addon/temple-wallet/) | [![Brave](https://raw.github.com/alrra/browser-logos/master/src/brave/brave_48x48.png)](https://chrome.google.com/webstore/detail/temple-tezos-wallet-ex-th/ookjlbkiijinhpmnjffcofjonbfbgaoc) | [![Opera](https://raw.github.com/alrra/browser-logos/master/src/opera/opera_48x48.png)](https://chrome.google.com/webstore/detail/temple-tezos-wallet-ex-th/ookjlbkiijinhpmnjffcofjonbfbgaoc) | [![Edge](https://raw.github.com/alrra/browser-logos/master/src/edge/edge_48x48.png)](https://chrome.google.com/webstore/detail/temple-tezos-wallet-ex-th/ookjlbkiijinhpmnjffcofjonbfbgaoc) |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 49 & later ✔                                                                                                                                                                                     | 52 & later ✔                                                                                                                                                 | Latest ✔                                                                                                                                                                                      | 36 & later ✔                                                                                                                                                                                  | 79 & later ✔                                                                                                                                                                               |

## 🚀 Quick Start

Ensure you have:

- [Node.js](https://nodejs.org) 10 or later installed
- [Yarn](https://yarnpkg.com) v1 or v2 installed

Then run the following:

### 1) Clone the repository

```bash
git clone https://github.com/madfish-solutions/templewallet-extension && cd templewallet-extension
```

### 2) Install dependencies

```bash
yarn
```

### 3) Create `.env` file

Make copy of `.env.dist` and do changes if needed.

### 4) Build

Builds the extension for production to the `dist` folder.<br>
It correctly bundles in production mode and optimizes the build for the best performance.

```bash
# for Chrome by default
yarn build
```

Optional for different browsers:

```bash
# for Chrome directly
yarn build:chrome
# for Firefox directly
yarn build:firefox
# for Opera directly
yarn build:opera

# for all at once
yarn build-all
```

### 5) Load extension to your Browser

![TempleWallet_Load](https://user-images.githubusercontent.com/11996139/73763346-f8435a80-4779-11ea-9e9d-4c1db9560f64.gif)

## 🧱 Development

```bash
yarn start
```

Runs the extension in the development mode for Chrome target.<br>
It's recommended to use Chrome for developing.

### Debugging

To enable Redux DevTools during development, specify some port in the `.env` file before running `yarn start` like so:

```toml
REDUX_DEVTOOLS_PORT=8000
```

Install [`@redux-devtools/cli`](https://github.com/reduxjs/redux-devtools) globally:

```bash
yarn global add @redux-devtools/cli
```

Then open an explorer at previously specified port:

```bash
redux-devtools --open --port=8000
```

> Other UI options like `--open=browser` are available.

Go to settings to specify port one more time.

### Notes about countries flags

- Do not compress the atlas with them, which is located at `public/misc/country-flags/atlas_original.png`, using tinypng; the compressed image has too low quality.
- You can generate such an atlas with a script like below:
```js
const sharp = require('sharp');
const fsPromises = require('fs/promises');
const path = require('path');
(async () => {
  const imagesNames = await fsPromises.readdir(path.resolve('input'));
  const atlasRowSize = 7;
  const atlasRows = Math.ceil(imagesNames.length / atlasRowSize);
  // Each image has a size of 40x30
  const atlas = sharp({
    create: {
      width: 40 * atlasRowSize,
      height: 30 * atlasRows,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).composite(
    imagesNames.map((imageName, index) => ({
      input: path.resolve(`input/${imageName}`),
      left: 40 * (index % atlasRowSize),
      top: 30 * Math.floor(index / atlasRowSize)
    }))
  );
  await atlas.png().toFile(path.resolve('output/atlas.png'));
})();
```
