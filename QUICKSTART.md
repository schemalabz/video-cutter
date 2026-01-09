# Quick Start Guide

## Run the App

```bash
npm start
```

That's it! The app will open in a window.

## Build for Distribution

To create a `.dmg` file you can share with coworkers:

```bash
npm run build
```

The `.dmg` file will be in the `dist` folder. Just double-click it to install, or share it with your team.

## Requirements

- **FFmpeg** must be installed on the target machine:
  ```bash
  brew install ffmpeg
  ```

  When you build the app, you can bundle FFmpeg with it (see advanced options below).

## Usage

1. Click **"Select Video File"** → Choose your video
2. (Optional) Enter video duration in seconds
3. Click **"+ Add Segment"** → Define start and end times
   - Format: `30` (seconds) or `1:30` (minutes:seconds)
4. Click **"Cut Video"** → Process all segments
5. Find output files next to your original video: `filename_segment_1.mp4`, etc.

## Troubleshooting

**App won't start?**
- Make sure Node.js is installed: `node --version`
- Install dependencies: `npm install`

**Video cutting fails?**
- Check FFmpeg is installed: `ffmpeg -version`
- Install it: `brew install ffmpeg`

**Build fails?**
- Make sure you have Xcode Command Line Tools: `xcode-select --install`

## That's It!

No Xcode, no native modules, no CocoaPods. Just simple web tech that works everywhere.

