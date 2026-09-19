const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const dirs = ['build', 'assets', 'public'];

// Ensure target directories exist
for (const dir of dirs) {
  const p = path.join(projectRoot, dir);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

const icoTargets = [
  path.join(projectRoot, 'build', 'icon.ico'),
  path.join(projectRoot, 'assets', 'icon.ico'),
  path.join(projectRoot, 'public', 'favicon.ico')
];

const pngTargets = [
  path.join(projectRoot, 'build', 'icon.png'),
  path.join(projectRoot, 'assets', 'icon.png'),
  path.join(projectRoot, 'public', 'icon.png')
];

// 1. Resolve or reconstruct icon.ico
let icoSourceBuffer = null;
for (const target of icoTargets) {
  if (fs.existsSync(target) && fs.statSync(target).size > 1000) {
    icoSourceBuffer = fs.readFileSync(target);
    break;
  }
}

if (!icoSourceBuffer) {
  const base64TxtPath = path.join(projectRoot, 'assets', 'icon-base64.txt');
  if (fs.existsSync(base64TxtPath)) {
    console.log('[ensure-icons] Reconstructing icon.ico from base64 backup...');
    const raw = fs.readFileSync(base64TxtPath, 'utf8').trim();
    icoSourceBuffer = Buffer.from(raw, 'base64');
  }
}

if (icoSourceBuffer) {
  for (const target of icoTargets) {
    fs.writeFileSync(target, icoSourceBuffer);
    console.log(`[ensure-icons] Verified: ${path.relative(projectRoot, target)} (${fs.statSync(target).size} bytes)`);
  }
} else {
  console.error('[ensure-icons] CRITICAL: Unable to locate or restore icon.ico!');
  process.exit(1);
}

// 2. Resolve or reconstruct icon.png
let pngSourceBuffer = null;
for (const target of pngTargets) {
  if (fs.existsSync(target) && fs.statSync(target).size > 1000) {
    pngSourceBuffer = fs.readFileSync(target);
    break;
  }
}

if (!pngSourceBuffer) {
  const pngBase64TxtPath = path.join(projectRoot, 'assets', 'icon-png-base64.txt');
  if (fs.existsSync(pngBase64TxtPath)) {
    console.log('[ensure-icons] Reconstructing icon.png from base64 backup...');
    const raw = fs.readFileSync(pngBase64TxtPath, 'utf8').trim();
    pngSourceBuffer = Buffer.from(raw, 'base64');
  }
}

if (pngSourceBuffer) {
  for (const target of pngTargets) {
    fs.writeFileSync(target, pngSourceBuffer);
    console.log(`[ensure-icons] Verified: ${path.relative(projectRoot, target)} (${fs.statSync(target).size} bytes)`);
  }
}

console.log('[ensure-icons] All application icons are ready for electron-builder.');
