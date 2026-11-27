const path = require("path");

const PRE_PRODUCTION_VERSION_PATTERN = /-(?:alpha|beta|rc)(?:[.-]|$)/i;

function isPreProductionVersion(version) {
  return PRE_PRODUCTION_VERSION_PATTERN.test(String(version || "").trim());
}

function resolveUserDataPath(appDataPath, version, productionUserDataPath) {
  if (!isPreProductionVersion(version)) {
    return productionUserDataPath;
  }

  return path.join(appDataPath, "BillingOnHand-PreProduction");
}

module.exports = {
  isPreProductionVersion,
  resolveUserDataPath
};
