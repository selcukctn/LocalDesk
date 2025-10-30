const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const EventEmitter = require('events');

const discovery = require('./discovery');

class LocalDeskServer extends EventEmitter {
  constructor() {
    super();
    this.app = express();
    this.server = null;
    this.io = null;
    this.port = 3100;
    this.deviceId = null;
    this.deviceName = os.hostname();
    this.shortcuts = [];
    this.trustedDevices = [];
    this.connectedClients = new Map();
    this.pendingPairings = new Map();
    this.keyboardAddon = null;
    
    // Veri dosyaları
    this.dataDir = path.join(__dirname, 'data');
    this.shortcutsFile = path.join(this.dataDir, 'shortcuts.json');
    this.trustedFile = path.join(this.dataDir, 'trusted.json');
    this.configFile = path.join(this.dataDir, 'config.json');
  }

  async start() {
    console.log('🚀 Local Desk Server başlatılıyor...');
    
    // Veri klasörünü oluştur
    await this.ensureDataDir();
    
    // Konfigürasyonu yükle
    await this.loadConfig();
    await this.loadShortcuts();
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
    
    console.log(`✅ HTTP/Socket.IO server çalışıyor: ${this.port}`);
    
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
      res.json({
        id: this.deviceId,
        name: this.deviceName,
        type: 'desktop',
        version: '1.0.0',
        platform: process.platform
      });
    });
    
    // Kısayol listesi
    this.app.get('/shortcuts', (req, res) => {
      res.json(this.shortcuts);
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
        
        // Zaten güvenilir mi?
        const trusted = this.trustedDevices.find(d => d.id === deviceId);
        if (trusted) {
          socket.emit('pair-response', { 
            success: true, 
            message: 'Zaten güvenilir cihaz',
            autoConnected: true 
          });
          this.connectedClients.set(socket.id, { deviceId, deviceName, socket });
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
        console.log('⌨️  Kısayol çalıştırılıyor:', data);
        const { shortcutId, keys } = data;
        
        // Cihaz güvenilir mi kontrol et
        const client = this.connectedClients.get(socket.id);
        if (!client) {
          socket.emit('error', { message: 'Yetkisiz cihaz' });
          return;
        }
        
        const trusted = this.trustedDevices.find(d => d.id === client.deviceId);
        if (!trusted) {
          socket.emit('error', { message: 'Güvenilir cihaz değil' });
          return;
        }
        
        // Klavye girdisini gönder
        this.executeKeys(keys);
        socket.emit('execute-result', { success: true, shortcutId });
      });
      
      socket.on('disconnect', () => {
        console.log('📴 Bağlantı kesildi:', socket.id);
        this.connectedClients.delete(socket.id);
      });
    });
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
        
        // Kısayolları gönder
        pairing.socket.emit('shortcuts-update', this.shortcuts);
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

  executeKeys(keys) {
    if (!this.keyboardAddon) {
      console.warn('⚠️  Klavye addon yüklenmedi, simüle edilecek:', keys);
      return;
    }
    
    try {
      // C++ addon ile gerçek klavye girdisi
      this.keyboardAddon.sendKeys(keys);
      console.log('✅ Klavye girdisi gönderildi:', keys);
    } catch (error) {
      console.error('❌ Klavye girdisi hatası:', error);
    }
  }

  loadKeyboardAddon() {
    if (process.platform !== 'win32') {
      console.log('⚠️  Klavye addon sadece Windows\'ta destekleniyor');
      return;
    }
    
    try {
      this.keyboardAddon = require('./keyboard-addon/build/Release/keyboard');
      console.log('✅ Klavye addon yüklendi');
    } catch (error) {
      console.warn('⚠️  Klavye addon yüklenemedi:', error.message);
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

  async loadShortcuts() {
    try {
      const data = await fs.readFile(this.shortcutsFile, 'utf8');
      this.shortcuts = JSON.parse(data);
      console.log(`✅ ${this.shortcuts.length} kısayol yüklendi`);
    } catch (error) {
      // Varsayılan kısayollar
      this.shortcuts = [
        {
          id: 1,
          label: 'OBS Başlat/Durdur',
          icon: 'obs.png',
          keys: ['CONTROL', 'ALT', 'O'],
          color: '#1F6FEB'
        },
        {
          id: 2,
          label: 'Kaydet',
          icon: 'save.png',
          keys: ['CONTROL', 'S'],
          color: '#00C853'
        },
        {
          id: 3,
          label: 'Kopyala',
          icon: 'copy.png',
          keys: ['CONTROL', 'C'],
          color: '#FF9800'
        }
      ];
      await this.saveShortcuts(this.shortcuts);
    }
  }

  async saveShortcuts(shortcuts) {
    this.shortcuts = shortcuts;
    await fs.writeFile(this.shortcutsFile, JSON.stringify(shortcuts, null, 2));
    
    // Tüm bağlı istemcilere güncellemeyi gönder
    this.io.emit('shortcuts-update', shortcuts);
    
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

  getShortcuts() {
    return this.shortcuts;
  }

  getTrustedDevices() {
    return this.trustedDevices;
  }

  getServerInfo() {
    return {
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      port: this.port,
      connectedClients: this.connectedClients.size,
      shortcuts: this.shortcuts.length,
      trustedDevices: this.trustedDevices.length
    };
  }
}

// Singleton instance
const server = new LocalDeskServer();
module.exports = server;

