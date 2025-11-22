let displayAddon = null;

try {
  displayAddon = require('./build/Release/display.node');
} catch (error) {
  console.warn('⚠️ Display addon yüklenemedi:', error.message);
  console.warn('💡 Çözüm: cd desktop/server/display-addon && npm install');
  
  // Fallback: Mock fonksiyonlar
  displayAddon = {
    enableMiracastReceiver: () => {
      console.warn('⚠️ Display addon yüklü değil, mock fonksiyon kullanılıyor');
      return { success: false, message: 'Display addon yüklü değil' };
    },
    isMiracastReceiverEnabled: () => {
      return { enabled: false, message: 'Display addon yüklü değil' };
    },
    createVirtualDisplay: (width, height) => {
      console.warn('⚠️ Display addon yüklü değil, mock fonksiyon kullanılıyor');
      return { success: false, message: 'Display addon yüklü değil' };
    },
    removeVirtualDisplay: () => {
      return { success: false, message: 'Display addon yüklü değil' };
    },
    getDisplayCount: () => {
      return 1; // Varsayılan
    }
  };
}

module.exports = displayAddon;

