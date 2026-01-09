const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BIN_DIR = path.join(__dirname, 'bin');
const FFMPEG_URL = 'https://evermeet.cx/ffmpeg/ffmpeg-7.1.zip';
const FFPROBE_URL = 'https://evermeet.cx/ffmpeg/ffprobe-7.1.zip';

// Create bin directory if it doesn't exist
if (!fs.existsSync(BIN_DIR)) {
  fs.mkdirSync(BIN_DIR, { recursive: true });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

function unzipFile(zipPath, destDir) {
  try {
    execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: 'inherit' });
    fs.unlinkSync(zipPath);
    // Make executable
    const files = fs.readdirSync(destDir);
    files.forEach(file => {
      if (file.startsWith('ffmpeg') || file.startsWith('ffprobe')) {
        const filePath = path.join(destDir, file);
        fs.chmodSync(filePath, 0o755);
      }
    });
  } catch (error) {
    console.error('Error unzipping:', error);
    throw error;
  }
}

async function setupFFmpeg() {
  console.log('Downloading FFmpeg binaries...');
  
  const ffmpegZip = path.join(BIN_DIR, 'ffmpeg.zip');
  const ffprobeZip = path.join(BIN_DIR, 'ffprobe.zip');
  
  try {
    await downloadFile(FFMPEG_URL, ffmpegZip);
    console.log('Downloaded ffmpeg');
    
    await downloadFile(FFPROBE_URL, ffprobeZip);
    console.log('Downloaded ffprobe');
    
    console.log('Extracting...');
    unzipFile(ffmpegZip, BIN_DIR);
    unzipFile(ffprobeZip, BIN_DIR);
    
    console.log('✅ FFmpeg binaries ready in bin/');
  } catch (error) {
    console.error('❌ Failed to download FFmpeg:', error.message);
    console.log('\nAlternative: Install via Homebrew: brew install ffmpeg');
    process.exit(1);
  }
}

if (require.main === module) {
  setupFFmpeg();
}

module.exports = { setupFFmpeg };

