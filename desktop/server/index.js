const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const EventEmitter = require('events');
const { spawn } = require('child_process');

const discovery = require('./discovery');

// Volume addon yükleme (Windows ses kontrolü için)
let volumeAddon = null;
try {
  volumeAddon = require('./volume-addon');
  console.log('✅ Volume addon yüklendi');
} catch (error) {
  console.error('❌ Volume addon yüklenemedi:', error.message);
  console.error('💡 Çözüm: cd desktop/server/volume-addon && npm install');
}

// Media addon yükleme (Windows medya durumu için)
let mediaAddon = null;
try {
  mediaAddon = require('./media-addon');
  console.log('✅ Media addon yüklendi');
} catch (error) {
  console.error('❌ Media addon yüklenemedi:', error.message);
  console.error('💡 Çözüm: cd desktop/server/media-addon && npm install');
}

// RobotJS yükleme (opsiyonel - yüklenemezse graceful failure)
let robot = null;
try {
  robot = require('robotjs');
  console.log('✅ RobotJS yüklendi (remote control aktif)');
  console.log('✅ RobotJS functions:', {
    moveMouse: typeof robot.moveMouse,
    mouseClick: typeof robot.mouseClick,
    getScreenSize: typeof robot.getScreenSize
  });
  
  // Test: Screen size al
  try {
    const screenSize = robot.getScreenSize();
    console.log('✅ RobotJS screen size:', screenSize);
  } catch (testError) {
    console.error('❌ RobotJS test failed:', testError.message);
  }
} catch (error) {
  console.error('❌ RobotJS yüklenemedi, remote control devre dışı');
  console.error('❌ Error:', error.message);
  console.error('❌ Stack:', error.stack);
  console.error('💡 Çözüm: npm rebuild robotjs komutunu çalıştırın');
}

class LocalDeskServer extends EventEmitter {
  constructor(dataDir = null) {
    super();
    this.app = express();
    this.server = null;
    this.io = null;
    this.port = 3100;
    this.deviceId = null;
    this.deviceName = os.hostname();
    this.pages = []; // Artık shortcuts yerine pages kullanıyoruz
    this.trustedDevices = [];
    this.connectedClients = new Map();
    this.pendingPairings = new Map();
    this.keyboardAddon = null;
    this.robot = robot;
    
    // Veri dosyaları - build modunda kullanıcı veri dizinini kullan
    // Development modunda __dirname/data, production'da userData/data
    if (dataDir) {
      this.dataDir = dataDir;
    } else {
      // Fallback: development modu için eski yol
      this.dataDir = path.join(__dirname, 'data');
    }
    this.pagesFile = path.join(this.dataDir, 'pages.json'); // shortcuts.json -> pages.json
    this.trustedFile = path.join(this.dataDir, 'trusted.json');
    this.configFile = path.join(this.dataDir, 'config.json');
    
    console.log('📁 Veri dizini:', this.dataDir);
  }

