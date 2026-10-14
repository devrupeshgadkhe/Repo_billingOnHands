const cp = require('child_process');
const fs = require('fs');

console.log('Cleaning active processes and old build files...');

try {
  cp.execSync('taskkill /f /im BillingOnHand.exe /t', { stdio: 'ignore' });
  console.log('Forcefully killed any running BillingOnHand.exe instances.');
} catch (e) {}

const directoriesToClean = ['dist', 'dist-desktop', 'data/db.json'];
directoriesToClean.forEach(p => {
  try {
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true });
      console.log(`Successfully removed: ${p}`);
    }
  } catch (err) {
    console.warn(`[clean] Warning: Failed to remove ${p}: ${err.message}`);
  }
});

console.log('Cleanup completed!');
