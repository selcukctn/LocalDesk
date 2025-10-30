# Local Desk Mobile

Local Desk mobil uygulaması - Stream Deck benzeri klavye kısayol kontrolü

## 🚀 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# iOS için (macOS gerekli)
cd ios && pod install && cd ..

# Android için gerekli izinler otomatik
```

## 📦 Gereksinimler

- Node.js 20+
- React Native CLI
- iOS: Xcode 14+, macOS
- Android: Android Studio, JDK 17

## ▶️ Çalıştırma

```bash
# Metro bundler'ı başlat
npm start

# iOS'ta çalıştır
npm run ios

# Android'de çalıştır
npm run android
```

## 🏗️ Mimari

```
LocalDesk/
├── App.jsx                    # Ana uygulama
├── src/
│   ├── hooks/
│   │   ├── useDiscovery.js    # UDP + mDNS cihaz keşfi
│   │   └── useConnection.js   # Socket.IO bağlantı yönetimi
│   ├── components/
│   │   └── ButtonGrid.jsx     # Stream Deck tarzı buton grid
│   └── screens/
│       ├── DiscoveryScreen.jsx  # Cihaz bulma ekranı
│       └── ControlScreen.jsx    # Kısayol kontrol ekranı
└── package.json
```

## 🔍 Discovery Sistemi

### UDP Broadcast

Mobil uygulama lokal ağda broadcast yapar ve masaüstü cihazlardan yanıt bekler.

- Port: 45454
- Request: `LOCALDESK_DISCOVER_REQUEST`
- Response: JSON cihaz bilgileri

### mDNS/Bonjour

Zeroconf protokolü ile cihazları otomatik bulur.

- Service Type: `localdesk._tcp.local`
- iOS ve Android destekli

## 🔌 Bağlantı Akışı

1. **Discovery** - Ağdaki cihazları bulur
2. **Device Select** - Kullanıcı cihaz seçer
3. **Pairing** - Socket.IO bağlantısı + pairing isteği
4. **Approval** - Masaüstü onaylar
5. **Connected** - Kısayollar indirilir ve kullanıma hazır

## 📱 Özellikler

### ✅ Cihaz Keşfi
- UDP broadcast ile otomatik keşif
- mDNS/Bonjour desteği
- Canlı cihaz listesi
- Bağlantı durumu göstergesi

### ✅ Güvenli Bağlantı
- İlk bağlantıda pairing
- Masaüstü onayı gerekli
- Güvenilir cihaz kaydı
- Otomatik yeniden bağlanma

### ✅ Stream Deck UI
- 3 sütunlu grid layout
- Renkli buton kenarları
- İkon ve etiket desteği
- Kısayol tuşlarını gösterir

### ✅ Gerçek Zamanlı Senkronizasyon
- Masaüstünde yapılan değişiklikler anında yansır
- Socket.IO ile canlı güncelleme
- Kısayol ekleme/silme/düzenleme

## 🎨 UI Komponetleri

### DiscoveryScreen
- Ağdaki masaüstü cihazları listeler
- Canlı tarama göstergesi
- Bağlantı durumu
- Hata mesajları

### ControlScreen
- Bağlı cihaz bilgisi
- Kısayol grid'i
- Bağlantı kontrolü
- Durum göstergeleri

### ButtonGrid
- Stream Deck tarzı butonlar
- 3x3 veya daha fazla
- Renk kodlu kenarlıklar
- İkon ve tuş bilgileri

## 🔐 Güvenlik

### Pairing Sistemi
```javascript
1. Mobil -> pair-request { deviceId, deviceName }
2. Masaüstü -> Kullanıcı onayı
3. Masaüstü -> pair-response { success: true }
4. Mobil -> AsyncStorage'a kaydet
```

### Güvenilir Cihazlar
```javascript
{
  "id": "desktop-uuid",
  "name": "Desktop-PC",
  "host": "192.168.1.100",
  "port": 3100,
  "addedAt": 1234567890
}
```

## 📡 Socket.IO Events

### Client → Server
```javascript
// Pairing
socket.emit('pair-request', {
  deviceId: 'mobile-xxx',
  deviceName: 'iPhone 15',
  deviceType: 'ios'
});

// Kısayol çalıştır
socket.emit('execute-shortcut', {
  shortcutId: 1,
  keys: ['CONTROL', 'ALT', 'O']
});
```

### Server → Client
```javascript
// Pairing yanıtı
socket.on('pair-response', (response) => {
  // { success: true, message: '...' }
});

// Kısayollar güncellendi
socket.on('shortcuts-update', (shortcuts) => {
  // Yeni kısayol listesi
});

// Çalıştırma sonucu
socket.on('execute-result', (result) => {
  // { success: true, shortcutId: 1 }
});
```

## 🔧 Yapılandırma

### Android İzinleri

`android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />
```

### iOS İzinleri

`ios/LocalDesk/Info.plist`:
```xml
<key>NSLocalNetworkUsageDescription</key>
<string>Local Desk lokal ağdaki cihazları bulmak için ağ erişimine ihtiyaç duyar</string>
<key>NSBonjourServices</key>
<array>
  <string>_localdesk._tcp</string>
</array>
```

## 🐛 Debug

### Metro Bundler Logları
```bash
npm start -- --reset-cache
```

### React Native Debugger
```bash
# Chrome DevTools
# Shake device > Debug
```

### Network İnceleme
```javascript
// useConnection.js içinde
console.log('Socket event:', eventName, data);
```

## 📊 Performans

- Cihaz keşfi: ~1-3 saniye
- Bağlantı kurma: ~500ms
- Kısayol çalıştırma: <100ms (network latency)
- UI güncelleme: Gerçek zamanlı

## 🎯 Kullanım Senaryoları

1. **OBS Studio Kontrolü**
   - Kayıt başlat/durdur
   - Sahne değiştir
   - Mikrofon mute

2. **Video Editing**
   - Premiere Pro kısayolları
   - Render başlat
   - Timeline kontrolü

3. **Oyun Streaming**
   - Discord mute/unmute
   - Overlay toggle
   - Macro'lar

4. **Genel Produktivite**
   - Uygulama geçişi
   - Pencere yönetimi
   - Özel makrolar

## 📝 Geliştirme Notları

- JavaScript kullanılıyor (TypeScript değil)
- React Hooks tabanlı
- Functional components
- AsyncStorage için veri kalıcılığı
- SafeAreaView iOS notch desteği

## 🔄 Güncelleme Akışı

```
Masaüstü değişiklik
    ↓
Socket.IO emit('shortcuts-update')
    ↓
Mobil socket.on('shortcuts-update')
    ↓
State güncelleme
    ↓
UI yeniden render
```

## 🚧 İyileştirme Fikirleri

- [ ] Haptic feedback
- [ ] Tema desteği (koyu/açık)
- [ ] Sayfa/kategoriler
- [ ] Özel ikon yükleme
- [ ] Makro kayıt
- [ ] Çoklu cihaz desteği
- [ ] Widget desteği

## 📄 Lisans

MIT
