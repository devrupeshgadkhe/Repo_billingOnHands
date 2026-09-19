const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const projectRoot = path.join(__dirname, '..');
const distDesktop = path.join(projectRoot, 'dist-desktop');

if (!fs.existsSync(distDesktop)) {
  console.log('[ensure-latest-yml] dist-desktop does not exist yet.');
  process.exit(0);
}

const latestYmlPath = path.join(distDesktop, 'latest.yml');
if (fs.existsSync(latestYmlPath) && fs.statSync(latestYmlPath).size > 10) {
  console.log('[ensure-latest-yml] latest.yml already exists:', fs.readFileSync(latestYmlPath, 'utf8'));
  process.exit(0);
}

// Find .exe file in dist-desktop
const files = fs.readdirSync(distDesktop);
const exeFile = files.find(f => f.endsWith('.exe') && !f.includes('unpacked'));

if (!exeFile) {
  console.warn('[ensure-latest-yml] No .exe installer found in dist-desktop to generate latest.yml');
  process.exit(0);
}

const exePath = path.join(distDesktop, exeFile);
const exeBuffer = fs.readFileSync(exePath);
const sha512 = crypto.createHash('sha512').update(exeBuffer).digest('base64');
const size = fs.statSync(exePath).size;

const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const version = pkg.version || '1.0.0';

const ymlContent = `version: ${version}
files:
  - url: ${exeFile}
    sha512: ${sha512}
    size: ${size}
path: ${exeFile}
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'
`;

fs.writeFileSync(latestYmlPath, ymlContent, 'utf8');
console.log(`[ensure-latest-yml] Successfully created fallback latest.yml for ${exeFile} (${size} bytes)`);
