/**
 * Swaps in the branding assets for the deployment variant.
 *
 * Runs as an npm `postbuild` hook, so it rewrites the files in build/ and never
 * touches the working tree. Variant is chosen by REACT_APP_VARIANT:
 *   100 (default) -> the assets already in public/
 *   60            -> the assets in public/branding/ton60/
 */
const fs = require('fs');
const path = require('path');

const variant = (process.env.REACT_APP_VARIANT || '100').trim();
const buildDir = path.join(__dirname, '..', 'build');
const ASSETS = ['favicon.ico', 'logo192.png', 'logo512.png'];

if (variant === '100') {
  console.log('[variant] 100 TON — using default branding');
  process.exit(0);
}

const sourceDir = path.join(__dirname, '..', 'public', 'branding', `ton${variant}`);

if (!fs.existsSync(sourceDir)) {
  console.error(`[variant] No branding directory for REACT_APP_VARIANT="${variant}" (looked in ${sourceDir})`);
  process.exit(1);
}

if (!fs.existsSync(buildDir)) {
  console.error(`[variant] No build directory at ${buildDir} — run this after the build`);
  process.exit(1);
}

for (const asset of ASSETS) {
  const from = path.join(sourceDir, asset);
  if (!fs.existsSync(from)) {
    console.error(`[variant] Missing asset ${from}`);
    process.exit(1);
  }
  fs.copyFileSync(from, path.join(buildDir, asset));
}

console.log(`[variant] ${variant} TON — branding applied to build/`);
