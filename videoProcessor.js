const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;

// Set FFmpeg path - use bundled binaries if available, otherwise system FFmpeg
function getFFmpegPath() {
  const isPackaged = !process.defaultApp || 
                     (process.resourcesPath && process.resourcesPath.indexOf('app.asar') !== -1);
  
  if (isPackaged) {
    // In packaged app, binaries are in extraResources
    const appPath = process.resourcesPath || path.dirname(process.execPath);
    const ffmpegPath = path.join(appPath, 'bin', 'ffmpeg');
    const ffprobePath = path.join(appPath, 'bin', 'ffprobe');
    
    // Check if bundled binaries exist (sync check)
    if (fs.existsSync(ffmpegPath) && fs.existsSync(ffprobePath)) {
      return { ffmpeg: ffmpegPath, ffprobe: ffprobePath };
    }
  } else {
    // In development, try bundled binaries first
    const devFFmpegPath = path.join(__dirname, 'bin', 'ffmpeg');
    const devFFprobePath = path.join(__dirname, 'bin', 'ffprobe');
    
    if (fs.existsSync(devFFmpegPath) && fs.existsSync(devFFprobePath)) {
      return { ffmpeg: devFFmpegPath, ffprobe: devFFprobePath };
    }
  }
  
  // Use system FFmpeg (or return null to use default)
  return null;
}

// Initialize FFmpeg paths
const ffmpegPaths = getFFmpegPath();
if (ffmpegPaths) {
  ffmpeg.setFfmpegPath(ffmpegPaths.ffmpeg);
  ffmpeg.setFfprobePath(ffmpegPaths.ffprobe);
}

/**
 * Get video duration in seconds
 */
function getVideoDuration(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to read video: ${err.message}`));
        return;
      }
      const duration = metadata.format.duration;
      if (!duration) {
        reject(new Error('Could not determine video duration'));
        return;
      }
      resolve(duration);
    });
  });
}

/**
 * Cuts a video file using ffmpeg
 */
async function cutVideo(inputPath, startTime, endTime, segmentNumber) {
  // Check if ffmpeg is available
  try {
    await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (error) {
    throw new Error(
      'FFmpeg is not available. The app includes bundled FFmpeg, but if you see this error, please install it: brew install ffmpeg'
    );
  }

  // Generate output filename
  const inputDir = path.dirname(inputPath);
  const inputName = path.basename(inputPath, path.extname(inputPath));
  const inputExt = path.extname(inputPath);
  const outputPath = path.join(
    inputDir,
    `${inputName}_segment_${segmentNumber}${inputExt}`
  );

  // Remove existing file if present
  try {
    await fsPromises.unlink(outputPath);
  } catch (err) {
    // File doesn't exist, that's fine
  }

  // Calculate duration
  const duration = endTime - startTime;

  return new Promise((resolve, reject) => {
    // Try copy first (fast, no re-encoding)
    const command = ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .outputOptions('-c copy')
      .outputOptions('-avoid_negative_ts make_zero')
      .on('end', () => resolve(outputPath))
      .on('error', (err) => {
        // If copy fails, try re-encoding
        console.log('Copy codec failed, trying re-encode...', err.message);
        ffmpeg(inputPath)
          .setStartTime(startTime)
          .setDuration(duration)
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions('-avoid_negative_ts make_zero')
          .on('end', () => resolve(outputPath))
          .on('error', (err2) => {
            reject(new Error(`Failed to cut video: ${err2.message}`));
          })
          .save(outputPath);
      });
    
    command.save(outputPath);
  });
}

module.exports = { cutVideo, getVideoDuration };

