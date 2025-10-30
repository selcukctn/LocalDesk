# 🖥️ Simulatör ile LocalDesk Kullanımı

## ⚠️ Önemli Bilgi

iOS Simulatör ve Android Emulator, **gerçek ağ üzerinden broadcast alamaz**. Bu yüzden özel bir çözüm ekledik:

### Nasıl Çalışır?

1. **Desktop** uygulaması bilgisayarınızda `localhost:3100` adresinde çalışır
2. **Mobil** uygulama:
   - Normal ağ keşfi yapar (UDP broadcast)
   - Aynı zamanda **localhost'u da kontrol eder** (simulatör için)
   - iOS: `localhost:3100` 
   - Android Emulator: `10.0.2.2:3100`

## 📋 Adım Adım Kurulum

### 1️⃣ Desktop Uygulamasını Başlat

```bash
cd desktop
npm start
```

**Beklenen çıktı:**
```
🚀 Local Desk Server başlatılıyor...
✅ HTTP/Socket.IO server çalışıyor: 3100
📡 Erişim adresleri:
   - localhost:3100 (Bu bilgisayar)
   - 192.168.1.100:3100 (Ağdan erişim)
🔌 UDP socket bağlanıyor: 0.0.0.0:45454
✅ UDP socket dinliyor: 0.0.0.0:45454
📡 Yerel IP adresleri: 192.168.1.100
✅ UDP broadcast etkinleştirildi
✅ mDNS servisi yayınlanıyor
✅ Discovery servisleri aktif
✅ Local Desk server başlatıldı
```

### 2️⃣ Mobil Uygulamayı Başlat

**iOS Simulatör:**
```bash
cd LocalDesk
npm run ios
```

**Android Emulator:**
```bash
cd LocalDesk
npm run android
```

### 3️⃣ Bağlantıyı Kontrol Et

Mobil uygulamada **Discovery ekranında** şunları göreceksiniz:

```
🖥️ [Bilgisayar Adı] (Simulatör)
   localhost:3100  (veya 10.0.2.2:3100)
   desktop • localhost
```

### 4️⃣ Cihaza Tıkla

- Cihaz kartına dokunun
- Desktop'ta onay popup'ı çıkacak
- "Onayla" deyin
- Bağlantı kurulacak ve kısayollar yüklenecek

## 🐛 Sorun Giderme

### "Cihaz Bulunamadı" Hatası

**Desktop konsolu kontrol edin:**

1. Server başladı mı?
   ```
   ✅ HTTP/Socket.IO server çalışıyor: 3100
   ```

2. Discovery servisi çalışıyor mu?
   ```
   ✅ Discovery servisleri aktif
   ```

**Mobil konsol kontrol edin:**

React Native Metro bundler'da şu logları göreceksiniz:

```
🔍 Discovery başlatılıyor...
🔍 Localhost kontrol ediliyor (Simulatör modu)...
✅ Localhost Desktop bulundu: [Bilgisayar Adı]
✅ Yeni cihaz bulundu: [Bilgisayar Adı] (Simulatör)
```

### Hala Bulunamıyorsa

1. **Desktop'u yeniden başlatın**
2. **Port 3100 kullanımda mı kontrol edin:**
   ```bash
   # Windows
   netstat -ano | findstr :3100
   
   # Mac/Linux
   lsof -i :3100
   ```

3. **Güvenlik duvarı kontrolü (Windows):**
   - Windows Defender Güvenlik Duvarı
   - "Uygulama veya özellik izni ver"
   - `Electron` veya `node.exe` için izin verin

### React Native Metro Bundler Kapalıysa

```bash
cd LocalDesk
npm start
```

## 📱 Gerçek Cihazla Test

Gerçek telefon/tablet ile test etmek için:

1. **Aynı Wi-Fi ağına bağlanın**
2. Desktop konsolundaki IP adresini not alın:
   ```
   192.168.1.100:3100
   ```
3. Mobil uygulamada bu cihazı otomatik göreceksiniz (UDP broadcast ile)

## 🎯 Beklenen Sonuç

### ✅ Başarılı Senaryo

**Desktop Konsolu:**
```
📨 UDP mesaj alındı: LOCALDESK_DISCOVER_REQUEST from 192.168.1.50
📡 Discovery isteği alındı: 192.168.1.50
📤 Discovery yanıtı gönderiliyor: {"type":"LOCALDESK_DISCOVER_RESPONSE"...}
✅ Discovery yanıtı gönderildi: 192.168.1.50
```

**Mobil Konsol:**
```
📡 Discovery request gönderiliyor...
✅ Discovery request gönderildi
📨 UDP mesaj alındı: {"type":"LOCALDESK_DISCOVER_RESPONSE"...}
✅ Desktop bulundu: DESKTOP-ABC123 192.168.1.100
✅ Yeni cihaz bulundu: DESKTOP-ABC123
```

**Simulatörde (localhost fallback):**
```
🔍 Localhost kontrol ediliyor (Simulatör modu)...
✅ Localhost Desktop bulundu: DESKTOP-ABC123
✅ Yeni cihaz bulundu: DESKTOP-ABC123 (Simulatör)
```

## 💡 İpuçları

1. **Simulatör localhost kullanır**, gerçek cihaz Wi-Fi kullanır
2. Her 5 saniyede otomatik tarama yapar
3. 30 saniye görünmeyen cihazlar listeden silinir
4. Desktop yeniden başlatılırsa mobil otomatik yeniden bulur

## 📖 Ek Bilgi

- **UDP Port:** 45454
- **HTTP/Socket.IO Port:** 3100
- **mDNS Service:** `localdesk._tcp.local`
- **Discovery Interval:** 5 saniye

## 🔗 İlgili Dokümanlar

- [KURULUM.md](./KURULUM.md) - Genel kurulum
- [GERCEK_CIHAZ_KULLANIMI.md](./GERCEK_CIHAZ_KULLANIMI.md) - Fiziksel cihaz kullanımı
- [desktop/README.md](./desktop/README.md) - Desktop API dokümantasyonu

