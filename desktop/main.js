/**
 * Local Desk - Desktop Controller
 * 
 * @author Harun Selçuk Çetin
 * @copyright Copyright © 2024 Harun Selçuk Çetin
 * @license MIT
 */

const { app, BrowserWindow, ipcMain, dialog, shell, desktopCapturer, screen } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const LocalDeskServer = require('./server');

let mainWindow;
let server;
const webrtcPeers = new Map(); // socketId -> { peerConnection, stream }

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

  // DevTools'u aç (sadece geliştirme modunda)
  // if (process.env.NODE_ENV === 'development') {
  //   mainWindow.webContents.openDevTools();
  // }

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

  // Server'a screen sources callback'i ekle
  server.getScreenSourcesCallback = async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 150, height: 150 }
      });
      
      // Kaynakları kategorize et
      const screens = sources
        .filter(s => s.id.startsWith('screen:'))
        .map(s => ({
          id: s.id,
          name: s.name,
          type: 'screen',
          thumbnail: s.thumbnail ? s.thumbnail.toDataURL() : null
        }));
      
      const windows = sources
        .filter(s => s.id.startsWith('window:'))
        .map(s => ({
          id: s.id,
          name: s.name,
          type: 'window',
          thumbnail: s.thumbnail ? s.thumbnail.toDataURL() : null
        }));
      
      return { screens, windows };
    } catch (error) {
      console.error('❌ Screen sources hatası:', error);
      return { screens: [], windows: [] };
    }
  };

  // Server'a screen info callback'i ekle (sourceId'ye göre ekran bilgisi)
  server.getScreenInfoCallback = async (sourceId) => {
    try {
      if (!sourceId) {
        // Fallback: Ana ekran
        const primaryDisplay = screen.getPrimaryDisplay();
        return {
          screenSize: primaryDisplay.size,
          bounds: primaryDisplay.bounds
        };
      }

      // Ekran ID'sinden ekran index'ini çıkar (format: "screen:INDEX:0")
      if (sourceId.startsWith('screen:')) {
        const screenIndexMatch = sourceId.match(/^screen:(\d+):/);
        if (screenIndexMatch) {
          const screenIndex = parseInt(screenIndexMatch[1], 10);
          const displays = screen.getAllDisplays();
          if (displays[screenIndex]) {
            const display = displays[screenIndex];
            return {
              screenSize: display.size,
              bounds: display.bounds
            };
          }
        }
      } else if (sourceId.startsWith('window:')) {
        // Pencere seçildiğinde, ana ekranı kullan (pencere bounds'larını almak karmaşık)
        const primaryDisplay = screen.getPrimaryDisplay();
        return {
          screenSize: primaryDisplay.size,
          bounds: primaryDisplay.bounds
        };
      }

      // Fallback: Ana ekran
      const primaryDisplay = screen.getPrimaryDisplay();
      return {
        screenSize: primaryDisplay.size,
        bounds: primaryDisplay.bounds
      };
    } catch (error) {
      console.error('❌ Screen info callback hatası:', error);
      // Fallback: Ana ekran
      const primaryDisplay = screen.getPrimaryDisplay();
      return {
        screenSize: primaryDisplay.size,
        bounds: primaryDisplay.bounds
      };
    }
  };

  // WebRTC event handlers
  setupWebRTCHandlers(server);
  
  // Remote control event handlers
  setupRemoteControlHandlers(server);

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

// Ekran ve pencere kaynaklarını al (WebRTC için)
ipcMain.handle('get-screen-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 150, height: 150 }
    });
    
    // Kaynakları kategorize et
    const screens = sources
      .filter(s => s.id.startsWith('screen:'))
      .map(s => ({
        id: s.id,
        name: s.name,
        type: 'screen',
        thumbnail: s.thumbnail ? s.thumbnail.toDataURL() : null
      }));
    
    const windows = sources
      .filter(s => s.id.startsWith('window:'))
      .map(s => ({
        id: s.id,
        name: s.name,
        type: 'window',
        thumbnail: s.thumbnail ? s.thumbnail.toDataURL() : null
      }));
    
    return { screens, windows };
  } catch (error) {
    console.error('❌ Screen sources hatası:', error);
    return { screens: [], windows: [] };
  }
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

