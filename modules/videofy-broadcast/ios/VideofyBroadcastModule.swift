import ExpoModulesCore
import ReplayKit
import UIKit

// Keys and paths shared with the VideofyBroadcast extension. Keep in sync
// with plugins/broadcast/SampleHandler.swift.
enum BroadcastShared {
  static let appGroup = "group.com.videofy.app"
  static let extensionBundleId = "com.videofy.app.broadcast"
  static let tokenKey = "vb.token"
  static let apiBaseKey = "vb.apiBase"
  static let regionKey = "vb.region"
  static let appActiveKey = "vb.appActive"
  static let resultsDir = "BackgroundScans"

  static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }
  static var resultsURL: URL? {
    FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)?
      .appendingPathComponent(resultsDir, isDirectory: true)
  }
}

public class VideofyBroadcastModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VideofyBroadcast")

    Function("isSupported") { () -> Bool in
      BroadcastShared.defaults != nil
    }

    Function("setSession") { (token: String, apiBase: String, region: String) in
      let d = BroadcastShared.defaults
      d?.set(token, forKey: BroadcastShared.tokenKey)
      d?.set(apiBase, forKey: BroadcastShared.apiBaseKey)
      d?.set(region, forKey: BroadcastShared.regionKey)
    }

    Function("clearSession") {
      let d = BroadcastShared.defaults
      d?.removeObject(forKey: BroadcastShared.tokenKey)
    }

    Function("setAppActive") { (active: Bool) in
      BroadcastShared.defaults?.set(active, forKey: BroadcastShared.appActiveKey)
    }

    // RPSystemBroadcastPickerView is the only way to start a broadcast; its
    // inner button is tapped for the user so the app can use its own button.
    AsyncFunction("start") { () in
      let picker = RPSystemBroadcastPickerView(frame: CGRect(x: 0, y: 0, width: 1, height: 1))
      picker.preferredExtension = BroadcastShared.extensionBundleId
      picker.showsMicrophoneButton = false
      guard let button = picker.subviews.compactMap({ $0 as? UIButton }).first else {
        throw Exception(name: "PickerUnavailable", description: "Screen broadcast isn't available on this device.")
      }
      button.sendActions(for: .touchUpInside)
    }.runOnQueue(.main)

    // Results the extension saved: <id>.json (+ <id>.jpg thumbnail). They
    // are returned once and then deleted.
    Function("consumeResults") { () -> String in
      guard let dir = BroadcastShared.resultsURL,
            let files = try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)
      else { return "[]" }
      var out: [[String: Any]] = []
      for file in files where file.pathExtension == "json" {
        defer { try? FileManager.default.removeItem(at: file) }
        guard let data = try? Data(contentsOf: file),
              var entry = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        else { continue }
        let thumb = file.deletingPathExtension().appendingPathExtension("jpg")
        entry["thumbBase64"] = (try? Data(contentsOf: thumb))?.base64EncodedString() ?? NSNull()
        try? FileManager.default.removeItem(at: thumb)
        out.append(entry)
      }
      let json = (try? JSONSerialization.data(withJSONObject: out)) ?? Data("[]".utf8)
      return String(data: json, encoding: .utf8) ?? "[]"
    }
  }
}
