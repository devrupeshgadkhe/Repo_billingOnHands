const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'node_modules', 'app-builder-lib', 'out', 'util', 'electronGet.js');

if (fs.existsSync(targetFile)) {
  console.log('Patching electron-builder to avoid EPERM rename/delete issues on Windows...');
  let content = fs.readFileSync(targetFile, 'utf8');
  
  // First, if there's an existing patch with the dangerous electron.exe taskkill, clean it up!
  let modifiedExisting = false;
  if (content.includes("execSync('taskkill /f /im electron.exe /t', { stdio: 'ignore' });")) {
    content = content.replace("execSync('taskkill /f /im electron.exe /t', { stdio: 'ignore' });", "");
    modifiedExisting = true;
  }
  if (content.includes('execSync(\'taskkill /f /im electron.exe /t\', { stdio: \'ignore\' });')) {
    content = content.replace('execSync(\'taskkill /f /im electron.exe /t\', { stdio: \'ignore\' });', '');
    modifiedExisting = true;
  }
  if (modifiedExisting) {
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('Removed dangerous electron.exe taskkill from existing electronGet.js patch!');
  }

  // Regex to match from fs.rm(dir, ...) to finally {
  const patchRegex = /await fs\.rm\(dir, \{\s*recursive:\s*true,\s*force:\s*true\s*\}\);[\s\S]*?(?=\s*finally\s*\{)/;

  const replacementCode = `// Super-robust file deletion and renaming patch installed by BillingOnHand postinstall
        try {
            await fs.rm(dir, { recursive: true, force: true });
        } catch (rmErr) {
            console.warn(\`[electron-builder-patch] Initial rm failed: \${rmErr.message}. Attempting force deletion with retries...\`);
            try {
                const { execSync } = require('child_process');
                execSync('taskkill /f /im BillingOnHand.exe /t', { stdio: 'ignore' });
            } catch (kErr) {}
            
            let rmSuccess = false;
            for (let i = 1; i <= 10; i++) {
                try {
                    await fs.rm(dir, { recursive: true, force: true });
                    rmSuccess = true;
                    break;
                } catch (retryRmErr) {
                    await new Promise(r => setTimeout(r, 300));
                }
            }
            if (!rmSuccess) {
                console.error(\`[electron-builder-patch] rm failed catastrophically.\`);
            }
        }

        let renameSuccess = false;
        try {
            await fs.rename(tmpDir, dir);
            renameSuccess = true;
        } catch (renameErr) {
            if (renameErr.code === "EPERM" || renameErr.code === "EACCES") {
                console.warn(\`[electron-builder-patch] Initial rename got EPERM/EACCES: \${renameErr.message}. Retrying with delays...\`);
                for (let attempt = 1; attempt <= 20; attempt++) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                    try {
                        await fs.rename(tmpDir, dir);
                        renameSuccess = true;
                        break;
                    } catch (err) {
                        if (attempt === 20) {
                            console.warn(\`[electron-builder-patch] Rename retries exhausted. Initiating robust copy fallback...\`);
                        }
                    }
                }
            } else {
                throw renameErr;
            }
        }

        if (!renameSuccess) {
            try {
                await fs.mkdir(dir, { recursive: true });
                await fs.cp(tmpDir, dir, { recursive: true, force: true });
                console.log(\`[electron-builder-patch] Robust copy fallback succeeded!\`);
                try {
                    await fs.rm(tmpDir, { recursive: true, force: true });
                } catch (cleanErr) {
                    console.warn(\`[electron-builder-patch] Non-fatal: failed to clean tmpDir post-copy: \${cleanErr.message}\`);
                }
            } catch (copyErr) {
                console.error(\`[electron-builder-patch] CRITICAL: Copy fallback failed: \${copyErr.message}\`);
                throw copyErr;
            }
        }
    }
    `;

  if (patchRegex.test(content)) {
    // Check if the current file content contains are already patched with the LATEST version
    if (content.includes('[electron-builder-patch] Initial rename got EPERM/EACCES')) {
      console.log('electron-builder is already patched with the latest super-robust patch.');
    } else {
      content = content.replace(patchRegex, replacementCode);
      fs.writeFileSync(targetFile, content, 'utf8');
      console.log('Successfully applied super-robust patch to electron-builder!');
    }
  } else {
    // If it's already patched, we don't need to report error unless it's genuinely missing
    if (content.includes('[electron-builder-patch]')) {
      console.log('electron-builder is verified and patched.');
    } else {
      console.error('Could not find the target code pattern to patch in electronGet.js');
    }
  }
} else {
  console.log("node_modules/app-builder-lib patch target not found. If this is not a development context or you have not run npm install yet, this is fine.");
}
