# 🎮 Local Desk

**Stream Deck benzeri klavye kısayol kontrolcüsü - Lokal ağ üzerinden mobil kontrol**

Local Desk, mobil cihazınızı (iOS/Android) masaüstü bilgisayarınız için kablosuz bir kısayol kontrolcüsüne dönüştürür. Stream Deck benzeri bir arayüz ile OBS, video düzenleme, oyun streaming ve genel produktivite için klavye kısayollarını kolayca tetikleyebilirsiniz.

## ✨ Özellikler

### 🔍 Otomatik Cihaz Keşfi
- UDP broadcast ile ağdaki cihazları otomatik bulur
- mDNS/Bonjour desteği
- Internet bağlantısı gerektirmez
- Lokal ağda çalışır

### 🔐 Güvenli Bağlantı
- İlk bağlantıda pairing sistemi
- Masaüstünden onay gerektirir
- Güvenilir cihaz listesi
- Otomatik yeniden bağlanma

### ⌨️ Gerçek Klavye Girdisi
- Windows SendInput API kullanır
- C++ Native addon
- Tüm uygulamalarla uyumlu (OBS, Premiere, oyunlar, vs.)
- Fiziksel klavye gibi algılanır

### 🎨 Stream Deck Tarzı UI
- Renkli buton grid'i
- Özelleştirilebilir ikonlar
- Sürükle-bırak düzenleme
- Sayfa/kategori desteği

### 🔄 Canlı Senkronizasyon
- Masaüstünde yapılan değişiklikler anında mobilde görünür
- Socket.IO ile gerçek zamanlı güncelleme
- Çift yönlü iletişim

## 🏗️ Mimari

```
┌─────────────────┐                  ┌─────────────────┐
│                 │                  │                 │
│  📱 Mobile App  │ ←──── WiFi ────→ │  🖥️  Desktop   │
│  React Native   │                  │    Electron     │
│                 │                  │                 │
│  • Discovery    │                  │  • HTTP Server  │
│  • Socket.IO    │                  │  • Socket.IO    │
│  • Button Grid  │                  │  • C++ Addon    │
│                 │                  │  • SendInput    │
└─────────────────┘                  └─────────────────┘
```

## 📦 Proje Yapısı

```
LocalDesk/
├── desktop/                # Electron masaüstü uygulaması
│   ├── main.js            # Electron ana process
│   ├── preload.js         # IPC bridge
│   ├── server/            # Node.js backend
│   │   ├── index.js       # Socket.IO server
│   │   ├── discovery.js   # UDP + mDNS
│   │   └── keyboard-addon/ # C++ SendInput modülü
│   └── ui/                # HTML/CSS/JS arayüz
│
└── LocalDesk/             # React Native mobil uygulama
    ├── App.jsx            # Ana uygulama
    └── src/
        ├── hooks/         # Custom hooks
        ├── components/    # UI bileşenleri
        └── screens/       # Ekranlar
```

## 🚀 Hızlı Başlangıç

### Ön Gereksinimler

**Masaüstü:**
- Node.js 20+
- Windows (klavye addon için)
- Visual Studio Build Tools 2019+

**Mobil:**
- Node.js 20+
- React Native CLI
- iOS: Xcode 14+ (macOS)
- Android: Android Studio + JDK 17

### Kurulum

#### 1️⃣ Masaüstü Uygulaması

```bash
cd desktop

# Bağımlılıkları yükle
npm install

# C++ Addon'u derle
cd server/keyboard-addon
npm install
cd ../..

# Veya direkt
npm run rebuild

# Uygulamayı başlat
npm start
```

#### 2️⃣ Mobil Uygulama

```bash
cd LocalDesk

# Bağımlılıkları yükle
npm install

# iOS için
cd ios && pod install && cd ..
npm run ios

# Android için
npm run android
```

## 📖 Kullanım

### 1. Masaüstü Uygulamasını Başlatın

- Windows'ta Local Desk Desktop'u açın
- Otomatik olarak UDP ve mDNS servisleri başlar
- Sol üst köşede cihaz adınız ve durumu görünür

### 2. Mobil Uygulamayı Açın

- Aynı WiFi ağına bağlı olduğunuzdan emin olun
- Uygulama otomatik olarak masaüstü cihazınızı bulur
- Listeden cihazınızı seçin

### 3. Pairing Yapın

- Mobilde cihazı seçtiğinizde pairing isteği gönderilir
- Masaüstünde çıkan popup'tan "Onayla"ya tıklayın
- Bağlantı kurulur ve kısayollar indirilir

### 4. Kısayolları Kullanın

- Mobil ekranda Stream Deck tarzı buton grid'i görünür
- Herhangi bir butona basarak klavye kısayolunu tetikleyin
- Masaüstünde gerçek klavye tuşları basılmış gibi algılanır

### 5. Kısayol Ekleme

- Masaüstü uygulamasında "➕ Yeni Kısayol Ekle"ye tıklayın
- Etiket, tuşlar ve renk seçin
- Kaydedin - mobilde anında görünür

## 🎯 Kullanım Senaryoları

### 🎥 OBS Studio
```javascript
{
  "label": "Kaydı Başlat/Durdur",
  "keys": ["CONTROL", "ALT", "R"],
  "color": "#f44336"
}
```

### 🎬 Video Düzenleme
```javascript
{
  "label": "Render Et",
  "keys": ["CONTROL", "M"],
  "color": "#9c27b0"
}
```

### 🎮 Oyun Streaming
```javascript
{
  "label": "Discord Mute",
  "keys": ["CONTROL", "SHIFT", "M"],
  "color": "#5865F2"
}
```

