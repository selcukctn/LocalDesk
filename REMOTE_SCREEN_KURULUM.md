# 🖥️ Remote Screen (Uzak Ekran) Özelliği Kurulum Rehberi

## Özellikler

LocalDesk'e yeni eklenen **Remote Screen** özelliği ile:

- ✅ **Gerçek Zamanlı Ekran Görüntüleme**: PC ekranınızı telefonunuzdan canlı olarak görün
- ✅ **Dokunmatik Kontrol**: Telefon dokunmatik ekranı ile PC'nizi kontrol edin
- ✅ **Mouse Kontrolü**: Dokunma ile mouse hareketi ve tıklama
- ✅ **Klavye Girişi**: Telefon klavyesi ile PC'ye yazı yazın
- ✅ **Düşük Gecikme**: LAN üzerinden WebRTC ile minimum gecikme
- ✅ **Güvenli Bağlantı**: Mevcut pairing sistemi ile güvenli bağlantı

## Gereksinimler

### Desktop (Electron)
- Node.js 20+
- Windows (RobotJS için)
- Electron 28.0.0+

### Mobile (React Native)
- React Native 0.82+
- Android/iOS
- react-native-webrtc

## Kurulum Adımları

### 1. Desktop Paketlerini Yükleyin

Desktop klasöründe terminali açın ve şu komutları çalıştırın:

```bash
cd desktop
npm install robotjs@^0.6.0
```

**Not:** 
- RobotJS native bir modüldür ve derlenmesi gerekir. Windows'ta Visual Studio Build Tools gerekli olabilir.
- `wrtc` paketine gerek yoktur çünkü Electron'da zaten WebRTC desteği built-in olarak vardır.

Eğer RobotJS yüklenirken hata alırsanız:

```bash
npm install --global windows-build-tools
npm install robotjs@^0.6.0
```

### 2. RobotJS Yükleme Sorunları

RobotJS bazen sorun çıkarabilir. Alternatif olarak:

**Windows için:**
```bash
npm install --global node-gyp
node-gyp configure
node-gyp build
npm install robotjs
```

**Eğer hala sorun yaşıyorsanız:**
- Node.js versiyonunuzu kontrol edin (20.x önerilir)
- Python 3.x yüklü olmalı
- Visual Studio Build Tools yüklü olmalı

### 3. Electron Rebuild (Önemli!)

Desktop klasöründe:

```bash
npm run rebuild
```

Bu komut native modülleri Electron için yeniden derler.

### 4. Mobile Paketlerini Kontrol Edin

Mobile tarafta `react-native-webrtc` zaten package.json'da mevcut. Eğer yüklenmemişse:

```bash
cd LocalDesk
npm install react-native-webrtc@^111.0.2
```

**Android için:**
```bash
npx react-native link react-native-webrtc
cd android
./gradlew clean
cd ..
npx react-native run-android
```

**iOS için:**
```bash
cd ios
pod install
cd ..
npx react-native run-ios
```

## Kullanım

### Desktop Uygulamasını Başlatın

```bash
cd desktop
npm start
```

### Mobile Uygulamasını Başlatın

```bash
cd LocalDesk
npm start
# Başka bir terminalde:
npm run android  # veya npm run ios
```

### Remote Screen Özelliğini Kullanın

1. **Mobile'dan Desktop'a Bağlanın**
   - Mobile uygulamayı açın
   - Discovery ekranından Desktop'ınızı seçin
   - Pairing'i onaylayın

2. **Remote Screen'i Başlatın**
   - Page List ekranında **"🖥️ Uzak Ekran"** butonuna tıklayın
   - **"Oturumu Başlat"** butonuna basın
   - Ekran görüntüsü gelmeye başlayacak

3. **Kontrol Edin**
   - **Dokunarak** mouse'u hareket ettirin
   - **Hızlıca dokunarak** sol tık yapın
   - **Klavye** butonuna basarak yazı yazın
   - **ESC, TAB, Backspace** gibi özel tuşları kullanın

## Özellik Detayları

### Touch Event'lerinden Mouse Event'lerine Dönüşüm

- Touch başlangıcı → Mouse move
- Touch hareketi → Mouse move
- Hızlı touch (<200ms) → Left click
- Normalize edilmiş koordinatlar (0-1 range)

### Klavye Girişi

- **Normal metin**: TextInput'tan direkt gönderilir
- **Özel tuşlar**: ESC, TAB, Backspace, Enter
- **Enter tuşu**: Metin göndermek için

### WebRTC Konfigürasyonu

- **STUN Servers**: Google STUN servers
- **Video**: 1280x720 - 1920x1080, 15-30 FPS
- **Audio**: Devre dışı (sadece video)

