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
const LocalDeskServer = require('./server');

let mainWindow;
let server;

// Veri dizinini belirle (build modunda kullanıcı veri dizinini kullan)
function getDataDir() {
  // Development modunda server/data kullan
  // Production'da kullanıcı veri dizinini kullan (app.asar salt okunur)
  if (app.isPackaged) {
    // Build modunda: %APPDATA%/Local Desk/data (Windows) veya ~/.config/Local Desk/data (Linux/Mac)
    return path.join(app.getPath('userData'), 'data');
  } else {
    // Development modunda: server/data
    return path.join(__dirname, 'server', 'data');
  }
}

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

  // Server instance'ını oluştur (veri dizini ile)
  const dataDir = getDataDir();
  server = new LocalDeskServer(dataDir);

  // Pairing isteklerini UI'a ilet
  server.on('pairing-request', (deviceInfo) => {
    if (mainWindow) {
      mainWindow.webContents.send('pairing-request', deviceInfo);
    }
  });

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
    if (server) {
      server.stop();
    }
    app.quit();
  }
});

app.on('before-quit', () => {
  if (server) {
    server.stop();
  }
});

// IPC Event Handlers
// Sayfa yönetimi
ipcMain.handle('get-pages', async () => {
  if (!server) return [];
  return server.getPages();
});

ipcMain.handle('add-page', async (event, name, icon, targetApp) => {
  if (!server) return { success: false, message: 'Server henüz başlatılmadı' };
  return server.addPage(name, icon, targetApp);
});

ipcMain.handle('update-page-target-app', async (event, pageId, targetApp) => {
  if (!server) return { success: false, message: 'Server henüz başlatılmadı' };
  return server.updatePageTargetApp(pageId, targetApp);
});

ipcMain.handle('update-page-name', async (event, pageId, newName) => {
  if (!server) return { success: false, message: 'Server henüz başlatılmadı' };
  return server.updatePageName(pageId, newName);
});

ipcMain.handle('delete-page', async (event, pageId) => {
  if (!server) return { success: false, message: 'Server henüz başlatılmadı' };
  return server.deletePage(pageId);
});

ipcMain.handle('add-shortcut-to-page', async (event, pageId, shortcut) => {
  if (!server) return { success: false, message: 'Server henüz başlatılmadı' };
  return server.addShortcutToPage(pageId, shortcut);
});

ipcMain.handle('update-shortcut-in-page', async (event, pageId, shortcutId, shortcut) => {
  if (!server) return { success: false, message: 'Server henüz başlatılmadı' };
  return server.updateShortcutInPage(pageId, shortcutId, shortcut);
});

ipcMain.handle('delete-shortcut-from-page', async (event, pageId, shortcutId) => {
  if (!server) return { success: false, message: 'Server henüz başlatılmadı' };
  return server.deleteShortcutFromPage(pageId, shortcutId);
});

ipcMain.handle('reorder-shortcuts-in-page', async (event, pageId, shortcutIds) => {
  if (!server) return { success: false, message: 'Server henüz başlatılmadı' };
  return server.reorderShortcutsInPage(pageId, shortcutIds);
});

// Geriye uyumluluk için shortcuts
ipcMain.handle('get-shortcuts', async () => {
  if (!server) return [];
  return server.getShortcuts();
});

ipcMain.handle('save-shortcuts', async (event, shortcuts) => {
  if (!server) return { success: false, message: 'Server henüz başlatılmadı' };
  return server.saveShortcuts(shortcuts);
});

ipcMain.handle('get-trusted-devices', async () => {
  if (!server) return [];
  return server.getTrustedDevices();
});

ipcMain.handle('remove-trusted-device', async (event, deviceId) => {
  if (!server) return { success: false, message: 'Server henüz başlatılmadı' };
  return server.removeTrustedDevice(deviceId);
});

ipcMain.handle('get-server-info', async () => {
  if (!server) return { error: 'Server henüz başlatılmadı' };
  return server.getServerInfo();
});

ipcMain.handle('get-connected-clients', async () => {
  if (!server) return [];
  return server.getConnectedClients();
});

ipcMain.handle('approve-pairing', async (event, deviceId, approved) => {
  if (server) {
    return server.handlePairingResponse(deviceId, approved);
  }
  return { success: false, message: 'Server henüz başlatılmadı' };
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
  if (!server) {
    return { canceled: true, error: 'Server henüz başlatılmadı' };
  }
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
  if (!server) return [];
  return server.getWindowList();
});

// Sayfa için hedef uygulama seç
ipcMain.handle('select-target-app', async () => {
  if (!server) {
    return { canceled: true, message: 'Server henüz başlatılmadı' };
  }
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

// Window'u öne getir
ipcMain.handle('focus-window', async () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    mainWindow.show();
    return { success: true };
  }
  return { success: false };
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

