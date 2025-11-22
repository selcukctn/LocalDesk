const path = require('path');
const addonPath = path.join(__dirname, 'build', 'Release', 'media.node');

let mediaAddon = null;

try {
  mediaAddon = require(addonPath);
} catch (error) {
  console.error('❌ Media addon yüklenemedi:', error.message);
  console.error('💡 Çözüm: cd desktop/server/media-addon && npm install');
  
  // Fallback: Dummy implementation
  mediaAddon = {
    getMediaStatus: () => ({
      isPlaying: false,
      title: 'Medya oynatıcı bulunamadı',
      artist: '',
      duration: 0,
      position: 0,
      success: false
    })
  };
}

module.exports = mediaAddon;

