// Makes the generated iOS project build and launch with Xcode 27 / iOS 27.
//
// 1. Apps built with the iOS 27 SDK must use the UIScene lifecycle or they
//    fail to launch. React Native 0.81 (Expo SDK 54) still starts from the
//    app delegate, so this adds a SceneDelegate that creates the window and
//    starts React Native, and forwards deep links / universal links.
// 2. Xcode 27 rejects pod targets that declare an iOS version below 15.
// 3. React Native Firebase headers import non-modular React headers, which
//    static framework builds reject unless explicitly allowed.
//
// Must be listed BEFORE @react-native-firebase/* in app.json: config mods run
// in reverse order, so this then runs after Firebase has edited AppDelegate.
const { withAppDelegate, withDangerousMod, withInfoPlist } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const SCENE_MARKER = "// @videofy scene-lifecycle";
const PODFILE_MARKER = "# @videofy ios-27";

const SCENE_DELEGATE = `
${SCENE_MARKER}
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }

    var launchOptions = appDelegate.launchOptions ?? [:]
    // With scenes, a cold-start deep link arrives here, not in launchOptions.
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window
    appDelegate.reactNativeFactory?.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    if url.host?.lowercased() == "firebaseauth" { return }
    RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;

function withSceneLifecycle(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
          },
        ],
      },
    };
    return cfg;
  });

  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== "swift") {
      throw new Error("with-ios-27: expected a Swift AppDelegate");
    }
    let src = cfg.modResults.contents;
    if (src.includes(SCENE_MARKER)) return cfg;

    const replace = (from, to) => {
      if (!src.includes(from)) throw new Error(`with-ios-27: AppDelegate no longer contains:\n${from}`);
      src = src.replace(from, to);
    };

    replace("  var window: UIWindow?\n", "  var window: UIWindow?\n  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?\n");
    // The window and React Native now start in SceneDelegate.
    replace("    window = UIWindow(frame: UIScreen.main.bounds)\n", "    self.launchOptions = launchOptions\n");
    replace(
      '    factory.startReactNative(\n      withModuleName: "main",\n      in: window,\n      launchOptions: launchOptions)\n',
      "",
    );
    cfg.modResults.contents = src + SCENE_DELEGATE;
    return cfg;
  });
}

function withPodfileFixes(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const file = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      let podfile = fs.readFileSync(file, "utf8");
      if (podfile.includes(PODFILE_MARKER)) return cfg;
      const anchor = /(\s*:ccache_enabled => ccache_enabled\?\(podfile_properties\),\n\s*\)\n)/;
      if (!anchor.test(podfile)) throw new Error("with-ios-27: couldn't find react_native_post_install in the Podfile");
      podfile = podfile.replace(
        anchor,
        `$1
    ${PODFILE_MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        if bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1
          bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
        bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`,
      );
      fs.writeFileSync(file, podfile);
      return cfg;
    },
  ]);
}

module.exports = function withIos27(config) {
  return withPodfileFixes(withSceneLifecycle(config));
};
