const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const versionTsPath = path.join(__dirname, '..', 'src', 'version.ts');

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
let baseVersion = pkg.version || '1.0.0';

// Try to get highest git tag
let highestTagVersion = null;
try {
  try {
    execSync('git fetch --tags origin', { stdio: 'ignore' });
  } catch (fe) {}
  const tagsOutput = execSync('git tag -l "v*"', { encoding: 'utf8' }).trim();
  const tags = tagsOutput.split('\n').map(t => t.trim().replace(/^v/, '')).filter(Boolean);
  
  if (tags.length > 0) {
    tags.sort((a, b) => {
      const pa = a.split('.').map(n => parseInt(n, 10) || 0);
      const pb = b.split('.').map(n => parseInt(n, 10) || 0);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] || 0) - (pb[i] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });
    highestTagVersion = tags[tags.length - 1];
  }
} catch (e) {
  // If not a git repo or no tags, continue with package.json baseVersion
}

// Compare baseVersion and highestTagVersion
let targetVersion = baseVersion;
if (highestTagVersion) {
  const pBase = baseVersion.split('.').map(n => parseInt(n, 10) || 0);
  const pTag = highestTagVersion.split('.').map(n => parseInt(n, 10) || 0);
  
  let baseHigher = false;
  for (let i = 0; i < 3; i++) {
    if ((pBase[i] || 0) > (pTag[i] || 0)) {
      baseHigher = true;
      break;
    } else if ((pBase[i] || 0) < (pTag[i] || 0)) {
      break;
    }
  }

  // If baseVersion is not strictly higher than highestTagVersion, bump from highestTagVersion
  if (!baseHigher) {
    targetVersion = highestTagVersion;
  }
}

// Increment patch of targetVersion
const parts = targetVersion.split('.').map(n => parseInt(n, 10) || 0);
while (parts.length < 3) parts.push(0);
parts[2] += 1;
const nextVersion = parts.join('.');

pkg.version = nextVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

const today = new Date().toISOString().split('T')[0];
const versionTsContent = `/**
 * Application Version & Auto-Update Configuration
 * Synchronized with package.json and GitHub Releases
 */
export const APP_VERSION = "${nextVersion}";
export const APP_NAME = "BillingOnHand";
export const APP_DISPLAY_NAME = "Billing On Hand - Offline Retail & GST ERP";
export const APP_BUILD_DATE = "${today}";
export const GITHUB_OWNER = "devrupeshgadkhe";
export const GITHUB_REPO = "Repo_billingOnHands";
export const GITHUB_RELEASES_URL = \`https://github.com/\${GITHUB_OWNER}/\${GITHUB_REPO}/releases\`;
`;

fs.writeFileSync(versionTsPath, versionTsContent, 'utf8');
console.log(`Auto-bumped version: ${baseVersion} -> ${nextVersion}`);