// WebRTC Screen Sharing Setup
function setupWebRTCHandlers(server) {
  if (!server) return;

  // WebRTC offer event
  server.on('webrtc-offer', async ({ socketId, offer, deviceId, sourceId }) => {
    console.log('📹 WebRTC offer alındı main.js\'de');
    console.log('📹 Socket ID:', socketId);
    console.log('📹 Device ID:', deviceId);
    console.log('📹 Offer type:', offer?.type);
    console.log('📹 Source ID:', sourceId);
    
    try {
      console.log('📹 Getting desktop sources...');
      // Ekran listesini al
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 0, height: 0 }
      });

      console.log('📹 Found', sources.length, 'sources');
      console.log('📹 Sources:', sources.map(s => ({ id: s.id, name: s.name })));

      // Mobile'dan gelen sourceId'yi kullan (eğer varsa)
      let selectedSource = null;

      if (sourceId) {
        // Mobile'dan seçilen source'u kullan
        selectedSource = sources.find(s => s.id === sourceId);
        console.log('📹 Mobile\'dan seçilen source:', sourceId);
      }

      // Eğer source seçilmemişse, ilk ekranı kullan (fallback)
      if (!selectedSource) {
        selectedSource = sources.find(source => source.id.startsWith('screen:'));
        console.log('📹 Source seçilmedi, ilk ekran kullanılıyor');
      }
      
      if (!selectedSource) {
        console.error('❌ Ekran/pencere bulunamadı');
        return;
      }

      console.log('✅ Seçilen source:', selectedSource.name, 'ID:', selectedSource.id);
      
      // Seçilen ekran/pencere bilgisini server'a ilet (mouse kontrolü için)
      // Ekran ID'sinden ekran index'ini çıkar (format: "screen:INDEX:0")
      let screenBounds = null;
      if (selectedSource.id.startsWith('screen:')) {
        const screenIndexMatch = selectedSource.id.match(/^screen:(\d+):/);
        if (screenIndexMatch) {
          const screenIndex = parseInt(screenIndexMatch[1], 10);
          const displays = screen.getAllDisplays();
          if (displays[screenIndex]) {
            screenBounds = displays[screenIndex].bounds;
            console.log('📹 Seçilen ekran bounds:', screenBounds);
            // Server'a ekran bilgisini ilet
            server.setActiveScreenBounds(socketId, screenBounds);
          }
        }
      } else if (selectedSource.id.startsWith('window:')) {
        // Pencere seçildiğinde, pencereyi bul ve bounds'larını al
        // Not: Electron'da pencere bounds'larını almak için BrowserWindow.getAllWindows() kullanılabilir
        // Ancak bu karmaşık olabilir, şimdilik ana ekranı kullan
        const primaryDisplay = screen.getPrimaryDisplay();
        screenBounds = primaryDisplay.bounds;
        console.log('📹 Pencere seçildi, ana ekran bounds kullanılıyor:', screenBounds);
        server.setActiveScreenBounds(socketId, screenBounds);
      }
      
      // Electron constraint'leri
      const constraints = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSource.id,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080,
            minFrameRate: 15,
            maxFrameRate: 30
          }
        }
      };

      console.log('📹 Constraints:', JSON.stringify(constraints, null, 2));
      
      // Media stream al (renderer process'e gönder)
      console.log('📹 Sending start-screen-capture to renderer');
      mainWindow.webContents.send('start-screen-capture', {
        socketId,
        offer,
        constraints
      });
      console.log('✅ start-screen-capture event sent to renderer');

    } catch (error) {
      console.error('❌ WebRTC screen capture hatası:', error);
      console.error('❌ Error stack:', error.stack);
    }
  });

  // WebRTC answer event
  server.on('webrtc-answer', ({ socketId, answer }) => {
    console.log('📹 WebRTC answer alındı:', socketId);
    mainWindow.webContents.send('webrtc-answer', { socketId, answer });
  });

  // WebRTC ICE candidate event
  server.on('webrtc-ice-candidate', ({ socketId, candidate }) => {
    console.log('📹 WebRTC ICE candidate alındı:', socketId);
    mainWindow.webContents.send('webrtc-ice-candidate', { socketId, candidate });
  });

  // WebRTC disconnect event
  server.on('webrtc-disconnect', ({ socketId }) => {
    console.log('📹 WebRTC bağlantısı kesildi:', socketId);
    mainWindow.webContents.send('webrtc-disconnect', { socketId });
    webrtcPeers.delete(socketId);
  });
}

