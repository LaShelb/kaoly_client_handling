#!/bin/sh
# Fabrique « Kaoly Clients.app » et l'installe dans /Applications.
# ponytail : l'application pointe vers ce dossier et vers bun ; si l'un des deux bouge, relancer ce script.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUN="$(command -v bun)"
OUT="$ROOT/dist/Kaoly Clients.app"
rm -rf "$OUT" && mkdir -p "$OUT/Contents/MacOS"
sed -e "s|__BUN__|$BUN|" -e "s|__ROOT__|$ROOT|" "$ROOT/app/main.swift" > "$ROOT/dist/main.swift"
swiftc -O -o "$OUT/Contents/MacOS/KaolyClients" "$ROOT/dist/main.swift"
cat > "$OUT/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Kaoly Clients</string>
  <key>CFBundleIdentifier</key><string>fr.kaoly.clients</string>
  <key>CFBundleExecutable</key><string>KaolyClients</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.1</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict>
</dict></plist>
PLIST
codesign --force -s - "$OUT" >/dev/null 2>&1 || true
rm -rf "/Applications/Kaoly Clients.app" && cp -R "$OUT" "/Applications/Kaoly Clients.app"
echo "Installé : /Applications/Kaoly Clients.app"
