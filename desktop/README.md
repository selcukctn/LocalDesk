# Local Desk Desktop

Local Desk masaüstü uygulaması - Stream Deck benzeri klavye kısayol yönetimi

## 🚀 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# C++ Addon'u derle (Windows gerekli)
cd server/keyboard-addon
npm install
cd ../..

# Veya direkt olarak
npm run rebuild
```

## 📦 Gereksinimler

- Node.js 20+
- Windows (klavye addon için)
- Build tools:
  - Windows: `npm install --global windows-build-tools`
  - Veya Visual Studio Build Tools 2019+

## ▶️ Çalıştırma

```bash
# Geliştirme modu
npm start

# Veya production build
npm run build
```

## 🏗️ Mimari

```
desktop/
├── main.js              # Electron ana process
├── preload.js           # IPC bridge
├── server/
│   ├── index.js         # Socket.IO server & logic
│   ├── discovery.js     # UDP + mDNS discovery
│   ├── keyboard-addon/  # C++ SendInput modülü
│   └── data/            # JSON veritabanı
│       ├── shortcuts.json
│       ├── trusted.json
│       └── config.json
└── ui/
    ├── index.html       # Ana UI
    ├── style.css        # Stiller
    └── app.js           # Frontend logic
```

## 🔌 API Endpoints

### HTTP REST API

- `GET /device-info` - Cihaz bilgileri
- `GET /shortcuts` - Kısayol listesi
- `GET /icons/:filename` - İkon servisi
- `GET /health` - Health check

### Socket.IO Events

**Client → Server:**
- `pair-request` - Pairing isteği
- `execute-shortcut` - Kısayol çalıştır

**Server → Client:**
- `pair-response` - Pairing yanıtı
- `shortcuts-update` - Kısayollar güncellendi
- `execute-result` - Çalıştırma sonucu

## 🔍 Discovery Protokolü

### UDP Broadcast (Port 45454)

Request:
```
LOCALDESK_DISCOVER_REQUEST
```

Response:
```json
{
  "type": "LOCALDESK_DISCOVER_RESPONSE",
  "deviceId": "uuid",
  "deviceName": "Desktop-PC",
  "deviceType": "desktop",
  "port": 3100,
  "timestamp": 1234567890
}
```

### mDNS/Bonjour

Service Type: `localdesk._tcp.local`

TXT Records:
- `deviceId`: Unique device identifier
- `deviceType`: "desktop"
- `version`: "1.0.0"

## ⌨️ Keyboard Addon

C++ Native addon kullanarak Windows SendInput API ile gerçek klavye girdisi gönderir.

Desteklenen tuşlar:
- Harf tuşları: A-Z
- Sayı tuşları: 0-9
- Fonksiyon tuşları: F1-F12
- Modifier tuşları: CTRL, ALT, SHIFT
- Özel tuşlar: ENTER, ESCAPE, TAB, SPACE, vs.

Kullanım:
```javascript
const keyboard = require('./keyboard-addon/build/Release/keyboard');
keyboard.sendKeys(['CONTROL', 'ALT', 'O']);
```

## 🔐 Güvenlik

- İlk bağlantıda pairing gereklidir
- Onaylanan cihazlar `trusted.json` içinde saklanır
- Sadece güvenilir cihazlar komut gönderebilir
- Auto-connect özelliği ile otomatik bağlanma

## 📝 Kısayol Formatı

```json
{
  "id": 1,
  "label": "OBS Başlat",
  "icon": "obs.png",
  "keys": ["CONTROL", "ALT", "O"],
  "color": "#1F6FEB"
}
```

## 🎨 UI Özellikleri

- Koyu tema
- Kısayol yönetimi (ekle, düzenle, sil)
- Güvenilir cihaz yönetimi
- Canlı bağlantı durumu
- Pairing onay sistemi

## 🐛 Debug

Geliştirme modunda DevTools otomatik açılır:
```bash
NODE_ENV=development npm start
```

Log seviyeleri:
- ✅ Başarılı işlemler
- 📡 Network olayları
- ⌨️ Klavye girdileri
- ❌ Hatalar
- ⚠️ Uyarılar

## 📄 Lisans

MIT

