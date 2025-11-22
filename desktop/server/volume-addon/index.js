const path = require('path');
const addonPath = path.join(__dirname, 'build', 'Release', 'volume.node');

let volumeAddon = null;

try {
  volumeAddon = require(addonPath);
} catch (error) {
  console.error('❌ Volume addon yüklenemedi:', error.message);
  console.error('💡 Çözüm: cd desktop/server/volume-addon && npm install');
  
  // Fallback: Dummy implementation
  volumeAddon = {
    getVolume: () => ({ volume: 50, success: false }),
    setVolume: () => ({ success: false }),
    setMute: () => ({ success: false }),
    getMute: () => ({ mute: false, success: false })
  };
}

module.exports = volumeAddon;

