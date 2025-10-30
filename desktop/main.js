const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const server = require('./server');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Local Desk - Desktop Controller',
    backgroundColor: '#1e1e1e'
  });

  mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));

  // Geliştirme modunda DevTools'u aç
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  createWindow();

  // Server'ı başlat
  try {
    await server.start();
    console.log('✅ Local Desk server başlatıldı');
  } catch (error) {
    console.error('❌ Server başlatma hatası:', error);
    dialog.showErrorBox('Başlatma Hatası', 'Sunucu başlatılamadı: ' + error.message);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    server.stop();
    app.quit();
  }
});

app.on('before-quit', () => {
  server.stop();
});

// IPC Event Handlers
ipcMain.handle('get-shortcuts', async () => {
  return server.getShortcuts();
});

ipcMain.handle('save-shortcuts', async (event, shortcuts) => {
  return server.saveShortcuts(shortcuts);
});

ipcMain.handle('get-trusted-devices', async () => {
  return server.getTrustedDevices();
});

ipcMain.handle('remove-trusted-device', async (event, deviceId) => {
  return server.removeTrustedDevice(deviceId);
});

ipcMain.handle('get-server-info', async () => {
  return server.getServerInfo();
});

ipcMain.handle('get-connected-clients', async () => {
  return server.getConnectedClients();
});

// Pairing isteklerini UI'a ilet
server.on('pairing-request', (deviceInfo) => {
  if (mainWindow) {
    mainWindow.webContents.send('pairing-request', deviceInfo);
  }
});

ipcMain.handle('approve-pairing', async (event, deviceId, approved) => {
  return server.handlePairingResponse(deviceId, approved);
});

// İkon seçimi
ipcMain.handle('select-icon', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'İkon Seç',
    filters: [
      { name: 'Resim Dosyaları', extensions: ['png', 'jpg', 'jpeg', 'svg', 'gif', 'ico'] }
    ],
    properties: ['openFile']
  });
  
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }
  
  // Seçilen dosyayı server'a gönder (kopyalama için)
  const iconPath = await server.copyIconFile(result.filePaths[0]);
  
  return {
    canceled: false,
    iconPath: iconPath,
    originalPath: result.filePaths[0]
  };
});

// Uygulama (.exe) seçimi
ipcMain.handle('select-app', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Uygulama Seç',
    filters: [
      { name: 'Uygulamalar', extensions: ['exe'] },
      { name: 'Tüm Dosyalar', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }
  
  return {
    canceled: false,
    appPath: result.filePaths[0]
  };
});

