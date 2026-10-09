import CoreImage
import ReplayKit
import UIKit
import UserNotifications

// Videofy background scan (ReplayKit broadcast upload extension).
//
// The user starts the broadcast from Videofy and switches to the app that's
// playing the video. Frames are ignored while Videofy itself is showing;
// once it's in the background, a frame is kept every 2.5s for 15s. The
// frames go to /api/identify with the session the app shared, the answer
// is shown as a notification, and the result is saved for the app's
// History. Keys must match modules/videofy-broadcast/ios.
private enum Shared {
  static let appGroup = "group.com.videofy.app"
  static let tokenKey = "vb.token"
  static let apiBaseKey = "vb.apiBase"
  static let regionKey = "vb.region"
  static let appActiveKey = "vb.appActive"
  static let resultsDir = "BackgroundScans"
}

class SampleHandler: RPBroadcastSampleHandler {
  private let captureSeconds: TimeInterval = 15
  private let shotEvery: TimeInterval = 2.5
  private let maxFrames = 7
  private let maxEdge: CGFloat = 1024
  // How long to wait for the user to leave Videofy before giving up.
  private let waitForBackground: TimeInterval = 120

  private let defaults = UserDefaults(suiteName: Shared.appGroup)
  private let ciContext = CIContext()
  private let queue = DispatchQueue(label: "in.videofy.broadcast")
  private var startedAt = Date()
  private var windowStart: Date?
  private var lastShot: Date?
  private var frames: [Data] = []
  private var finished = false
  private var timer: DispatchSourceTimer?

  override func broadcastStarted(withSetupInfo setupInfo: [String: NSObject]?) {
    startedAt = Date()
    guard defaults?.string(forKey: Shared.tokenKey)?.isEmpty == false else {
      stop(message: "Open Videofy and sign in, then start the background scan again.")
      return
    }
    // Ends the window on time even if the screen stops changing (ReplayKit
    // only sends frames when something on screen moves).
    let t = DispatchSource.makeTimerSource(queue: queue)
    t.schedule(deadline: .now() + 1, repeating: 1)
    t.setEventHandler { [weak self] in self?.tick() }
    t.resume()
    timer = t
  }

