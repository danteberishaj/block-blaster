const { withAndroidManifest } = require("expo/config-plugins");

module.exports = function withAndroidGameCategory(config) {
  return withAndroidManifest(config, (configWithManifest) => {
    const application = configWithManifest.modResults.manifest.application?.[0];
    if (!application) {
      throw new Error("Android manifest is missing its application element.");
    }

    application.$["android:appCategory"] = "game";
    return configWithManifest;
  });
};
