const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {
  isPreProductionVersion,
  isPreProductionApp,
  resolveUserDataPath
} = require("../release-channel.cjs");

const productionPath = path.join("C:", "Users", "TestUser", "AppData", "Roaming", "BillingOnHand");
const appDataPath = path.join("C:", "Users", "TestUser", "AppData", "Roaming");
const betaPath = path.join(appDataPath, "BillingOnHand-PreProduction");

assert.equal(isPreProductionVersion("1.1.20"), false);
assert.equal(isPreProductionVersion("1.2.0-beta.1"), true);
assert.equal(isPreProductionVersion("1.2.0-alpha.2"), true);
assert.equal(isPreProductionVersion("1.2.0-rc.1"), true);
assert.equal(isPreProductionApp("BillingOnHand-Beta"), true);
assert.equal(isPreProductionApp("Billing On Hand Beta"), true);
assert.equal(isPreProductionApp("BillingOnHand"), false);

assert.equal(resolveUserDataPath(appDataPath, "1.1.20", productionPath), productionPath);
assert.equal(resolveUserDataPath(appDataPath, "1.1.20", productionPath, "BillingOnHand-Beta"), betaPath);
assert.equal(resolveUserDataPath(appDataPath, "1.2.0-beta.1", productionPath), betaPath);


const packageConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
assert.equal(packageConfig.build.appId, "com.billingonhand.beta");
assert.equal(packageConfig.build.productName, "BillingOnHand-Beta");
assert.equal(packageConfig.build.directories.output, "dist-desktop-beta");
assert.equal(packageConfig.build.publish.provider, "generic");
assert.match(packageConfig.build.publish.url, /releases\\/download\\/beta-latest\\/$/);
assert.equal(packageConfig.build.detectUpdateChannel, false);
assert.equal(packageConfig.build.nsis.shortcutName, "Billing On Hand Beta");
assert.equal(packageConfig.build.nsis.uninstallDisplayName, "Billing On Hand Beta");

console.log("Pre-production application identity, installer isolation, update feed, and data isolation tests passed.");
