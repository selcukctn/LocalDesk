const { contextBridge, ipcRenderer } = require('electron');

// Güvenli API'leri renderer process'e expose et
contextBridge.exposeInMainWorld('electronAPI', {
  // Shortcuts yönetimi
  getShortcuts: () => ipcRenderer.invoke('get-shortcuts'),
  saveShortcuts: (shortcuts) => ipcRenderer.invoke('save-shortcuts', shortcuts),
  
  // Trusted devices
  getTrustedDevices: () => ipcRenderer.invoke('get-trusted-devices'),
  removeTrustedDevice: (deviceId) => ipcRenderer.invoke('remove-trusted-device', deviceId),
  
  // Server info
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),
  
  // Pairing
  onPairingRequest: (callback) => {
    ipcRenderer.on('pairing-request', (event, deviceInfo) => callback(deviceInfo));
  },
  approvePairing: (deviceId, approved) => ipcRenderer.invoke('approve-pairing', deviceId, approved),
  
  // İkon seçimi
  selectIcon: () => ipcRenderer.invoke('select-icon')
});

