const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const versionTsPath = path.join(__dirname, '..', 'src', 'version.ts');

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = pkg.version || '1.0.0';

const parts = currentVersion.split('.').map(n => parseInt(n, 10));
if (parts.length === 3) {
  parts[2] += 1; // Increment patch
} else {
  parts.push(1);
}
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
console.log(`Version successfully updated: ${currentVersion} -> ${nextVersion}`);
