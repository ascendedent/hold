#!/usr/bin/env bash
# Build Hold for the paired iPhone on the Mac mini.
#
# Linux is the source of truth. The Mac only compiles, because the iOS build
# needs Xcode. The copy lives in ~/Developer/Hold, never ~/Documents (iCloud
# stamps xattrs that codesign rejects).
#
#   scripts/mac.sh status
#   scripts/mac.sh build-device
#   scripts/mac.sh install
#
# Signing reuses the shared SSH session opened by
# ~/projects/PreparedHero/scripts/mac.sh unlock. A new SSH login has its own
# security session, and codesign fails in it even when the keychain looks
# unlocked. Do not ask for or handle the Mac password.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# The Mac's user, address, and checkout path are yours, so they live in the
# git-ignored scripts/mac.env (MAC_USER=, MAC_HOST=, MAC_PATH=).
[[ -f "$ROOT/scripts/mac.env" ]] && source "$ROOT/scripts/mac.env"
: "${MAC_USER:?set MAC_USER in scripts/mac.env}"
: "${MAC_HOST:?set MAC_HOST in scripts/mac.env}"
MAC_PATH="${MAC_PATH:-/Users/$MAC_USER/Developer/Hold}"
TEAM="${TEAM:-GV5YN8MSGY}"
REMOTE="${MAC_USER}@${MAC_HOST}"
# Same fixed socket as ~/projects/PreparedHero/scripts/mac.sh, so signing
# runs in the session its unlock opened.
CTL="$HOME/.ssh/cm-preparedhero-mac"
SSH_OPTS=(-o BatchMode=yes -o ControlMaster=auto -o "ControlPath=$CTL" -o ControlPersist=12h)
export RSYNC_RSH="ssh ${SSH_OPTS[*]}"

mac() { ssh "${SSH_OPTS[@]}" "$REMOTE" "zsh -lc $(printf '%q' "$1")"; }

device_id() {
  mac "xcrun devicectl list devices 2>/dev/null" \
    | awk '/physical/ && / available / { for (i=1;i<=NF;i++) if ($i ~ /^[0-9A-F]{8}-[0-9A-F]{16}$/) { print $i; exit } }'
}

case "${1:-status}" in
  status)
    mac "sw_vers -productVersion; xcodebuild -version | head -1; echo node \$(node -v); df -h / | tail -1; security show-keychain-info ~/Library/Keychains/login.keychain-db"
    echo "iPhone: $(device_id || true)"
    ;;
  push)
    case "$MAC_PATH" in *" "*) echo "MAC_PATH must not contain a space" >&2; exit 1;; esac
    cp "$ROOT/seed/catalog.json" "$ROOT/mobile/assets/catalog.json"
    # personal/plan.json is git-ignored. Without it the app ships with no plan.
    if [[ -f "$ROOT/personal/plan.json" ]]; then
      cp "$ROOT/personal/plan.json" "$ROOT/mobile/assets/personal.json"
    else
      echo '{}' > "$ROOT/mobile/assets/personal.json"
    fi
    mac "mkdir -p '$MAC_PATH/mobile'"
    rsync -az --delete \
      --exclude node_modules/ --exclude /ios/ --exclude /android/ \
      --exclude .expo/ --exclude dist/ --exclude '*.log' \
      "$ROOT/mobile/" "$REMOTE:$MAC_PATH/mobile/"
    echo "pushed mobile/ -> $REMOTE:$MAC_PATH/mobile"
    ;;
  setup)
    "$0" push
    mac "cd '$MAC_PATH/mobile' && npm ci --no-audit --no-fund --fetch-timeout=120000 --fetch-retries=5 && npx expo prebuild --platform ios --no-install && cd ios && pod install"
    ;;
  build-device)
    "$0" push
    mac "cd '$MAC_PATH/mobile' && \
      if [ ! -d node_modules/expo ]; then npm ci --no-audit --no-fund --fetch-timeout=120000 --fetch-retries=5; fi && \
      if [ ! -d ios/Hold.xcworkspace ]; then npx expo prebuild --platform ios; fi && \
      cd ios && xcodebuild \
      -workspace Hold.xcworkspace -scheme Hold \
      -configuration Release -destination 'generic/platform=iOS' \
      -derivedDataPath build \
      -allowProvisioningUpdates DEVELOPMENT_TEAM=$TEAM CODE_SIGN_STYLE=Automatic \
      build > build.log 2>&1; s=\$?; grep -E 'error:|BUILD (SUCCEEDED|FAILED)' build.log | sort -u; exit \$s"
    ;;
  install)
    id="$(device_id)"
    [[ -n "$id" ]] || { echo "No paired iPhone available" >&2; exit 1; }
    app="$MAC_PATH/mobile/ios/build/Build/Products/Release-iphoneos/Hold.app"
    mac "xcrun devicectl device install app --device $id '$app' && \
         xcrun devicectl device process launch --device $id --terminate-existing \$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' '$app/Info.plist')"
    ;;
  *)
    sed -n '2,16p' "$0"; exit 1;;
esac
