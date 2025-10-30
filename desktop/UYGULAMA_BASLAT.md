# 🚀 Uygulama Başlatma Özelliği

Kısayollara artık **uygulama başlatma** yeteneği eklenmiştir! Bir butona basarak istediğiniz .exe dosyasını başlatabilirsiniz.

## ✨ Özellikler

### 3 Farklı Eylem Tipi

1. **⌨️ Klavye Kısayolu**
   - Sadece klavye tuşları gönderir
   - Örnek: Ctrl+S, Alt+Tab, Win+D

2. **🚀 Uygulama Başlat**
   - Sadece uygulama başlatır
   - Örnek: OBS'yi başlat, Chrome'u aç, Spotify'ı çalıştır

3. **🔗 Her İkisi**
   - Önce klavye kısayolunu gönderir
   - Sonra uygulamayı başlatır
   - Örnek: Ctrl+Alt+O tuşlarına basıp OBS'yi başlat

## 📝 Nasıl Kullanılır?

### 1️⃣ Yeni Kısayol Ekle

1. "➕ Yeni Kısayol Ekle" butonuna tıklayın
2. **Eylem Tipi** bölümünden birini seçin:
   - ⌨️ Klavye Kısayolu
   - 🚀 Uygulama Başlat
   - 🔗 Her İkisi

### 2️⃣ Uygulama Seç

- **"📂 Uygulama Seç"** butonuna tıklayın
- Windows dosya seçici açılır
- Başlatmak istediğiniz .exe dosyasını seçin

Desteklenen dosyalar:
- `.exe` dosyaları (Windows uygulamaları)
- Tüm diğer çalıştırılabilir dosyalar

### 3️⃣ Kaydet ve Kullan

- Kısayolu kaydedin
- Mobil cihazınızdan butona basın
- Uygulama otomatik başlatılır! 🎉

## 💡 Kullanım Örnekleri

### OBS Studio Başlat

```json
{
  "label": "OBS Studio",
  "icon": "🎥",
  "actionType": "app",
  "appPath": "C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe",
  "color": "#1F6FEB"
}
```

### Chrome'u Açıp YouTube'a Git (Her İkisi)

```json
{
  "label": "YouTube Aç",
  "icon": "📺",
  "actionType": "both",
  "keys": ["CONTROL", "T"],
  "appPath": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "color": "#FF0000"
}
```

### Spotify Başlat

```json
{
  "label": "Spotify",
  "icon": "🎵",
  "actionType": "app",
  "appPath": "C:\\Users\\YourUser\\AppData\\Roaming\\Spotify\\Spotify.exe",
  "color": "#1DB954"
}
```

### Discord Mute (Sadece Tuş)

```json
{
  "label": "Mikrofon Kapat",
  "icon": "🎤",
  "actionType": "keys",
  "keys": ["CONTROL", "SHIFT", "M"],
  "color": "#5865F2"
}
```

### Premiere Pro Başlat ve Proje Aç

```json
{
  "label": "Premiere Pro",
  "icon": "🎬",
  "actionType": "both",
  "keys": ["CONTROL", "O"],
  "appPath": "C:\\Program Files\\Adobe\\Adobe Premiere Pro\\Adobe Premiere Pro.exe",
  "color": "#9999FF"
}
```

## 🔧 Teknik Detaylar

### Backend (server/index.js)

```javascript
launchApp(appPath) {
    try {
        console.log('🚀 Uygulama başlatılıyor:', appPath);
        
        // Dosya var mı kontrol et
        const fsSync = require('fs');
        if (!fsSync.existsSync(appPath)) {
            console.error('❌ Uygulama bulunamadı:', appPath);
            return;
        }
        
        // Uygulamayı başlat (detached mode)
        const child = spawn(appPath, [], {
            detached: true,
            stdio: 'ignore',
            shell: false
        });
        
        // Process'i serbest bırak
        child.unref();
        
        console.log('✅ Uygulama başlatıldı:', appPath);
    } catch (error) {
        console.error('❌ Uygulama başlatma hatası:', error);
    }
}
```

### Socket.IO Event

Mobil cihazdan gönderilen veri:

