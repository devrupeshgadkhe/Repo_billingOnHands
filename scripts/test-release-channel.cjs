const assert = require("node:assert/strict");
const path = require("node:path");
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

console.log("Pre-production application identity and data isolation tests passed.");
