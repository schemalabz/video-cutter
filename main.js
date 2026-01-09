const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { cutVideo, getVideoDuration } = require('./videoProcessor');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 650,
    height: 500,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
  
  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle file selection
ipcMain.handle('select-video', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Handle video duration detection
ipcMain.handle('get-video-duration', async (event, videoPath) => {
  try {
    const duration = await getVideoDuration(videoPath);
    return { success: true, duration };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handle video cutting
ipcMain.handle('cut-video', async (event, { inputPath, startTime, endTime, segmentNumber }) => {
  try {
    const outputPath = await cutVideo(inputPath, startTime, endTime, segmentNumber);
    return { success: true, outputPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