// Remote Control Handlers
function setupRemoteControlHandlers(server) {
  if (!server) return;

  // Mouse move
  server.on('remote-mouse-move', ({ socketId, x, y }) => {
    try {
      const displays = screen.getAllDisplays();
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.size;
      
      // Normalize coordinates (0-1 range) to screen coordinates
      const screenX = Math.round(x * width);
      const screenY = Math.round(y * height);
      
      // Electron'da mouse move için native API kullanacağız
      // Bu kısmı server/index.js'de yönetmek daha iyi
      mainWindow.webContents.send('remote-mouse-move', { x: screenX, y: screenY });
    } catch (error) {
      console.error('❌ Mouse move hatası:', error);
    }
  });

  // Mouse click
  server.on('remote-mouse-click', ({ socketId, button, x, y }) => {
    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.size;
      
      const screenX = Math.round(x * width);
      const screenY = Math.round(y * height);
      
      console.log(`🖱️ Mouse click: button=${button}, x=${screenX}, y=${screenY}`);
      mainWindow.webContents.send('remote-mouse-click', { button, x: screenX, y: screenY });
    } catch (error) {
      console.error('❌ Mouse click hatası:', error);
    }
  });

  // Mouse scroll
  server.on('remote-mouse-scroll', ({ socketId, deltaX, deltaY }) => {
    try {
      console.log(`🖱️ Mouse scroll: deltaX=${deltaX}, deltaY=${deltaY}`);
      mainWindow.webContents.send('remote-mouse-scroll', { deltaX, deltaY });
    } catch (error) {
      console.error('❌ Mouse scroll hatası:', error);
    }
  });

  // Keyboard input
  server.on('remote-keyboard-input', ({ socketId, text, keys }) => {
    try {
      if (text) {
        console.log(`⌨️ Keyboard text: ${text}`);
        mainWindow.webContents.send('remote-keyboard-text', { text });
      }
      if (keys && keys.length > 0) {
        console.log(`⌨️ Keyboard keys: ${keys.join('+')}`);
        mainWindow.webContents.send('remote-keyboard-keys', { keys });
      }
    } catch (error) {
      console.error('❌ Keyboard input hatası:', error);
    }
  });
}

// IPC handlers for WebRTC signaling from renderer
ipcMain.on('webrtc-local-offer', (event, { socketId, offer }) => {
  console.log('📹 webrtc-local-offer received from renderer');
  if (server) {
    server.sendWebRTCOffer(socketId, offer);
  } else {
    console.error('❌ Server not available');
  }
});

ipcMain.on('webrtc-local-answer', (event, { socketId, answer }) => {
  console.log('📹 webrtc-local-answer received from renderer');
  console.log('📹 Socket ID:', socketId);
  console.log('📹 Answer type:', answer?.type);
  
  if (server) {
    console.log('📹 Sending answer to mobile via server');
    server.sendWebRTCAnswer(socketId, answer);
    console.log('✅ Answer sent to mobile');
  } else {
    console.error('❌ Server not available');
  }
});

ipcMain.on('webrtc-local-ice-candidate', (event, { socketId, candidate }) => {
  console.log('📹 webrtc-local-ice-candidate received from renderer');
  console.log('📹 Socket ID:', socketId);
  
  if (server) {
    console.log('📹 Sending ICE candidate to mobile via server');
    server.sendWebRTCICECandidate(socketId, candidate);
    console.log('✅ ICE candidate sent to mobile');
  } else {
    console.error('❌ Server not available');
  }
});

