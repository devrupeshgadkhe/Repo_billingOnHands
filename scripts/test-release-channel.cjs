const assert = require("node:assert/strict");
const path = require("node:path");
const {
  isPreProductionVersion,
  resolveUserDataPath
} = require("../release-channel.cjs");

const productionPath = path.join("C:", "Users", "TestUser", "AppData", "Roaming", "BillingOnHand");
const appDataPath = path.join("C:", "Users", "TestUser", "AppData", "Roaming");

assert.equal(isPreProductionVersion("1.1.20"), false);
assert.equal(isPreProductionVersion("1.2.0"), false);
assert.equal(isPreProductionVersion("1.2.0-beta.1"), true);
assert.equal(isPreProductionVersion("1.2.0-alpha.2"), true);
assert.equal(isPreProductionVersion("1.2.0-rc.1"), true);

assert.equal(resolveUserDataPath(appDataPath, "1.1.20", productionPath), productionPath);
assert.equal(
  resolveUserDataPath(appDataPath, "1.2.0-beta.1", productionPath),
  path.join(appDataPath, "BillingOnHand-PreProduction")
);

console.log("Release channel and data isolation tests passed.");
