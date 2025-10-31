const { contextBridge, ipcRenderer } = require('electron');

// Güvenli API'leri renderer process'e expose et
contextBridge.exposeInMainWorld('electronAPI', {
  // Sayfalar yönetimi
  getPages: () => ipcRenderer.invoke('get-pages'),
  addPage: (name, icon, targetApp) => ipcRenderer.invoke('add-page', name, icon, targetApp),
  updatePageName: (pageId, newName) => ipcRenderer.invoke('update-page-name', pageId, newName),
  updatePageTargetApp: (pageId, targetApp) => ipcRenderer.invoke('update-page-target-app', pageId, targetApp),
  deletePage: (pageId) => ipcRenderer.invoke('delete-page', pageId),
  addShortcutToPage: (pageId, shortcut) => ipcRenderer.invoke('add-shortcut-to-page', pageId, shortcut),
  updateShortcutInPage: (pageId, shortcutId, shortcut) => ipcRenderer.invoke('update-shortcut-in-page', pageId, shortcutId, shortcut),
  deleteShortcutFromPage: (pageId, shortcutId) => ipcRenderer.invoke('delete-shortcut-from-page', pageId, shortcutId),
  
  // Shortcuts yönetimi (geriye uyumluluk)
  getShortcuts: () => ipcRenderer.invoke('get-shortcuts'),
  saveShortcuts: (shortcuts) => ipcRenderer.invoke('save-shortcuts', shortcuts),
  
  // Trusted devices
  getTrustedDevices: () => ipcRenderer.invoke('get-trusted-devices'),
  removeTrustedDevice: (deviceId) => ipcRenderer.invoke('remove-trusted-device', deviceId),
  
  // Server info
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),
  getConnectedClients: () => ipcRenderer.invoke('get-connected-clients'),
  
  // Pairing
  onPairingRequest: (callback) => {
    ipcRenderer.on('pairing-request', (event, deviceInfo) => callback(deviceInfo));
  },
  approvePairing: (deviceId, approved) => ipcRenderer.invoke('approve-pairing', deviceId, approved),
  
  // İkon seçimi
  selectIcon: () => ipcRenderer.invoke('select-icon'),
  
  // Uygulama seçimi
  selectApp: () => ipcRenderer.invoke('select-app'),
  
  // Çalışan uygulamaları listele
  getWindows: () => ipcRenderer.invoke('get-windows'),
  
  // Hedef uygulama seç (sayfa için)
  selectTargetApp: () => ipcRenderer.invoke('select-target-app')
});