  async start() {
    console.log('🚀 Local Desk Server başlatılıyor...');
    
    // Veri klasörünü oluştur
    await this.ensureDataDir();
    
    // Konfigürasyonu yükle
    await this.loadConfig();
    await this.loadPages();
    await this.loadTrustedDevices();
    
    // Klavye addon'unu yükle (Windows'ta)
    this.loadKeyboardAddon();
    
    // Express middleware
    this.app.use(express.json());
    this.app.use('/icons', express.static(path.join(this.dataDir, 'icons')));
    
    // HTTP endpoints
    this.setupRoutes();
    
    // HTTP server
    this.server = http.createServer(this.app);
    
    // Socket.IO
    this.io = socketIO(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    
    this.setupSocketIO();
    
    // Server'ı başlat
    await new Promise((resolve, reject) => {
      this.server.listen(this.port, '0.0.0.0', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Yerel IP adreslerini göster
    const localIPs = discovery.getLocalIPAddresses();
    console.log(`✅ HTTP/Socket.IO server çalışıyor: ${this.port}`);
    console.log(`📡 Erişim adresleri:`);
    console.log(`   - localhost:${this.port} (Bu bilgisayar)`);
    localIPs.forEach(ip => {
      console.log(`   - ${ip}:${this.port} (Ağdan erişim)`);
    });
    
    // Discovery servislerini başlat
    await discovery.start(this.port, this.deviceId, this.deviceName);
    console.log('✅ UDP + mDNS discovery servisleri aktif');
    
    return true;
  }

  async stop() {
    console.log('🛑 Local Desk Server durduruluyor...');
    
    await discovery.stop();
    
    if (this.io) {
      this.io.close();
    }
    
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(() => resolve());
      });
    }
    
    console.log('✅ Server durduruldu');
  }

  setupRoutes() {
    // Cihaz bilgisi
    this.app.get('/device-info', (req, res) => {
      // Ekran boyutunu al
      let screenSize = { width: 1920, height: 1080 };
      if (this.robot) {
        try {
          screenSize = this.robot.getScreenSize();
        } catch (error) {
          // Varsayılan kullan
        }
      }
      
      res.json({
        id: this.deviceId,
        name: this.deviceName,
        type: 'desktop',
        version: '1.0.0',
        platform: process.platform,
        screenSize
      });
    });
    
    // Server info (ekran boyutu dahil)
    this.app.get('/server-info', (req, res) => {
      res.json(this.getServerInfo());
    });
    
    // Ses seviyesini al
    this.app.get('/volume', async (req, res) => {
      if (process.platform !== 'win32') {
        return res.json({ volume: 50, success: false });
      }

      if (volumeAddon) {
        try {
          const result = volumeAddon.getVolume();
          return res.json({ volume: result.volume, success: result.success });
        } catch (error) {
          console.error('❌ Volume addon hatası:', error.message);
        }
      }
      
      // Fallback: Varsayılan değer
      res.json({ volume: 50, success: false });
    });

    // Ses seviyesini ayarla
    this.app.post('/volume', async (req, res) => {
      if (process.platform !== 'win32') {
        return res.json({ success: false, message: 'Sadece Windows destekleniyor' });
      }

      const { volume } = req.body;
      if (typeof volume !== 'number' || volume < 0 || volume > 100) {
        return res.json({ success: false, message: 'Geçersiz ses seviyesi (0-100)' });
      }

      if (volumeAddon) {
        try {
          const result = volumeAddon.setVolume(volume);
          return res.json({ success: result.success, volume });
        } catch (error) {
          console.error('❌ Volume addon hatası:', error.message);
        }
      }
      
      res.json({ success: false, message: 'Volume addon yüklenemedi' });
    });

    // Medya durumu (Windows Media Control API ile - C++ addon)
    this.app.get('/media-status', async (req, res) => {
      if (process.platform !== 'win32') {
        return res.json({
          isPlaying: false,
          title: 'Sadece Windows destekleniyor',
          artist: '',
          duration: 0,
          position: 0,
          success: false
        });
      }

      // C++ addon ile medya durumunu al
      if (mediaAddon) {
        try {
          const result = mediaAddon.getMediaStatus();
          return res.json({
            isPlaying: result.isPlaying,
            title: result.title,
            artist: result.artist,
            duration: result.duration,
            position: result.position,
            success: result.success
          });
        } catch (error) {
          console.error('❌ Media addon hatası:', error.message);
        }
      }
      
      // Fallback: PowerShell script (eğer addon yüklenemediyse)
      try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        const scriptPath = path.join(__dirname, 'get-media-status.ps1');
        const { stdout } = await execAsync(
          `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`,
          { timeout: 5000 }
        );
        
        if (stdout) {
          try {
            const status = JSON.parse(stdout.trim());
            return res.json(status);
          } catch (parseError) {
            console.error('❌ Medya durumu parse hatası:', parseError);
          }
        }
      } catch (error) {
        console.error('❌ Medya durumu alınamadı:', error.message);
      }
      
      // Varsayılan değerler
      res.json({
        isPlaying: false,
        title: 'Medya oynatıcı bulunamadı',
        artist: '',
        duration: 0,
        position: 0,
        success: false
      });
    });
    
    // Sayfa listesi (yeni API)
    this.app.get('/pages', (req, res) => {
      res.json(this.pages);
    });
    
    // Geriye uyumluluk için shortcuts endpoint'i (ilk sayfanın shortcut'larını döndür)
    this.app.get('/shortcuts', (req, res) => {
      const firstPage = this.pages[0];
      res.json(firstPage ? firstPage.shortcuts : []);
    });
    
    // İkon servisi (static middleware ile hallediliyor)
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });
  }

  setupSocketIO() {
    this.io.on('connection', (socket) => {
      console.log('📱 Yeni bağlantı:', socket.id);
      
      // Pairing isteği
      socket.on('pair-request', async (data) => {
        console.log('🔐 Pairing isteği alındı:', data);
        const { deviceId, deviceName, deviceType } = data;
        
        // Aynı deviceId'den eski bağlantı var mı kontrol et
        for (const [existingSocketId, client] of this.connectedClients.entries()) {
          if (client.deviceId === deviceId) {
            console.log('⚠️ Aynı cihazdan eski bağlantı bulundu, kapatılıyor:', existingSocketId);
            if (client.socket && client.socket.connected) {
              client.socket.disconnect(true);
            }
            this.connectedClients.delete(existingSocketId);
          }
        }
        
        // Zaten güvenilir mi?
        const trusted = this.trustedDevices.find(d => d.id === deviceId);
        if (trusted) {
          console.log('✅ Güvenilir cihaz otomatik bağlanıyor:', deviceName);
          socket.emit('pair-response', { 
            success: true, 
            message: 'Zaten güvenilir cihaz',
            autoConnected: true 
          });
          this.connectedClients.set(socket.id, { deviceId, deviceName, socket });
          
          // Sayfaları hemen gönder
          console.log('📤 Sayfalar gönderiliyor (otomatik):', this.pages.length, 'adet');
          socket.emit('pages-update', this.pages);
          return;
        }
        
        // Bekleyen pairing'e ekle
        this.pendingPairings.set(deviceId, {
          deviceId,
          deviceName,
          deviceType,
          socket,
          timestamp: Date.now()
        });
        
        // Main process'e bildir (kullanıcı onayı için)
        this.emit('pairing-request', { deviceId, deviceName, deviceType });
      });
      
      // Kısayol çalıştırma
      socket.on('execute-shortcut', (data) => {
        console.log('⌨️ Kısayol çalıştırılıyor:', data);
        const { shortcutId, keys, appPath, actionType, pageId } = data;
        
        // Cihaz güvenilir mi kontrol et
        const client = this.connectedClients.get(socket.id);
        if (!client) {
          console.error('❌ Yetkisiz cihaz!');
          socket.emit('error', { message: 'Yetkisiz cihaz' });
          return;
        }
        
        const trusted = this.trustedDevices.find(d => d.id === client.deviceId);
        if (!trusted) {
          console.error('❌ Güvenilir cihaz değil!');
          socket.emit('error', { message: 'Güvenilir cihaz değil' });
          return;
        }
        
        console.log('✅ Cihaz doğrulandı:', client.deviceName);
        console.log('📋 Eylem:', actionType, '| Keys:', keys, '| AppPath:', appPath, '| PageId:', pageId);
        
        // Sayfa bilgisini kontrol et (targetApp için)
        // Önce pageId ile, yoksa shortcutId'den page'i bul
        let targetWindowHandle = null;
        let targetPage = null;
        
        if (pageId) {
          targetPage = this.pages.find(p => p.id === pageId);
        } else {
          // pageId yoksa shortcutId'den page'i bul
          for (const page of this.pages) {
            const shortcut = page.shortcuts?.find(s => s.id === shortcutId);
            if (shortcut) {
              targetPage = page;
              break;
            }
          }
        }
        
        if (targetPage && targetPage.targetApp) {
          console.log('🎯 Hedef uygulama tespit edildi:', targetPage.targetApp, '| Page:', targetPage.name);
          // Window handle'ı bul
          targetWindowHandle = this.findWindowHandle(targetPage.targetApp);
          if (targetWindowHandle) {
            console.log('✅ Window handle bulundu:', targetWindowHandle);
          } else {
            console.warn('⚠️ Hedef uygulama çalışmıyor veya bulunamadı:', targetPage.targetApp);
            console.warn('⚠️ Global moda geçiliyor (aktif pencereye gönderilecek)');
          }
        } else {
          console.log('🌐 Hedef uygulama yok, global mod (aktif pencereye gönderilecek)');
        }
        
        // Eylem tipine göre çalıştır
        if (actionType === 'keys' || actionType === 'both') {
          // Klavye girdisini gönder
          if (keys && keys.length > 0) {
            console.log('⌨️ Klavye tuşları gönderiliyor:', keys);
            this.executeKeys(keys, targetWindowHandle);
          } else {
            console.warn('⚠️ Keys boş, klavye girdisi atlanıyor');
          }
        }
        
        if (actionType === 'app' || actionType === 'both') {
          // Uygulamayı başlat
          if (appPath) {
            console.log('🚀 Uygulama başlatılıyor:', appPath);
            this.launchApp(appPath);
          } else {
            console.warn('⚠️ AppPath boş, uygulama başlatma atlanıyor');
          }
        }
        
        socket.emit('execute-result', { success: true, shortcutId });
      });
      
      // WebRTC signaling - Remote Screen için
      socket.on('webrtc-offer', async (data) => {
        console.log('📹 WebRTC offer alındı, socket:', socket.id);
        console.log('📹 Offer data:', data);
        
        const client = this.connectedClients.get(socket.id);
        if (!client) {
          console.error('❌ Client not found in connectedClients!');
          socket.emit('error', { message: 'Yetkisiz cihaz' });
          return;
        }
        
        console.log('✅ Client authenticated:', client.deviceName);
        
        // Offer'ı main process'e ilet (desktopCapturer için)
        console.log('📹 Emitting webrtc-offer to main process');
        this.emit('webrtc-offer', { 
          socketId: socket.id, 
          offer: data.offer, 
          deviceId: client.deviceId 
        });
        console.log('✅ webrtc-offer emitted to main process');
      });

      socket.on('webrtc-answer', (data) => {
        console.log('📹 WebRTC answer alındı:', socket.id);
        // Answer'ı main process'e ilet
        this.emit('webrtc-answer', { socketId: socket.id, answer: data.answer });
      });

      socket.on('webrtc-ice-candidate', (data) => {
        console.log('📹 WebRTC ICE candidate alındı:', socket.id);
        // ICE candidate'ı main process'e ilet
        this.emit('webrtc-ice-candidate', { socketId: socket.id, candidate: data.candidate });
      });

      // Remote Screen kontrolü - Mouse
      socket.on('remote-mouse-move', (data) => {
        const client = this.connectedClients.get(socket.id);
        if (!client) {
          console.warn('⚠️ remote-mouse-move: Client not found');
          return;
        }
        const trusted = this.trustedDevices.find(d => d.id === client.deviceId);
        if (!trusted) {
          console.warn('⚠️ remote-mouse-move: Device not trusted');
          return;
        }
        
        console.log('🖱️ remote-mouse-move received:', { x: data.x, y: data.y });
        console.log('🖱️ RobotJS available?', !!this.robot);
        
        // RobotJS ile mouse move
        if (this.robot && typeof data.x === 'number' && typeof data.y === 'number') {
          try {
            const screenSize = this.robot.getScreenSize();
            // Normalize coordinates (0-1) to actual screen size
            const screenX = Math.round(data.x * screenSize.width);
            const screenY = Math.round(data.y * screenSize.height);
            console.log('🖱️ Moving mouse to:', { screenX, screenY, screenSize });
            this.robot.moveMouse(screenX, screenY);
            console.log('✅ Mouse moved successfully');
          } catch (error) {
            console.error('❌ Mouse move hatası:', error.message);
            console.error('❌ Error stack:', error.stack);
          }
        } else {
          console.warn('⚠️ RobotJS not available or invalid coordinates');
          console.warn('⚠️ RobotJS:', this.robot);
          console.warn('⚠️ Data:', data);
        }
      });

      socket.on('remote-mouse-click', (data) => {
        console.log('🖱️ remote-mouse-click received:', data);
        const client = this.connectedClients.get(socket.id);
        if (!client) {
          console.warn('⚠️ remote-mouse-click: Client not found');
          return;
        }
        const trusted = this.trustedDevices.find(d => d.id === client.deviceId);
        if (!trusted) {
          console.warn('⚠️ remote-mouse-click: Device not trusted');
          return;
        }
        
        console.log('🖱️ RobotJS available?', !!this.robot);
        
        // RobotJS ile mouse click
        if (this.robot) {
          try {
            const screenSize = this.robot.getScreenSize();
            const screenX = Math.round(data.x * screenSize.width);
            const screenY = Math.round(data.y * screenSize.height);
            
            console.log('🖱️ Clicking at:', { screenX, screenY, screenSize, button: data.button });
            
            // Önce mouse'u hareket ettir
            this.robot.moveMouse(screenX, screenY);
            
            // Click (button: 'left', 'right', 'middle')
            const buttonMap = { left: 'left', right: 'right', middle: 'middle', 0: 'left', 1: 'middle', 2: 'right' };
            const robotButton = buttonMap[data.button] || 'left';
            
            this.robot.mouseClick(robotButton);
            console.log(`✅ Mouse click: ${robotButton} at (${screenX}, ${screenY})`);
          } catch (error) {
            console.error('❌ Mouse click hatası:', error.message);
            console.error('❌ Error stack:', error.stack);
          }
        } else {
          console.warn('⚠️ RobotJS not available for mouse click');
        }
      });

      socket.on('remote-mouse-scroll', (data) => {
        const client = this.connectedClients.get(socket.id);
        if (!client) return;
        const trusted = this.trustedDevices.find(d => d.id === client.deviceId);
        if (!trusted) return;
        
        // RobotJS ile scroll
        if (this.robot) {
          try {
            // RobotJS scrollMouse(x, y) - x: horizontal, y: vertical
            // Pozitif değerler yukarı/sağa, negatif değerler aşağı/sola kaydırır
            const scrollAmount = Math.round(-data.deltaY / 10); // Normalize scroll amount
            this.robot.scrollMouse(0, scrollAmount);
            console.log(`🖱️ Mouse scroll: ${scrollAmount}`);
          } catch (error) {
            console.error('❌ Mouse scroll hatası:', error.message);
          }
        }
      });

      // Mouse button down (sürükleme için)
      socket.on('remote-mouse-button-down', (data) => {
        const client = this.connectedClients.get(socket.id);
        if (!client) return;
        const trusted = this.trustedDevices.find(d => d.id === client.deviceId);
        if (!trusted) return;
        
        if (this.robot) {
          try {
            const screenSize = this.robot.getScreenSize();
            const screenX = Math.round(data.x * screenSize.width);
            const screenY = Math.round(data.y * screenSize.height);
            
            // Mouse'u hareket ettir
            this.robot.moveMouse(screenX, screenY);
            
            // Button down (button: 'left', 'right', 'middle')
            const buttonMap = { left: 'left', right: 'right', middle: 'middle', 0: 'left', 1: 'middle', 2: 'right' };
            const robotButton = buttonMap[data.button] || 'left';
            
            // RobotJS'de mouseToggle kullan (down = true)
            this.robot.mouseToggle('down', robotButton);
            console.log(`🖱️ Mouse button down: ${robotButton} at (${screenX}, ${screenY})`);
          } catch (error) {
            console.error('❌ Mouse button down hatası:', error.message);
          }
        }
      });

      // Mouse button up (sürükleme bitişi için)
      socket.on('remote-mouse-button-up', (data) => {
        const client = this.connectedClients.get(socket.id);
        if (!client) return;
        const trusted = this.trustedDevices.find(d => d.id === client.deviceId);
        if (!trusted) return;
        
        if (this.robot) {
          try {
            const screenSize = this.robot.getScreenSize();
            const screenX = Math.round(data.x * screenSize.width);
            const screenY = Math.round(data.y * screenSize.height);
            
            // Mouse'u hareket ettir
            this.robot.moveMouse(screenX, screenY);
            
            // Button up (button: 'left', 'right', 'middle')
            const buttonMap = { left: 'left', right: 'right', middle: 'middle', 0: 'left', 1: 'middle', 2: 'right' };
            const robotButton = buttonMap[data.button] || 'left';
            
            // RobotJS'de mouseToggle kullan (up = false)
            this.robot.mouseToggle('up', robotButton);
            console.log(`🖱️ Mouse button up: ${robotButton} at (${screenX}, ${screenY})`);
          } catch (error) {
            console.error('❌ Mouse button up hatası:', error.message);
          }
        }
      });

      // Remote Screen kontrolü - Keyboard
      socket.on('remote-keyboard-input', (data) => {
        const client = this.connectedClients.get(socket.id);
        if (!client) return;
        const trusted = this.trustedDevices.find(d => d.id === client.deviceId);
        if (!trusted) return;
        
        // RobotJS ile keyboard input
        if (this.robot) {
          try {
            if (data.text) {
              // Metin girişi
              this.robot.typeString(data.text);
              console.log(`⌨️ Keyboard text: ${data.text}`);
            } else if (data.keys && data.keys.length > 0) {
              // Özel tuşlar (modifier + key)
              // Format: ['control', 'c'] gibi
              const modifiers = [];
              let mainKey = null;
              
              for (const key of data.keys) {
                const lowerKey = key.toLowerCase();
                if (['control', 'alt', 'shift', 'command', 'win'].includes(lowerKey)) {
                  modifiers.push(lowerKey);
                } else {
                  mainKey = lowerKey;
                }
              }
              
              if (mainKey) {
                this.robot.keyTap(mainKey, modifiers);
                console.log(`⌨️ Keyboard keys: ${modifiers.join('+')}+${mainKey}`);
              }
            }
          } catch (error) {
            console.error('❌ Keyboard input hatası:', error.message);
          }
        }
      });

      // Medya kontrolü
      socket.on('remote-media-control', (data) => {
        const client = this.connectedClients.get(socket.id);
        if (!client) return;
        const trusted = this.trustedDevices.find(d => d.id === client.deviceId);
        if (!trusted) return;
        
        console.log('🎵 Media control:', data.action);
        
        if (this.robot) {
          try {
            // Medya kontrolü için keyboard shortcut'ları kullan
            // Çoğu medya oynatıcı bu tuşları destekler
            let keys = null;
            
            switch (data.action) {
              case 'play':
              case 'pause':
              case 'playpause':
                // Space = Play/Pause (çoğu uygulama: Spotify, YouTube, VLC, vb.)
                keys = ['space'];
                break;
              case 'next':
                // Ctrl+Right = Next (Spotify, YouTube Music)
                // Veya sadece medya tuşu
                if (process.platform === 'win32') {
                  keys = ['control', 'right'];
                } else {
                  keys = ['audio_next'];
                }
                break;
              case 'previous':
                // Ctrl+Left = Previous
                if (process.platform === 'win32') {
                  keys = ['control', 'left'];
                } else {
                  keys = ['audio_prev'];
                }
                break;
              case 'seekforward':
                // Right Arrow = +10 saniye (çoğu medya oynatıcı)
                keys = ['right'];
                break;
              case 'seekbackward':
                // Left Arrow = -10 saniye
                keys = ['left'];
                break;
              case 'stop':
                // Stop için genelde 's' tuşu
                keys = ['s'];
                break;
              case 'volumeup':
                // Volume Up tuşu
                if (process.platform === 'win32') {
                  keys = ['volumeup'];
                }
                break;
              case 'volumedown':
                // Volume Down tuşu
                if (process.platform === 'win32') {
                  keys = ['volumedown'];
                }
                break;
              case 'volumemute':
                // Volume Mute tuşu
                if (process.platform === 'win32') {
                  keys = ['volumemute'];
                }
                break;
            }
            
            if (keys) {
              const modifiers = [];
              let mainKey = null;
              
              for (const key of keys) {
                const lowerKey = key.toLowerCase();
                if (['control', 'alt', 'shift', 'command', 'win'].includes(lowerKey)) {
                  modifiers.push(lowerKey);
                } else {
                  mainKey = lowerKey;
                }
              }
              
              if (mainKey) {
                this.robot.keyTap(mainKey, modifiers);
                console.log(`🎵 Media control: ${modifiers.join('+')}+${mainKey} (${data.action})`);
              }
            }
          } catch (error) {
            console.error('❌ Media control hatası:', error.message);
          }
        }
      });

      // Ses seviyesi kontrolü
      socket.on('remote-volume-control', async (data) => {
        const client = this.connectedClients.get(socket.id);
        if (!client) return;
        const trusted = this.trustedDevices.find(d => d.id === client.deviceId);
        if (!trusted) return;
        
        console.log('🔊 Volume control:', data.action, data.value);
        
        if (process.platform === 'win32') {
          try {
            if (data.action === 'set' && typeof data.value === 'number') {
              // Ses seviyesini ayarla (C++ addon ile)
              if (volumeAddon) {
                const result = volumeAddon.setVolume(data.value);
                if (result.success) {
                  console.log(`🔊 Ses seviyesi ayarlandı: ${data.value}%`);
                } else {
                  console.error('❌ Ses seviyesi ayarlanamadı');
                }
              } else {
                console.error('❌ Volume addon yüklenemedi');
              }
            } else if (data.action === 'up' || data.action === 'down') {
              // Ses seviyesini artır/azalt (RobotJS ile tuş basma)
              if (this.robot) {
                const key = data.action === 'up' ? 'volumeup' : 'volumedown';
                this.robot.keyTap(key);
                console.log(`🔊 Ses seviyesi ${data.action === 'up' ? 'artırıldı' : 'azaltıldı'}`);
              }
            } else if (data.action === 'mute') {
              // Sesi kapat/aç (C++ addon ile)
              if (volumeAddon) {
                // Önce mevcut mute durumunu al
                const muteStatus = volumeAddon.getMute();
                const newMuteState = !muteStatus.mute; // Toggle
                const result = volumeAddon.setMute(newMuteState);
                if (result.success) {
                  console.log(`🔊 Ses ${newMuteState ? 'kapatıldı' : 'açıldı'}`);
                }
              } else if (this.robot) {
                // Fallback: RobotJS ile
                this.robot.keyTap('volumemute');
                console.log('🔊 Ses kapatıldı/açıldı');
              }
            }
          } catch (error) {
            console.error('❌ Ses kontrolü hatası:', error.message);
          }
        }
      });

      socket.on('disconnect', () => {
        console.log('📴 Bağlantı kesildi:', socket.id);
        this.connectedClients.delete(socket.id);
        // WebRTC bağlantısını temizle
        this.emit('webrtc-disconnect', { socketId: socket.id });
      });
    });
  }

  // WebRTC signaling için helper metodlar
  sendWebRTCOffer(socketId, offer) {
    console.log('📹 sendWebRTCOffer called for socket:', socketId);
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      console.log('✅ Socket found, emitting webrtc-offer to mobile');
      socket.emit('webrtc-offer', { offer });
      console.log('✅ webrtc-offer emitted');
    } else {
      console.error('❌ Socket not found for ID:', socketId);
    }
  }

  sendWebRTCAnswer(socketId, answer) {
    console.log('📹 sendWebRTCAnswer called for socket:', socketId);
    console.log('📹 Answer type:', answer?.type);
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      console.log('✅ Socket found, emitting webrtc-answer to mobile');
      console.log('📹 Socket connected?', socket.connected);
      socket.emit('webrtc-answer', { answer });
      console.log('✅ webrtc-answer emitted to mobile successfully');
    } else {
      console.error('❌ Socket not found for ID:', socketId);
      console.error('❌ Available sockets:', Array.from(this.io.sockets.sockets.keys()));
    }
  }

  sendWebRTCICECandidate(socketId, candidate) {
    console.log('📹 sendWebRTCICECandidate called for socket:', socketId);
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      console.log('✅ Socket found, emitting webrtc-ice-candidate to mobile');
      socket.emit('webrtc-ice-candidate', { candidate });
      console.log('✅ webrtc-ice-candidate emitted');
    } else {
      console.error('❌ Socket not found for ID:', socketId);
    }
  }

  async handlePairingResponse(deviceId, approved) {
    const pairing = this.pendingPairings.get(deviceId);
    if (!pairing) {
      return { success: false, message: 'Pairing bulunamadı' };
    }
    
    if (approved) {
      // Güvenilir cihazlara ekle
      const trustedDevice = {
        id: deviceId,
        name: pairing.deviceName,
        type: pairing.deviceType,
        addedAt: Date.now(),
        autoConnect: true
      };
      
      this.trustedDevices.push(trustedDevice);
      await this.saveTrustedDevices();
      
      // Socket'e onay gönder
      if (pairing.socket && pairing.socket.connected) {
        pairing.socket.emit('pair-response', { 
          success: true, 
          message: 'Pairing onaylandı' 
        });
        
        // Bağlı cihazlara ekle
        this.connectedClients.set(pairing.socket.id, {
          deviceId,
          deviceName: pairing.deviceName,
          socket: pairing.socket
        });
        
        // Sayfaları gönder (Socket.IO ile)
        console.log('📤 Sayfalar gönderiliyor:', this.pages.length, 'adet');
        pairing.socket.emit('pages-update', this.pages);
      }
      
      this.pendingPairings.delete(deviceId);
      return { success: true };
    } else {
      // Reddedildi
      if (pairing.socket && pairing.socket.connected) {
        pairing.socket.emit('pair-response', { 
          success: false, 
          message: 'Pairing reddedildi' 
        });
      }
      
      this.pendingPairings.delete(deviceId);
      return { success: true };
    }
  }

  executeKeys(keys, targetWindowHandle = null) {
    console.log('🔍 executeKeys çağrıldı, gelen tuşlar:', keys);
    console.log('🔍 Addon durumu:', this.keyboardAddon ? 'Yüklü ✅' : 'Yüklü değil ❌');
    console.log('🔍 Hedef pencere:', targetWindowHandle || 'Global (aktif pencere)');
    
    if (!this.keyboardAddon) {
      console.warn('⚠️  Klavye addon yüklenmedi, simüle edilecek:', keys);
      return;
    }
    
    try {
      if (targetWindowHandle) {
        // Belirli bir pencereye gönder (focus olmadan)
        console.log('🎯 Belirli pencereye tuşlar gönderiliyor:', keys, '→ HWND:', targetWindowHandle);
        this.keyboardAddon.sendKeysToWindow(targetWindowHandle, keys);
        console.log('✅ Klavye girdisi belirli pencereye gönderildi:', keys);
      } else {
        // Global olarak gönder (aktif pencereye)
        console.log('🌐 Global klavye tuşları gönderiliyor:', keys);
        this.keyboardAddon.sendKeys(keys);
        console.log('✅ Klavye girdisi gönderildi:', keys);
      }
    } catch (error) {
      console.error('❌ Klavye girdisi hatası:', error);
      console.error('❌ Hata detayı:', error.stack);
    }
  }

  findWindowHandle(targetAppExe) {
    if (!this.keyboardAddon || !this.keyboardAddon.getWindowList) {
      console.warn('⚠️  getWindowList fonksiyonu yok');
      return null;
    }
    
    try {
      const windows = this.keyboardAddon.getWindowList();
      console.log('🔍 Toplam pencere sayısı:', windows.length);
      
      // targetAppExe ile eşleşen ilk pencereyi bul (case-insensitive)
      const targetExeLower = targetAppExe.toLowerCase();
      const matchedWindow = windows.find(w => w.exeName.toLowerCase() === targetExeLower);
      
      if (matchedWindow) {
        console.log('✅ Eşleşen pencere bulundu:', matchedWindow.title, '|', matchedWindow.exeName);
        return matchedWindow.hwnd;
      }
      
      console.warn('⚠️ Eşleşen pencere bulunamadı:', targetAppExe);
      return null;
    } catch (error) {
      console.error('❌ findWindowHandle hatası:', error);
      return null;
    }
  }

  getWindowList() {
    if (!this.keyboardAddon || !this.keyboardAddon.getWindowList) {
      return [];
    }
    
    try {
      return this.keyboardAddon.getWindowList();
    } catch (error) {
      console.error('❌ getWindowList hatası:', error);
      return [];
    }
  }

  launchApp(appPath) {
    try {
      console.log('🚀 Uygulama başlatılıyor:', appPath);
      
      // Dosya var mı kontrol et
      const fsSync = require('fs');
      if (!fsSync.existsSync(appPath)) {
        console.error('❌ Uygulama bulunamadı:', appPath);
        return;
      }
      
      // Çalışma dizinini belirle (uygulamanın bulunduğu klasör)
      const workingDir = path.dirname(appPath);
      console.log('📁 Çalışma dizini:', workingDir);
      
      const isWindows = process.platform === 'win32';
      
      if (isWindows) {
        // Windows: "start" komutu ile aç (locale sorunlarını çözer)
        // /B = Yeni pencere açma
        // "" = Pencere başlığı (boş)
        const { exec } = require('child_process');
        const command = `start "" "${appPath}"`;
        
        console.log('📝 Komut:', command);
        
        exec(command, { cwd: workingDir }, (error, stdout, stderr) => {
          if (error) {
            console.error('❌ Uygulama başlatma hatası:', error.message);
            // stderr genelde Türkçe karakter içerebilir, gösterme
            return;
          }
          console.log('✅ Uygulama başlatıldı (Windows start komutu)');
        });
      } else {
        // Linux/Mac: spawn kullan
        const child = spawn(appPath, [], {
          detached: true,
          stdio: 'ignore',
          cwd: workingDir
        });
        
        child.on('error', (err) => {
          console.error('❌ Uygulama başlatma hatası:', err.message);
        });
        
        child.unref();
        console.log('✅ Uygulama başlatıldı (spawn)');
      }
      
    } catch (error) {
      console.error('❌ Uygulama başlatma hatası:', error.message);
    }
  }

  loadKeyboardAddon() {
    if (process.platform !== 'win32') {
      console.log('⚠️  Klavye addon sadece Windows\'ta destekleniyor');
      return;
    }
    
    try {
      const addonPath = './keyboard-addon/build/Release/keyboard';
      console.log('🔍 Addon yükleniyor:', addonPath);
      this.keyboardAddon = require(addonPath);
      console.log('✅ Klavye addon başarıyla yüklendi');
      console.log('✅ sendKeys fonksiyonu:', typeof this.keyboardAddon.sendKeys);
    } catch (error) {
      console.warn('⚠️  Klavye addon yüklenemedi:', error.message);
      console.error('❌ Hata detayı:', error.stack);
      console.log('   npm run rebuild ile yeniden derlemeyi deneyin');
    }
  }

  async ensureDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(path.join(this.dataDir, 'icons'), { recursive: true });
    } catch (error) {
      console.error('Veri klasörü oluşturulamadı:', error);
    }
  }

  async loadConfig() {
    try {
      const data = await fs.readFile(this.configFile, 'utf8');
      const config = JSON.parse(data);
      this.deviceId = config.deviceId;
      this.deviceName = config.deviceName || this.deviceName;
    } catch (error) {
      // İlk çalıştırma - yeni ID oluştur
      this.deviceId = uuidv4();
      await this.saveConfig();
    }
  }

  async saveConfig() {
    const config = {
      deviceId: this.deviceId,
      deviceName: this.deviceName
    };
    await fs.writeFile(this.configFile, JSON.stringify(config, null, 2));
  }

  async loadPages() {
    try {
      // Önce yeni formatta kontrol et
      try {
        const data = await fs.readFile(this.pagesFile, 'utf8');
        this.pages = JSON.parse(data);
        console.log(`✅ ${this.pages.length} sayfa yüklendi`);
        return;
      } catch (e) {
        // pages.json bulunamadı, eski shortcuts.json'dan migrate et
      }
      
      // Eski shortcuts.json'u kontrol et
      const oldShortcutsFile = path.join(this.dataDir, 'shortcuts.json');
      try {
        const oldData = await fs.readFile(oldShortcutsFile, 'utf8');
        const oldShortcuts = JSON.parse(oldData);
        
        // Eski formatı yeni formata çevir
        this.pages = [
          {
            id: 'page-' + Date.now(),
            name: 'Genel',
            shortcuts: oldShortcuts
          }
        ];
        
        console.log(`✅ Eski format tespit edildi, ${oldShortcuts.length} kısayol migrate edildi`);
        await this.savePages(this.pages);
        
        // Eski dosyayı yedekle
        await fs.rename(oldShortcutsFile, oldShortcutsFile + '.backup');
        return;
      } catch (e) {
        // Eski dosya da yok
      }
      
      // Hiçbir dosya yok, varsayılan sayfa oluştur
      this.pages = [
        {
          id: 'page-' + Date.now(),
          name: 'Genel',
          shortcuts: [
            {
              id: 1,
              label: 'Kaydet',
              icon: '💾',
              keys: ['CONTROL', 'S'],
              color: '#00C853',
              actionType: 'keys'
            },
            {
              id: 2,
              label: 'Kopyala',
              icon: '📋',
              keys: ['CONTROL', 'C'],
              color: '#FF9800',
              actionType: 'keys'
            },
            {
              id: 3,
              label: 'Yapıştır',
              icon: '📌',
              keys: ['CONTROL', 'V'],
              color: '#9C27B0',
              actionType: 'keys'
            }
          ]
        }
      ];
      await this.savePages(this.pages);
      console.log('✅ Varsayılan sayfa oluşturuldu');
    } catch (error) {
      console.error('Sayfa yükleme hatası:', error);
      this.pages = [];
    }
  }

  async savePages(pages) {
    this.pages = pages;
    await fs.writeFile(this.pagesFile, JSON.stringify(pages, null, 2));
    
    // Tüm bağlı istemcilere güncellemeyi gönder (eğer server başlatıldıysa)
    if (this.io) {
      this.io.emit('pages-update', pages);
    }
    
    return { success: true };
  }

  // Geriye uyumluluk için shortcuts kaydetme
  async saveShortcuts(shortcuts) {
    // İlk sayfanın shortcuts'larını güncelle
    if (this.pages.length > 0) {
      this.pages[0].shortcuts = shortcuts;
      await this.savePages(this.pages);
    }
    return { success: true };
  }

  async loadTrustedDevices() {
    try {
      const data = await fs.readFile(this.trustedFile, 'utf8');
      this.trustedDevices = JSON.parse(data);
      console.log(`✅ ${this.trustedDevices.length} güvenilir cihaz yüklendi`);
    } catch (error) {
      this.trustedDevices = [];
    }
  }

  async saveTrustedDevices() {
    await fs.writeFile(this.trustedFile, JSON.stringify(this.trustedDevices, null, 2));
  }

  async removeTrustedDevice(deviceId) {
    this.trustedDevices = this.trustedDevices.filter(d => d.id !== deviceId);
    await this.saveTrustedDevices();
    return { success: true };
  }

  getPages() {
    return this.pages;
  }

  getShortcuts() {
    // Geriye uyumluluk için ilk sayfanın shortcuts'larını döndür
    return this.pages.length > 0 ? this.pages[0].shortcuts : [];
  }

  getTrustedDevices() {
    return this.trustedDevices;
  }

  getServerInfo() {
    const totalShortcuts = this.pages.reduce((sum, page) => sum + (page.shortcuts?.length || 0), 0);
    
    // Ekran boyutunu al (RobotJS varsa)
    let screenSize = { width: 1920, height: 1080 }; // Varsayılan
    if (this.robot) {
      try {
        screenSize = this.robot.getScreenSize();
      } catch (error) {
        console.warn('⚠️ Could not get screen size:', error.message);
      }
    }
    
    return {
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      port: this.port,
      connectedClients: this.connectedClients.size,
      shortcuts: totalShortcuts,
      pages: this.pages.length,
      trustedDevices: this.trustedDevices.length,
      screenSize
    };
  }

  getConnectedClients() {
    const clients = [];
    for (const [socketId, client] of this.connectedClients.entries()) {
      clients.push({
        socketId,
        deviceId: client.deviceId,
        deviceName: client.deviceName,
        connected: client.socket?.connected || false
      });
    }
    return clients;
  }

  async copyIconFile(sourcePath) {
    const path = require('path');
    const fs = require('fs').promises;
    
    // Dosya adını al
    const fileName = path.basename(sourcePath);
    const ext = path.extname(fileName);
    
    // Benzersiz isim oluştur (timestamp + orijinal isim)
    const timestamp = Date.now();
    const uniqueFileName = `icon-${timestamp}${ext}`;
    
    // Hedef klasör
    const iconsDir = path.join(this.dataDir, 'icons');
    await fs.mkdir(iconsDir, { recursive: true });
    
    // Dosyayı kopyala
    const targetPath = path.join(iconsDir, uniqueFileName);
    await fs.copyFile(sourcePath, targetPath);
    
    console.log('✅ İkon kopyalandı:', uniqueFileName);
    
    // Sadece dosya adını döndür (URL için)
    return uniqueFileName;
  }

  // Sayfa yönetimi metodları
  async addPage(name, icon, targetApp) {
    const newPage = {
      id: 'page-' + Date.now(),
      name: name || 'Yeni Sayfa',
      icon: icon || undefined,
      targetApp: targetApp || undefined,
      shortcuts: []
    };
    this.pages.push(newPage);
    await this.savePages(this.pages);
    return newPage;
  }

  async updatePageTargetApp(pageId, targetApp) {
    const page = this.pages.find(p => p.id === pageId);
    if (!page) {
      return { success: false, message: 'Sayfa bulunamadı' };
    }
    page.targetApp = targetApp || undefined;
    await this.savePages(this.pages);
    return { success: true, page };
  }

  async updatePageName(pageId, newName) {
    const page = this.pages.find(p => p.id === pageId);
    if (!page) {
      return { success: false, message: 'Sayfa bulunamadı' };
    }
    page.name = newName;
    await this.savePages(this.pages);
    return { success: true, page };
  }

  async deletePage(pageId) {
    // En az bir sayfa kalmalı
    if (this.pages.length <= 1) {
      return { success: false, message: 'Son sayfa silinemez' };
    }
    
    this.pages = this.pages.filter(p => p.id !== pageId);
    await this.savePages(this.pages);
    return { success: true };
  }

  async addShortcutToPage(pageId, shortcut) {
    const page = this.pages.find(p => p.id === pageId);
    if (!page) {
      return { success: false, message: 'Sayfa bulunamadı' };
    }
    
    shortcut.id = shortcut.id || Date.now();
    page.shortcuts.push(shortcut);
    await this.savePages(this.pages);
    return { success: true, shortcut };
  }

  async updateShortcutInPage(pageId, shortcutId, updatedShortcut) {
    const page = this.pages.find(p => p.id === pageId);
    if (!page) {
      return { success: false, message: 'Sayfa bulunamadı' };
    }
    
    const index = page.shortcuts.findIndex(s => s.id === shortcutId);
    if (index === -1) {
      return { success: false, message: 'Kısayol bulunamadı' };
    }
    
    page.shortcuts[index] = { ...updatedShortcut, id: shortcutId };
    await this.savePages(this.pages);
    return { success: true, shortcut: page.shortcuts[index] };
  }

  async deleteShortcutFromPage(pageId, shortcutId) {
    const page = this.pages.find(p => p.id === pageId);
    if (!page) {
      return { success: false, message: 'Sayfa bulunamadı' };
    }
    
    page.shortcuts = page.shortcuts.filter(s => s.id !== shortcutId);
    await this.savePages(this.pages);
    return { success: true };
  }

  async reorderShortcutsInPage(pageId, shortcutIds) {
    const page = this.pages.find(p => p.id === pageId);
    if (!page) {
      return { success: false, message: 'Sayfa bulunamadı' };
    }
    
    // Yeni sıralamaya göre shortcuts'ları yeniden düzenle
    const shortcutsMap = new Map(page.shortcuts.map(s => [s.id, s]));
    const reorderedShortcuts = shortcutIds
      .map(id => shortcutsMap.get(id))
      .filter(s => s !== undefined);
    
    // Kalan shortcuts'ları (eğer varsa) sona ekle
    const remainingIds = new Set(shortcutIds);
    const remainingShortcuts = page.shortcuts.filter(s => !remainingIds.has(s.id));
    
    page.shortcuts = [...reorderedShortcuts, ...remainingShortcuts];
    await this.savePages(this.pages);
    
    // Tüm bağlı istemcilere güncellenmiş sayfaları gönder
    this.io.emit('pages-update', this.pages);
    
    return { success: true, shortcuts: page.shortcuts };
  }
}

// Class'ı export et (singleton yerine instance oluşturulacak)
module.exports = LocalDeskServer;