### 💼 Genel Produktivite
```javascript
{
  "label": "Screenshot",
  "keys": ["WIN", "SHIFT", "S"],
  "color": "#00C853"
}
```

## 🔧 Yapılandırma

### Masaüstü Portları

- **HTTP/Socket.IO**: 3100
- **UDP Discovery**: 45454
- **mDNS**: Otomatik

### Veri Dosyaları

```
desktop/server/data/
├── config.json        # Cihaz ayarları
├── shortcuts.json     # Kısayol listesi
├── trusted.json       # Güvenilir cihazlar
└── icons/            # Özel ikonlar
```

## 🛠️ Geliştirme

### Debug Modu

**Masaüstü:**
```bash
NODE_ENV=development npm start
# DevTools otomatik açılır
```

**Mobil:**
```bash
npm start -- --reset-cache
# Shake device > Debug
```

### C++ Addon Yeniden Derleme

```bash
cd desktop/server/keyboard-addon
npm run rebuild
```

### Log Seviyeleri

- ✅ Başarılı işlemler
- 📡 Network olayları
- ⌨️ Klavye girdileri
- 🔐 Pairing işlemleri
- ❌ Hatalar
- ⚠️ Uyarılar

## 📡 Protokol Detayları

### UDP Discovery

**Request (Broadcast):**
```
LOCALDESK_DISCOVER_REQUEST
```

**Response:**
```json
{
  "type": "LOCALDESK_DISCOVER_RESPONSE",
  "deviceId": "desktop-uuid-here",
  "deviceName": "Desktop-PC",
  "deviceType": "desktop",
  "port": 3100,
  "timestamp": 1234567890
}
```

### Socket.IO Events

**Pairing:**
```javascript
// Client → Server
emit('pair-request', {
  deviceId: 'mobile-xxx',
  deviceName: 'iPhone 15',
  deviceType: 'ios'
})

// Server → Client
emit('pair-response', {
  success: true,
  message: 'Pairing onaylandı'
})
```

**Kısayol Çalıştırma:**
```javascript
// Client → Server
emit('execute-shortcut', {
  shortcutId: 1,
  keys: ['CONTROL', 'ALT', 'O']
})

// Server → Client
emit('execute-result', {
  success: true,
  shortcutId: 1
})
```

**Senkronizasyon:**
```javascript
// Server → Client
emit('shortcuts-update', [
  { id: 1, label: '...', keys: [...], color: '...' }
])
```

## 🔐 Güvenlik

- ✅ Lokal ağda çalışır (internet gerekmez)
- ✅ İlk bağlantıda manuel onay
- ✅ Güvenilir cihaz sistemi
- ✅ Her komut için yetki kontrolü
- ⚠️ SSL/TLS kullanılmıyor (lokal ağ için gerekli değil)

## 🐛 Sorun Giderme

### Cihaz Bulunamıyor

1. Aynı WiFi ağında olduğunuzdan emin olun
2. Güvenlik duvarı 3100 ve 45454 portlarını açık tutmalı
3. Masaüstü uygulamasının çalıştığını kontrol edin
4. Mobil uygulamayı yeniden başlatın

### Bağlantı Hatası

1. Masaüstünde pairing onayı verdiyseniz
2. Güvenilir cihazlar listesinde olup olmadığınızı kontrol edin
3. Mobilde güvenilir cihazları temizleyip tekrar deneyin
4. Her iki uygulamayı da yeniden başlatın

### Kısayollar Çalışmıyor

1. C++ Addon'un derlendiğinden emin olun: `npm run rebuild`
2. Windows Build Tools yüklü mü kontrol edin
3. Masaüstü loglarını kontrol edin
4. Hedef uygulamanın odakta olduğundan emin olun

### Performans Sorunları

1. Aynı ağda başka yoğun trafik var mı kontrol edin
2. WiFi sinyal gücünü kontrol edin
3. Mobil uygulamayı arka planda bırakmayın
4. Masaüstünde başka ağır işlem çalışıyor mu kontrol edin

## 🎨 Özelleştirme

### Özel İkonlar

İkonları `desktop/server/data/icons/` klasörüne ekleyin:

```json
{
  "label": "OBS",
  "icon": "obs.png",
  "keys": ["CONTROL", "ALT", "O"],
  "color": "#1F6FEB"
}
```

### Tema Renkleri

Masaüstü UI için `desktop/ui/style.css`:

```css
:root {
  --bg-primary: #1e1e1e;
  --accent-blue: #1F6FEB;
  /* ... */
}
```

Mobil UI için `LocalDesk/src/components/ButtonGrid.jsx`:

```javascript
const styles = StyleSheet.create({
  button: {
    backgroundColor: '#252526',
    // ...
  }
});
```

## 🚧 Gelecek Özellikler

- [ ] Makro kayıt sistemi
- [ ] Çoklu sayfa/kategori desteği
- [ ] Özel ikon yükleme arayüzü
- [ ] Haptic feedback
- [ ] Widget desteği (iOS/Android)
- [ ] Tema desteği (açık/koyu)
- [ ] macOS/Linux desteği
- [ ] Web arayüzü

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'feat: Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

MIT License - Detaylar için `LICENSE` dosyasına bakın

## 👨‍💻 Geliştirici

**Harun**

## 🙏 Teşekkürler

- [Electron](https://www.electronjs.org/)
- [React Native](https://reactnative.dev/)
- [Socket.IO](https://socket.io/)
- [LocalSend](https://localsend.org/) - Discovery mantığı için ilham

---

**⭐ Projeyi beğendiyseniz yıldız vermeyi unutmayın!**

