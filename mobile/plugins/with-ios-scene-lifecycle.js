/**
 * Adopt the UIScene life cycle on iOS.
 *
 * Why: iOS 27 refuses to launch an app built with the iOS 27 SDK unless it
 * uses scenes. The app traps on launch in
 * `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`, which we
 * hit on the iPhone 15 Pro Max on 2026-10-08. The Expo SDK 57 template
 * predates this. SDK 58 (still `next` at the time) fixes it in its template,
 * and SDK 57 already ships the runtime half (`ExpoAppSceneDelegate`).
 *
 * This plugin backports the SDK 58 template's three changes, verbatim in
 * intent:
 *   1. a `SceneDelegate` subclassing `ExpoAppSceneDelegate`
 *   2. `UIApplicationSceneManifest` in Info.plist pointing at it
 *   3. the AppDelegate conforms to `ExpoReactNativeFactoryProvider` and stops
 *      creating the window itself (the scene delegate does that)
 *
 * DELETE THIS PLUGIN when upgrading to SDK 58: its template does all of this.
 */
const fs = require('fs');
const path = require('path');
const { IOSConfig, withAppDelegate, withDangerousMod, withInfoPlist, withXcodeProject } = require('expo/config-plugins');

const SCENE_DELEGATE = `internal import Expo

// Added by plugins/with-ios-scene-lifecycle.js (backport of the SDK 58 template).
@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  // Extension point for config plugins.
}
`;

function withSceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });
}

function withAppDelegateForScenes(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('with-ios-scene-lifecycle expects a Swift AppDelegate.');
    }
    let src = cfg.modResults.contents;

    const decl = 'class AppDelegate: ExpoAppDelegate {';
    if (src.includes(decl)) {
      src = src.replace(decl, 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
    } else if (!src.includes('ExpoReactNativeFactoryProvider')) {
      throw new Error('with-ios-scene-lifecycle: AppDelegate declaration not found; the template changed.');
    }

    // The template starts React Native into a window it creates here. Under
    // scenes, SceneDelegate creates the window and starts React Native instead.
    const windowBlock = /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;
    if (windowBlock.test(src)) {
      src = src.replace(
        windowBlock,
        '    // The window is created and React Native is started by `SceneDelegate` under the\n' +
          '    // scene-based life cycle (required by the iOS 27 SDK).\n'
      );
    } else if (!src.includes('started by `SceneDelegate`')) {
      throw new Error('with-ios-scene-lifecycle: window creation block not found; the template changed.');
    }

    cfg.modResults.contents = src;
    return cfg;
  });
}

function withSceneDelegateFile(config) {
  // Write the file, then register it with the Xcode target.
  config = withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const projectName = IOSConfig.XcodeUtils.getProjectName(cfg.modRequest.projectRoot);
      const file = path.join(cfg.modRequest.platformProjectRoot, projectName, 'SceneDelegate.swift');
      fs.writeFileSync(file, SCENE_DELEGATE);
      return cfg;
    },
  ]);
  return withXcodeProject(config, (cfg) => {
    const projectName = IOSConfig.XcodeUtils.getProjectName(cfg.modRequest.projectRoot);
    const filepath = `${projectName}/SceneDelegate.swift`;
    if (!cfg.modResults.hasFile(filepath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath,
        groupName: projectName,
        project: cfg.modResults,
      });
    }
    return cfg;
  });
}

module.exports = function withIosSceneLifecycle(config) {
  config = withSceneManifest(config);
  config = withAppDelegateForScenes(config);
  config = withSceneDelegateFile(config);
  return config;
};