  override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer, with sampleBufferType: RPSampleBufferType) {
    guard sampleBufferType == .video else { return }
    queue.sync {
      guard !finished else { return }
      let now = Date()
      let appActive = defaults?.bool(forKey: Shared.appActiveKey) ?? false
      if windowStart == nil {
        if appActive { return }
        windowStart = now
      }
      // Don't scan Videofy's own screen if the user comes back early.
      guard !appActive else { return }
      if let last = lastShot, now.timeIntervalSince(last) < shotEvery { return }
      guard frames.count < maxFrames, let jpeg = encode(sampleBuffer) else { return }
      frames.append(jpeg)
      lastShot = now
      if frames.count >= maxFrames { finishCapture() }
    }
  }

  private func tick() {
    guard !finished else { return }
    let now = Date()
    if let start = windowStart {
      if now.timeIntervalSince(start) >= captureSeconds { finishCapture() }
    } else if now.timeIntervalSince(startedAt) >= waitForBackground {
      finished = true
      stop(message: "Switch to the video you want to identify within 2 minutes of starting the scan.")
    }
  }

  // Runs on `queue`.
  private func finishCapture() {
    guard !finished else { return }
    finished = true
    timer?.cancel()
    guard !frames.isEmpty else {
      stop(message: "Nothing was captured — play the video and try again. No scan was used.")
      return
    }
    upload(frames)
  }

  private func encode(_ sampleBuffer: CMSampleBuffer) -> Data? {
    guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return nil }
    var image = CIImage(cvPixelBuffer: pixelBuffer)
    if let raw = CMGetAttachment(sampleBuffer, key: RPVideoSampleOrientationKey as CFString, attachmentModeOut: nil) as? NSNumber,
       let orientation = CGImagePropertyOrientation(rawValue: raw.uint32Value) {
      image = image.oriented(orientation)
    }
    let longest = max(image.extent.width, image.extent.height)
    if longest > maxEdge {
      let scale = maxEdge / longest
      image = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    }
    let options = [kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption: 0.7]
    return ciContext.jpegRepresentation(of: image, colorSpace: CGColorSpaceCreateDeviceRGB(), options: options)
  }

  private func upload(_ frames: [Data]) {
    guard let token = defaults?.string(forKey: Shared.tokenKey),
          let base = defaults?.string(forKey: Shared.apiBaseKey),
          let url = URL(string: "\(base)/api/identify")
    else {
      stop(message: "Open Videofy and sign in, then try again.")
      return
    }
    let body: [String: Any] = [
      "imageData": frames[0].base64EncodedString(),
      "extraFrames": frames.dropFirst().map { $0.base64EncodedString() },
      "mimeType": "image/jpeg",
      "region": defaults?.string(forKey: Shared.regionKey) ?? "IN",
      "source": "screen",
    ]
    var request = URLRequest(url: url, timeoutInterval: 60)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)

    URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
      guard let self else { return }
      let status = (response as? HTTPURLResponse)?.statusCode ?? 0
      if error != nil || status == 0 {
        self.notify(title: "Couldn’t reach Videofy", body: "Check your connection and try again. No scan was used.", id: nil)
        self.stop(message: "Couldn’t reach Videofy. No scan was used.")
        return
      }
      switch status {
      case 200:
        guard let data, let result = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
          self.stop(message: "Something went wrong. Please try again.")
          return
        }
        let id = self.save(result: result, thumb: frames[0])
        let (title, body) = Self.describe(result)
        self.notify(title: title, body: body, id: id)
        self.stop(message: title)
      case 401:
        self.notify(title: "Sign in again", body: "Open Videofy to sign in, then scan again.", id: nil)
        self.stop(message: "Open Videofy and sign in again.")
      case 402:
        self.notify(title: "You’re out of scans", body: "Open Videofy to get more scans.", id: nil)
        self.stop(message: "You’re out of scans.")
      default:
        self.notify(title: "Couldn’t identify that", body: "Your scan wasn’t used — please try again.", id: nil)
        self.stop(message: "Couldn’t identify that. Your scan wasn’t used.")
      }
    }.resume()
  }

  private static func describe(_ r: [String: Any]) -> (String, String) {
    let found = r["found"] as? Bool ?? false
    guard found else {
      return ("No match this time", "Try again while a title, face or caption is on screen.")
    }
    let name = (r["title"] as? String) ?? (r["creator"] as? String) ?? "Found it"
    var parts: [String] = []
    if let year = r["year"] as? Int { parts.append(String(year)) }
    if let platform = r["platform"] as? String, !platform.isEmpty { parts.append("on \(platform)") }
    if let confidence = r["confidence"] as? Int { parts.append("\(confidence)% match") }
    return ("Found it: \(name)", parts.isEmpty ? "Tap to see the details." : parts.joined(separator: " · "))
  }

  private func save(result: [String: Any], thumb: Data) -> String? {
    guard let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: Shared.appGroup)?
      .appendingPathComponent(Shared.resultsDir, isDirectory: true) else { return nil }
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    let id = UUID().uuidString
    let entry: [String: Any] = ["id": id, "at": Int(Date().timeIntervalSince1970 * 1000), "result": result]
    guard let json = try? JSONSerialization.data(withJSONObject: entry) else { return nil }
    try? json.write(to: dir.appendingPathComponent("\(id).json"))
    try? thumb.write(to: dir.appendingPathComponent("\(id).jpg"))
    return id
  }

  private func notify(title: String, body: String, id: String?) {
    let content = UNMutableNotificationContent()
    content.title = title
    content.body = body
    content.sound = .default
    content.userInfo = ["type": "background-scan", "id": id ?? ""]
    let request = UNNotificationRequest(identifier: id ?? UUID().uuidString, content: content, trigger: nil)
    UNUserNotificationCenter.current().add(request)
  }

  // Ending a broadcast with an error is the only way an extension can stop
  // itself; iOS shows the message in its "broadcast stopped" alert.
  private func stop(message: String) {
    timer?.cancel()
    finishBroadcastWithError(NSError(domain: "in.videofy.broadcast", code: 0, userInfo: [NSLocalizedDescriptionKey: message]))
  }
}
