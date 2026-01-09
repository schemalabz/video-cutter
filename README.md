# Video Cutter

A simple macOS app for cutting videos into multiple segments. Vibecoded <3.

## Quick Start

```bash
npm install
npm start
```

## Build for Distribution

```bash
npm run build
```

Creates a `.dmg` file in `dist/` - share it with coworkers. FFmpeg is bundled, so no installation needed. 

**If they get "damaged" error:** Open Terminal and run: `xattr -cr /Applications/Video\ Cutter.app` then try opening again. 

## Usage

1. Select a video file
2. Add segments with start/end times (H:MM:SS format)
3. Cut video

Output files are saved next to the original video with `_segment_N` suffix.