// Adds the VideofyBroadcast ReplayKit upload extension (background screen
// scan) to the generated iOS project. The extension's sources live in
// plugins/broadcast and are copied into ios/VideofyBroadcast on prebuild.
const { withXcodeProject } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const NAME = "VideofyBroadcast";
const FILES = { source: "SampleHandler.swift", plist: "Info.plist", entitlements: `${NAME}.entitlements` };

function mainTeam(pbx) {
  const configs = pbx.pbxXCBuildConfigurationSection();
  for (const key in configs) {
    const bs = configs[key].buildSettings;
    if (bs && bs.DEVELOPMENT_TEAM && !String(bs.PRODUCT_NAME || "").includes("Extension")) {
      return String(bs.DEVELOPMENT_TEAM).replace(/"/g, "");
    }
  }
  return null;
}

module.exports = function withBroadcastExtension(config) {
  return withXcodeProject(config, (cfg) => {
    const pbx = cfg.modResults;
    const iosRoot = cfg.modRequest.platformProjectRoot;
    const srcDir = path.join(cfg.modRequest.projectRoot, "plugins", "broadcast");
    const destDir = path.join(iosRoot, NAME);
    fs.mkdirSync(destDir, { recursive: true });
    for (const file of Object.values(FILES)) fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));

    if (pbx.pbxTargetByName(NAME)) return cfg;

    const bundleId = `${cfg.ios.bundleIdentifier}.broadcast`;
    const team = cfg.ios.appleTeamId || mainTeam(pbx);

    const group = pbx.addPbxGroup(Object.values(FILES), NAME, NAME);
    const groups = pbx.hash.project.objects.PBXGroup;
    for (const key of Object.keys(groups)) {
      const g = groups[key];
      if (typeof g === "object" && g.name === undefined && g.path === undefined) pbx.addToPbxGroup(group.uuid, key);
    }
    // node-xcode's addTarget needs these sections to exist.
    const objects = pbx.hash.project.objects;
    objects.PBXTargetDependency = objects.PBXTargetDependency || {};
    objects.PBXContainerItemProxy = objects.PBXContainerItemProxy || {};

    const target = pbx.addTarget(NAME, "app_extension", NAME, bundleId);
    pbx.addBuildPhase([FILES.source], "PBXSourcesBuildPhase", "Sources", target.uuid);
    pbx.addBuildPhase([], "PBXResourcesBuildPhase", "Resources", target.uuid);
    pbx.addBuildPhase([], "PBXFrameworksBuildPhase", "Frameworks", target.uuid);

    const configs = pbx.pbxXCBuildConfigurationSection();
    for (const key in configs) {
      const bs = configs[key].buildSettings;
      if (!bs || bs.PRODUCT_NAME !== `"${NAME}"`) continue;
      Object.assign(bs, {
        INFOPLIST_FILE: `"${NAME}/${FILES.plist}"`,
        CODE_SIGN_ENTITLEMENTS: `"${NAME}/${FILES.entitlements}"`,
        CODE_SIGN_STYLE: "Automatic",
        PRODUCT_BUNDLE_IDENTIFIER: `"${bundleId}"`,
        MARKETING_VERSION: `"${cfg.version}"`,
        CURRENT_PROJECT_VERSION: `"${cfg.ios.buildNumber || "1"}"`,
        IPHONEOS_DEPLOYMENT_TARGET: "15.1",
        SWIFT_VERSION: "5.0",
        TARGETED_DEVICE_FAMILY: `"1"`,
        GENERATE_INFOPLIST_FILE: "NO",
        APPLICATION_EXTENSION_API_ONLY: "YES",
        CLANG_ENABLE_MODULES: "YES",
        SKIP_INSTALL: "YES",
        ...(team ? { DEVELOPMENT_TEAM: team } : {}),
      });
    }
    if (team) pbx.addTargetAttribute("DevelopmentTeam", team, pbx.pbxTargetByName(NAME));
    return cfg;
  });
};
