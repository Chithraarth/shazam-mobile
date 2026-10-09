#!/bin/sh
# Builds an App Store IPA into ios/build/ipa/Videofy.ipa.
#
# The archive is built unsigned (automatic development signing needs a
# registered device, and Xcode 27 refuses ad-hoc signing for device SDKs),
# then each bundle is signed locally with its entitlements so that push and
# the app group survive the App Store export, which re-signs everything with
# the team's distribution certificate.
#
# Run `npx expo prebuild -p ios` and `pod install` (LANG=en_US.UTF-8) first,
# and bump ios.buildNumber in app.json before each upload.
set -e
cd "$(dirname "$0")/../ios"

ARCHIVE=build/Videofy.xcarchive
rm -rf "$ARCHIVE" build/ipa

xcodebuild -workspace Videofy.xcworkspace -scheme Videofy -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" CODE_SIGNING_ALLOWED=NO archive

APP="$ARCHIVE/Products/Applications/Videofy.app"
codesign -f -s - --entitlements ShareExtension/ShareExtension.entitlements "$APP/PlugIns/ShareExtension.appex"
codesign -f -s - --entitlements VideofyBroadcast/VideofyBroadcast.entitlements "$APP/PlugIns/VideofyBroadcast.appex"
codesign -f -s - --entitlements Videofy/Videofy.entitlements "$APP"

xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportOptionsPlist ../ExportOptions.plist \
  -exportPath build/ipa -allowProvisioningUpdates

echo "IPA: $(pwd)/build/ipa/Videofy.ipa"
