# 🚀 Hızlı Başlangıç - Local Desk

## 1️⃣ Masaüstü Uygulamasını Başlat

```bash
cd desktop
npm start
```

Göreceğiniz loglar:
```
🚀 Local Desk Server başlatılıyor...
✅ 0 kısayol yüklendi (veya varsayılan kısayollar)
✅ Klavye addon yüklendi
✅ HTTP/Socket.IO server çalışıyor: 3100
🔍 Discovery servisleri başlatılıyor...
✅ UDP socket dinliyor: 0.0.0.0:45454
✅ mDNS servisi yayınlanıyor
✅ Discovery servisleri aktif
✅ Local Desk server başlatıldı
```

## 2️⃣ Telefon Bağlantısı OLMADAN Kısayol Ekle

**Telefon bağlı olmasa bile şimdi kısayol ekleyebilirsiniz!**

### Adım 1: Masaüstü Penceresini Açın

Electron uygulaması otomatik açılacak.

### Adım 2: "⌨️ Kısayollar" Sekmesine Gidin

Zaten açık olmalı (varsayılan).

### Adım 3: "➕ Yeni Kısayol Ekle" Butonuna Tıklayın

Modal pencere açılacak.

### Adım 4: Kısayolu Doldurun

#### Örnek 1: OBS Studio Başlatma

```
Etiket: OBS Studio
Eylem Tipi: 🚀 Uygulama Başlat
📂 Uygulama Seç: C:\Program Files\obs-studio\bin\64bit\obs64.exe
İkon: 🎥 (Emoji Kullan butonundan)
Renk: Mavi (#1F6FEB)
```

#### Örnek 2: Klavye Kısayolu

```
Etiket: Screenshot Al
Eylem Tipi: ⌨️ Klavye Kısayolu
Tuşlar: WIN + SHIFT + S (🎹 Tuşları Kaydet butonuna basıp tuşlara bas)
İkon: 📸
Renk: Turuncu (#FF9800)
```

#### Örnek 3: Her İkisi Birden

```
Etiket: Chrome Yeni Sekme
Eylem Tipi: 🔗 Her İkisi
Tuşlar: CONTROL + T
📂 Uygulama: C:\Program Files\Google\Chrome\Application\chrome.exe
İkon: 🌐
Renk: Yeşil (#00C853)
```

### Adım 5: Kaydet

"Kaydet" butonuna tıklayın. Kısayol grid'de görünecek!

## 3️⃣ Telefon Bağlandığında Otomatik Eşitleme

### Telefon Bağlanınca Ne Olur?

1. **Telefon ağda tarama yapar** → Masaüstünü bulur
2. **Pairing isteği gönderir** → Masaüstünde popup çıkar
3. **"Onayla" tıklayın** → Cihaz güvenilir listeye eklenir
4. **Kısayollar otomatik gönderilir** → Telefonda tüm kısayollarınız görünür! 🎉

### Kod Nasıl Çalışıyor?

**Pairing onaylandığında:**

```javascript
// server/index.js - satır 226
pairing.socket.emit('shortcuts-update', this.shortcuts);
```

**Yeni kısayol eklendiğinde:**

```javascript
// server/index.js - satır 388
if (this.io) {
  this.io.emit('shortcuts-update', shortcuts);
}
```

Tüm bağlı mobil cihazlar anında güncellemeyi alır!

## 4️⃣ Kısayolları Test Etme

### Masaüstünden Test

Şu an için masaüstü UI'dan direkt test özelliği yok ama:

1. Grid'de kısayolları görebilirsiniz
2. Düzenle/Sil yapabilirsiniz
3. Renk ve ikonlarını görebilirsiniz

### Telefondan Test

1. Telefon uygulamasını açın
2. Masaüstünüzü bulun ve bağlanın
3. Kısayollar grid'de görünecek
4. Bir butona tıklayın → Masaüstünde çalışır!

## 5️⃣ Veri Dosyaları

Tüm kısayollarınız burada saklanır:

```
desktop/server/data/
├── shortcuts.json       ← Kısayollarınız
├── trusted.json         ← Güvenilir cihazlar
├── config.json          ← Sunucu ayarları
└── icons/               ← Özel ikonlar
    ├── icon-1730300000000.png
    └── ...
```

### shortcuts.json Örneği

```json
[
  {
    "id": 1730300000001,
    "label": "OBS Studio",
    "icon": "🎥",
    "color": "#1F6FEB",
    "actionType": "app",
    "appPath": "C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe"
  },
  {
    "id": 1730300000002,
    "label": "Screenshot",
    "icon": "📸",
    "keys": ["WIN", "SHIFT", "S"],
    "color": "#FF9800",
    "actionType": "keys"
  },
  {
    "id": 1730300000003,
    "label": "Chrome Yeni Sekme",
    "icon": "🌐",
    "keys": ["CONTROL", "T"],
    "color": "#00C853",
    "actionType": "both",
    "appPath": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  }
]
```

