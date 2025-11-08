/**
 * Local Desk - Desktop Controller
 * 
 * @author Harun Selçuk Çetin
 * @copyright Copyright © 2024 Harun Selçuk Çetin
 * @license MIT
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const server = require('./server');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'src', 'icon.ico'), // Uygulama ikonu
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Local Desk - Desktop Controller',
    backgroundColor: '#1e1e1e',
    autoHideMenuBar: true // Menü barını gizle
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

  // Otomatik güncelleme kontrolü (sadece production'da)
  if (process.env.NODE_ENV !== 'development') {
    checkForUpdates();
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
// Sayfa yönetimi
ipcMain.handle('get-pages', async () => {
  return server.getPages();
});

ipcMain.handle('add-page', async (event, name, icon, targetApp) => {
  return server.addPage(name, icon, targetApp);
});

ipcMain.handle('update-page-target-app', async (event, pageId, targetApp) => {
  return server.updatePageTargetApp(pageId, targetApp);
});

ipcMain.handle('update-page-name', async (event, pageId, newName) => {
  return server.updatePageName(pageId, newName);
});

ipcMain.handle('delete-page', async (event, pageId) => {
  return server.deletePage(pageId);
});

ipcMain.handle('add-shortcut-to-page', async (event, pageId, shortcut) => {
  return server.addShortcutToPage(pageId, shortcut);
});

ipcMain.handle('update-shortcut-in-page', async (event, pageId, shortcutId, shortcut) => {
  return server.updateShortcutInPage(pageId, shortcutId, shortcut);
});

ipcMain.handle('delete-shortcut-from-page', async (event, pageId, shortcutId) => {
  return server.deleteShortcutFromPage(pageId, shortcutId);
});

ipcMain.handle('reorder-shortcuts-in-page', async (event, pageId, shortcutIds) => {
  return server.reorderShortcutsInPage(pageId, shortcutIds);
});

// Geriye uyumluluk için shortcuts
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

// Çalışan uygulamaların listesini al
ipcMain.handle('get-windows', async () => {
  return server.getWindowList();
});

// Sayfa için hedef uygulama seç
ipcMain.handle('select-target-app', async () => {
  // Çalışan uygulamaları al
  const windows = server.getWindowList();
  
  if (windows.length === 0) {
    return { canceled: true, message: 'Çalışan uygulama bulunamadı' };
  }
  
  // Tekrar eden exe'leri filtrele, sadece benzersiz olanları göster
  const uniqueApps = [];
  const seenExes = new Set();
  
  for (const win of windows) {
    if (!seenExes.has(win.exeName.toLowerCase())) {
      seenExes.add(win.exeName.toLowerCase());
      uniqueApps.push(win);
    }
  }
  
  return {
    canceled: false,
    windows: uniqueApps
  };
});

// Harici URL'i default tarayıcıda aç
ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Otomatik Güncelleme Sistemi
function checkForUpdates() {
  // Güncelleme kontrolü yapılıyor mesajı
  autoUpdater.checkForUpdatesAndNotify();

  // Güncelleme bulunduğunda
  autoUpdater.on('update-available', (info) => {
    console.log('🔄 Yeni güncelleme bulundu:', info.version);
    
    if (mainWindow) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
    }

    // Kullanıcıya bildirim göster
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Yeni Güncelleme Mevcut',
      message: `Yeni bir sürüm bulundu: v${info.version}`,
      detail: 'Güncelleme arka planda indiriliyor. İndirme tamamlandığında uygulama yeniden başlatılacak.',
      buttons: ['Tamam']
    });
  });

  // Güncelleme indirildiğinde
  autoUpdater.on('update-downloaded', (info) => {
    console.log('✅ Güncelleme indirildi:', info.version);
    
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version
      });
    }

    // Kullanıcıya yeniden başlatma seçeneği sun
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Güncelleme Hazır',
      message: `Güncelleme indirildi: v${info.version}`,
      detail: 'Uygulamayı şimdi yeniden başlatmak ister misiniz?',
      buttons: ['Şimdi Yeniden Başlat', 'Daha Sonra'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        // Kullanıcı "Şimdi Yeniden Başlat" seçti
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  // Güncelleme hatası
  autoUpdater.on('error', (error) => {
    console.error('❌ Güncelleme hatası:', error);
    // Hata durumunda sessizce devam et, kullanıcıyı rahatsız etme
  });

  // Güncelleme kontrolü tamamlandı (güncelleme yok)
  autoUpdater.on('update-not-available', (info) => {
    console.log('✅ Uygulama güncel:', info.version);
  });

  // İndirme ilerlemesi
  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    }
  });
}

// Manuel güncelleme kontrolü için IPC handler
ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { 
      success: true, 
      updateInfo: result?.updateInfo || null 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
});

// Güncellemeyi indir ve yükle
ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
});

// Güncellemeyi yükle ve yeniden başlat
ipcMain.handle('install-update', async () => {
  try {
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
});

