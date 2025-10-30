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

class LocalDeskServer extends EventEmitter {
  constructor() {
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
    
    // Veri dosyaları
    this.dataDir = path.join(__dirname, 'data');
    this.pagesFile = path.join(this.dataDir, 'pages.json'); // shortcuts.json -> pages.json
    this.trustedFile = path.join(this.dataDir, 'trusted.json');
    this.configFile = path.join(this.dataDir, 'config.json');
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
      res.json({
        id: this.deviceId,
        name: this.deviceName,
        type: 'desktop',
        version: '1.0.0',
        platform: process.platform
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
        const { shortcutId, keys, appPath, actionType } = data;
        
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
        console.log('📋 Eylem:', actionType, '| Keys:', keys, '| AppPath:', appPath);
        
        // Eylem tipine göre çalıştır
        if (actionType === 'keys' || actionType === 'both') {
          // Klavye girdisini gönder
          if (keys && keys.length > 0) {
            console.log('⌨️ Klavye tuşları gönderiliyor:', keys);
            this.executeKeys(keys);
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

  executeKeys(keys) {
    console.log('🔍 executeKeys çağrıldı, gelen tuşlar:', keys);
    console.log('🔍 Addon durumu:', this.keyboardAddon ? 'Yüklü ✅' : 'Yüklü değil ❌');
    
    if (!this.keyboardAddon) {
      console.warn('⚠️  Klavye addon yüklenmedi, simüle edilecek:', keys);
      return;
    }
    
    try {
      // C++ addon ile gerçek klavye girdisi
      console.log('🚀 C++ addon\'a tuşlar gönderiliyor:', keys);
      this.keyboardAddon.sendKeys(keys);
      console.log('✅ Klavye girdisi gönderildi:', keys);
    } catch (error) {
      console.error('❌ Klavye girdisi hatası:', error);
      console.error('❌ Hata detayı:', error.stack);
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
    return {
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      port: this.port,
      connectedClients: this.connectedClients.size,
      shortcuts: totalShortcuts,
      pages: this.pages.length,
      trustedDevices: this.trustedDevices.length
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
  async addPage(name, icon) {
    const newPage = {
      id: 'page-' + Date.now(),
      name: name || 'Yeni Sayfa',
      icon: icon || undefined,
      shortcuts: []
    };
    this.pages.push(newPage);
    await this.savePages(this.pages);
    return newPage;
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
}

// Singleton instance
const server = new LocalDeskServer();
module.exports = server;