## 6️⃣ Popüler Kısayol Örnekleri

### 🎮 Gaming/Streaming

```javascript
// OBS Kayıt Başlat/Durdur
{
  "label": "OBS Kayıt",
  "icon": "🔴",
  "keys": ["CONTROL", "ALT", "R"],
  "actionType": "keys"
}

// Discord Mute
{
  "label": "Mikrofon Kapat",
  "icon": "🎤",
  "keys": ["CONTROL", "SHIFT", "M"],
  "actionType": "keys"
}

// Spotify Başlat
{
  "label": "Spotify",
  "icon": "🎵",
  "appPath": "C:\\Users\\YourUser\\AppData\\Roaming\\Spotify\\Spotify.exe",
  "actionType": "app"
}
```

### 💼 Productivity

```javascript
// VS Code Aç
{
  "label": "VS Code",
  "icon": "💻",
  "appPath": "C:\\Users\\YourUser\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
  "actionType": "app"
}

// Tüm Pencereleri Küçült
{
  "label": "Masaüstü Göster",
  "icon": "🖥️",
  "keys": ["WIN", "D"],
  "actionType": "keys"
}

// Kaydet
{
  "label": "Kaydet",
  "icon": "💾",
  "keys": ["CONTROL", "S"],
  "actionType": "keys"
}
```

### 🎬 Video Editing

```javascript
// Premiere Pro
{
  "label": "Premiere Pro",
  "icon": "🎬",
  "appPath": "C:\\Program Files\\Adobe\\Adobe Premiere Pro\\Adobe Premiere Pro.exe",
  "actionType": "app"
}

// Render Et
{
  "label": "Render",
  "icon": "⚙️",
  "keys": ["CONTROL", "M"],
  "actionType": "keys"
}
```

## 7️⃣ Sorun Giderme

### mDNS Hatası Görüyorum

```
mDNS başlatma hatası: TypeError: Bonjour is not a constructor
```

**Çözüm:** Zaten düzeltildi! Kod güncel, sadece yeniden başlatın:
```bash
# Ctrl+C ile durdurun
npm start
```

### Kısayollar Kayboldu

Endişelenmeyin! `desktop/server/data/shortcuts.json` dosyasında saklanıyor.

**Kontrol edin:**
```bash
cat desktop/server/data/shortcuts.json
```

**Yedekleyin:**
```bash
cp desktop/server/data/shortcuts.json shortcuts-backup.json
```

### Klavye Addon Hatası

```
⚠️  Klavye addon yüklenemedi
```

**Çözüm:**
```bash
cd desktop/server/keyboard-addon
npm install
cd ../../..
npm start
```

### Telefon Bulamıyor

1. **Aynı WiFi ağında mısınız?**
   - Masaüstü ve telefon aynı router'a bağlı olmalı

2. **Güvenlik duvarı açık mı?**
   - Windows Defender → Port 3100 ve 45454'ü açın

3. **UDP çalışıyor mu?**
   - Console'da "UDP socket dinliyor" mesajını görmelisiniz

## 8️⃣ İleri Seviye

### Manuel JSON Düzenleme

`shortcuts.json` dosyasını direkt düzenleyebilirsiniz:

```bash
notepad desktop/server/data/shortcuts.json
```

Kaydedin ve uygulamayı yeniden başlatın.

### Bulk Import

Çok sayıda kısayol eklemek için JSON array'ini direkt yapıştırın.

### Backup & Restore

```bash
# Backup
cp -r desktop/server/data desktop-backup

# Restore
cp -r desktop-backup desktop/server/data
```

## 9️⃣ Sonraki Adımlar

1. ✅ Masaüstünden 5-10 kısayol ekleyin
2. ✅ Telefonunuzu bağlayın
3. ✅ Pairing yapın
4. ✅ Kısayolları test edin
5. ✅ Favori uygulamalarınızı ekleyin!

---

## 💡 Önemli Hatırlatmalar

- 📱 **Telefon bağlı olmasa bile** kısayol ekleyebilirsiniz
- 🔄 **Otomatik senkronizasyon** - Telefon bağlanınca tüm kısayollar gelir
- 💾 **Veriler kalıcı** - `data/` klasöründe saklanır
- 🔐 **Güvenli** - Sadece onaylanan cihazlar bağlanabilir
- ⚡ **Gerçek zamanlı** - Masaüstünde değişiklik → Telefonda anında görünür

**🎉 Keyifli kullanımlar!**

