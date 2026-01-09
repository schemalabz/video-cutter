#!/bin/bash
# Fix "damaged" error for unsigned Electron apps on macOS

APP_PATH="/Applications/Video Cutter.app"

if [ ! -d "$APP_PATH" ]; then
    echo "❌ Video Cutter.app not found in Applications"
    echo "Please drag the app to Applications first, then run this script again"
    exit 1
fi

echo "Removing quarantine attribute..."
xattr -cr "$APP_PATH"

echo "✅ Fixed! You can now open Video Cutter normally."
echo "If it still doesn't work, right-click → Open the first time."