## Sorun Giderme

### RobotJS Yüklenmiyor

**Hata:** `Error: Cannot find module 'robotjs'`

**Çözüm:**
1. Node.js versiyonunu kontrol edin: `node -v` (20.x olmalı)
2. Python yüklü mü: `python --version`
3. Visual Studio Build Tools yüklü mü
4. `npm install --global windows-build-tools` çalıştırın
5. `npm install robotjs` tekrar deneyin

### WebRTC Bağlantısı Kurulmuyor

**Sorun:** Video stream gelmiyor

**Çözüm:**
1. Her iki cihaz da aynı LAN'da mı?
2. Firewall WebSocket bağlantılarını engelliyor mu?
3. Desktop console'da `📹` emoji ile başlayan logları kontrol edin
4. Mobile'da `Remote Screen error` var mı?

### Mouse Koordinatları Yanlış

**Sorun:** Mouse tıklamalar yanlış yere gidiyor

**Çözüm:**
- Video aspect ratio'su korunuyor mu kontrol edin
- `RTCView`'ın `objectFit="contain"` olduğundan emin olun
- Ekran çözünürlüğünüz çok yüksekse düşürmeyi deneyin

### Klavye Çalışmıyor

**Sorun:** Klavye girişleri PC'ye gitmiyor

**Çözüm:**
- RobotJS düzgün yüklendi mi?
- Server loglarında `⌨️` emoji ile başlayan mesajlar var mı?
- Text vs Keys gönderimi kontrol edin

## Performans İpuçları

### Gecikmeyi Azaltma

1. **Düşük FPS**: constraints'de maxFrameRate: 20 yapın
2. **Düşük Çözünürlük**: maxWidth: 1280, maxHeight: 720
3. **LAN Bağlantısı**: 5GHz WiFi kullanın
4. **Ağ Trafiği**: Diğer yoğun uygulamaları kapatın

### Pil Tüketimi

- Remote Screen özelliği aktifken pil tüketimi normalden yüksek olacaktır
- Kullanmadığınızda **"Oturumu Bitir"** butonuna basın

## Güvenlik

- ✅ Tüm bağlantılar **lokal ağ** üzerinden
- ✅ **Pairing sistemi** ile yetkisiz erişim engellenir
- ✅ **TrustedDevices** listesi ile kontrol
- ⚠️ Remote Screen aktifken tüm ekranınız mobil cihazdan görünür
- ⚠️ Tüm mouse/klavye aksiyonları çalışır

## Teknik Detaylar

### Desktop (Electron)

- **main.js**: WebRTC signaling, screen capture, remote control handlers
- **server/index.js**: Socket.IO events, RobotJS mouse/keyboard control
- **ui/webrtc.js**: RTCPeerConnection yönetimi, media stream handling
- **preload.js**: IPC bridge for renderer

### Mobile (React Native)

- **App.jsx**: Routing ve navigation
- **RemoteScreenScreen.jsx**: UI ve event handling
- **useRemoteScreen.js**: WebRTC hook, peer connection management
- **useConnection.js**: Socket.IO connection management

### Socket.IO Events

#### Mobile → Desktop
- `webrtc-offer`: WebRTC offer
- `webrtc-ice-candidate`: ICE candidate
- `remote-mouse-move`: Mouse hareket
- `remote-mouse-click`: Mouse tıklama
- `remote-mouse-scroll`: Mouse scroll
- `remote-keyboard-input`: Klavye girişi

#### Desktop → Mobile
- `webrtc-answer`: WebRTC answer
- `webrtc-ice-candidate`: ICE candidate

## Geliştirme Notları

### Gelecek Özellikler (İsteğe Bağlı)

- [ ] Multi-monitor desteği
- [ ] Sağ tık ve orta tık desteği
- [ ] Drag & drop işlemleri
- [ ] Clipboard paylaşımı
- [ ] File transfer
- [ ] Audio streaming (isteğe bağlı)
- [ ] Gesture desteği (pinch zoom, vs)

### Bilinen Sınırlamalar

- ❌ RobotJS sadece Windows'ta test edildi
- ❌ Multi-touch gesture desteği yok
- ❌ Scroll hassasiyeti düşük
- ❌ Yüksek çözünürlükte gecikme artabilir

## Lisans

MIT License - Harun Selçuk Çetin

## Destek

Sorunlarınız için:
- GitHub Issues açın
- README.md dosyasını okuyun
- Desktop console loglarını kontrol edin

---

**Not:** Bu özellik şuanki kısayol sistemini etkilemez. Her iki özellik birbirinden bağımsız çalışır.