```javascript
socket.emit('execute-shortcut', {
    shortcutId: 1,
    actionType: 'app',  // 'keys', 'app', veya 'both'
    appPath: 'C:\\Program Files\\OBS\\obs64.exe',
    keys: ['CONTROL', 'ALT', 'O']  // opsiyonel
});
```

### Detached Mode

- `detached: true` → Uygulama ana process'ten bağımsız çalışır
- `stdio: 'ignore'` → Çıktıları yok say
- `shell: false` → Direkt .exe çalıştır (güvenlik)
- `child.unref()` → Ana process kapansa bile uygulama çalışmaya devam eder

## 🎯 Popüler Uygulama Yolları

### Windows 11

```
C:\Program Files\
├── Google\Chrome\Application\chrome.exe
├── Mozilla Firefox\firefox.exe
├── Microsoft Office\root\Office16\WINWORD.EXE
├── Microsoft Office\root\Office16\EXCEL.EXE
├── obs-studio\bin\64bit\obs64.exe
└── VideoLAN\VLC\vlc.exe

C:\Users\{YourUser}\AppData\
├── Local\Programs\Microsoft VS Code\Code.exe
├── Local\Discord\app-1.0.9xxx\Discord.exe
└── Roaming\Spotify\Spotify.exe
```

### Program Files (x86)

```
C:\Program Files (x86)\
├── Steam\steam.exe
├── Adobe\Adobe Photoshop\Photoshop.exe
└── Notepad++\notepad++.exe
```

## ⚠️ Önemli Notlar

1. **Dosya Yolu**
   - Tam yol gereklidir
   - Windows path separator: `\` (backslash)
   - Örnek: `C:\Program Files\App\app.exe`

2. **İzinler**
   - Yönetici gerektiren uygulamalar için Local Desk'in de yönetici olarak çalışması gerekir

3. **Güvenlik**
   - Sadece güvenilir cihazlar uygulama başlatabilir
   - Pairing sistemi ile korunur

4. **Çoklu Instance**
   - Aynı uygulamayı birden fazla kez başlatabilir
   - Bazı uygulamalar bunu engelleyebilir (örn: Spotify)

5. **Parametreler**
   - Şu an için parametre desteği yok
   - Gelecek sürümde eklenecek

## 🐛 Sorun Giderme

### Uygulama Başlamıyor

1. **Dosya yolunu kontrol edin**
   - Dosya var mı? Tam yol doğru mu?
   - Console'da hata mesajlarına bakın

2. **İzinler**
   - Yönetici izni gerekiyor olabilir
   - Local Desk'i yönetici olarak çalıştırın

3. **Uygulama zaten çalışıyor**
   - Bazı uygulamalar tek instance'a izin verir
   - Önce uygulamayı kapatıp tekrar deneyin

### Console Logları

```javascript
// Başarılı
🚀 Uygulama başlatılıyor: C:\Program Files\OBS\obs64.exe
✅ Uygulama başlatıldı: C:\Program Files\OBS\obs64.exe

// Hata
❌ Uygulama bulunamadı: C:\Program Files\OBS\obs64.exe
❌ Uygulama başlatma hatası: Error: spawn ENOENT
```

## 🎨 UI/UX Özellikleri

### Modal Görünümü

- **Eylem Tipi Seçimi:** Radio button'lar ile kolay seçim
- **Dinamik Alanlar:** Seçime göre form alanları gösterilir/gizlenir
- **Dosya Seçici:** Windows native dialog ile tanıdık deneyim
- **Önizleme:** Seçilen uygulama yolu görünür

### CSS Stilleri

```css
.radio-label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--bg-tertiary);
    border-radius: 6px;
    cursor: pointer;
    border: 2px solid transparent;
}

.radio-label:has(input[type="radio"]:checked) {
    border-color: var(--accent-blue);
    background: var(--bg-hover);
}
```

## 🚧 Gelecek Özellikler

- [ ] Uygulama parametreleri (örn: `chrome.exe --new-tab`)
- [ ] Çalışma dizini (working directory) belirleme
- [ ] Uygulama durumu kontrolü (çalışıyor mu?)
- [ ] Çoklu uygulama başlatma
- [ ] Makro desteği (uygulama başlat → bekle → tuşlara bas)
- [ ] Favori uygulamalar listesi

---

**✨ Artık telefonunuzdan tek tuşla uygulamalarınızı başlatabilirsiniz!**

