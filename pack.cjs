const cp = require('child_process');
const path = require('path');
const os = require('os');

console.log('Preparing environment variables for electron-builder packaging...');

// Configure temp directory path in a standard way to prevent directory level write/permission crashes
process.env.ELECTRON_BUILDER_TEMP_DIR = path.join(os.tmpdir(), 'electron-builder-temp');
console.log(`Setting ELECTRON_BUILDER_TEMP_DIR to: ${process.env.ELECTRON_BUILDER_TEMP_DIR}`);

// Let's invoke patch-electron-builder script right before we pack, to be 100% sure it's applied
console.log('Ensuring electron-builder files are patched...');
try {
  cp.execSync('node patch-electron-builder.cjs', { stdio: 'inherit' });
} catch (patchErr) {
  console.warn('Warning: postinstall patch script execution failed or returned warning:', patchErr.message);
}

console.log('Ensuring application icons exist...');
try {
  cp.execSync('node scripts/ensure-icons.cjs', { stdio: 'inherit' });
} catch (iconErr) {
  console.warn('Warning: icon verification failed:', iconErr.message);
}

const command = 'electron-builder';
const args = ['--win'];

console.log(`Running: ${command} ${args.join(' ')}`);

// Using inherit to stream all logs/warnings, like our patch warning output
const result = cp.spawnSync(command, args, { stdio: 'inherit', shell: true });

if (result.status !== 0) {
  if (result.error) {
    console.error('Packaging process failed with error:', result.error);
  } else {
    console.error(`Packaging process exited with non-zero exit code: ${result.status}`);
  }
  process.exit(result.status || 1);
} else {
  console.log('Packaging process completed successfully! Exe files generated in dist-desktop/ directory.');
}
