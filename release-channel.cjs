const path = require("path");

const PRE_PRODUCTION_VERSION_PATTERN = /-(?:alpha|beta|rc)(?:[.-]|$)/i;
const PRE_PRODUCTION_APP_NAMES = new Set(["BillingOnHand-Beta", "Billing On Hand Beta"]);

function isPreProductionVersion(version) {
  return PRE_PRODUCTION_VERSION_PATTERN.test(String(version || "").trim());
}

function isPreProductionApp(appName) {
  return PRE_PRODUCTION_APP_NAMES.has(String(appName || "").trim());
}

function resolveUserDataPath(appDataPath, version, productionUserDataPath, appName) {
  if (!isPreProductionApp(appName) && !isPreProductionVersion(version)) {
    return productionUserDataPath;
  }

  return path.join(appDataPath, "BillingOnHand-PreProduction");
}

module.exports = {
  isPreProductionVersion,
  isPreProductionApp,
  resolveUserDataPath
};
