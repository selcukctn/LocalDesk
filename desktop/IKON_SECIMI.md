# 🎨 İkon Seçimi Özelliği

Kısayol eklerken veya düzenlerken ikon seçimi için 3 farklı yöntem:

## 1️⃣ Dosya Seçimi (📁 Dosya Seç butonu)

- **"📁 Dosya Seç"** butonuna tıklayın
- Windows dosya seçici açılır
- Desteklenen formatlar:
  - PNG (.png)
  - JPEG (.jpg, .jpeg)
  - SVG (.svg)
  - GIF (.gif)
  - ICO (.ico)
- Seçilen dosya otomatik olarak `server/data/icons/` klasörüne kopyalanır
- Benzersiz isim verilir: `icon-1730300000000.png`

## 2️⃣ Emoji Kullanımı (😊 Emoji Kullan butonu)

- **"😊 Emoji Kullan"** butonuna tıklayın
- Popup'ta istediğiniz emoji'yi girin
- Örnekler:
  - 🎮 (Oyun)
  - 🎬 (Video)
  - 📱 (Mobil)
  - 🎨 (Tasarım)
  - ⚙️ (Ayarlar)
  - 🔊 (Ses)

## 3️⃣ Manuel Giriş

- İkon input alanına direkt yazabilirsiniz:
  - Emoji: `🚀`
  - Dosya adı: `obs.png`
  - Mevcut ikon dosyası: `icon-1730300000000.png`

## 🔍 Önizleme

- İkon seçilince veya yazılınca **canlı önizleme** görünür
- Emoji ise büyük boyutta gösterilir
- Dosya ise HTTP üzerinden yüklenir ve gösterilir

## 📂 İkon Depolama

```
desktop/
└── server/
    └── data/
        └── icons/
            ├── icon-1730300000000.png
            ├── icon-1730300001234.svg
            └── ... (kullanıcının seçtiği ikonlar)
```

## 🌐 HTTP Servisi

İkonlar HTTP üzerinden servis edilir:
```
http://localhost:3100/icons/icon-1730300000000.png
```

Bu sayede hem masaüstü UI hem de mobil uygulama ikonları görebilir.

## 💡 İpuçları

1. **Emoji kullanımı daha hızlıdır** - Dosya yükleme gerektirmez
2. **Özel ikonlar için dosya seçin** - Marka logoları, özel tasarımlar
3. **Önizlemeyi kontrol edin** - Kaydetmeden önce görünümünü görün
4. **Boş bırakabilirsiniz** - Varsayılan ⌨️ emoji kullanılır

## 🎯 Kullanım Örnekleri

### OBS Studio Kontrolü
```json
{
  "label": "OBS Başlat",
  "icon": "🎥",
  "keys": ["CONTROL", "ALT", "O"]
}
```

### Özel Logo ile
```json
{
  "label": "Premiere Pro",
  "icon": "icon-1730300000000.png",  // Adobe Premiere logosu
  "keys": ["ALT", "SHIFT", "P"]
}
```

### Discord Mute
```json
{
  "label": "Mikrofon Kapat",
  "icon": "🎤",
  "keys": ["CONTROL", "SHIFT", "M"]
}
```

## 🔧 Teknik Detaylar

### Backend (server/index.js)

```javascript
async copyIconFile(sourcePath) {
    const fileName = path.basename(sourcePath);
    const ext = path.extname(fileName);
    const timestamp = Date.now();
    const uniqueFileName = `icon-${timestamp}${ext}`;
    
    const iconsDir = path.join(this.dataDir, 'icons');
    const targetPath = path.join(iconsDir, uniqueFileName);
    
    await fs.copyFile(sourcePath, targetPath);
    return uniqueFileName;
}
```

### Frontend (ui/app.js)

```javascript
async function selectIconFile() {
    const result = await window.electronAPI.selectIcon();
    
    if (!result.canceled) {
        selectedIcon = result.iconPath;
        showIconPreview(result.iconPath);
    }
}
```

### Electron Dialog (main.js)

```javascript
ipcMain.handle('select-icon', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'İkon Seç',
        filters: [
            { name: 'Resim Dosyaları', extensions: ['png', 'jpg', 'jpeg', 'svg', 'gif', 'ico'] }
        ],
        properties: ['openFile']
    });
    
    if (!result.canceled) {
        const iconPath = await server.copyIconFile(result.filePaths[0]);
        return { canceled: false, iconPath };
    }
    
    return { canceled: true };
});
```

## 🎨 UI Stili

```css
.icon-preview {
    margin-top: 12px;
    padding: 12px;
    background: var(--bg-tertiary);
    border-radius: 8px;
    text-align: center;
    min-height: 60px;
}

.icon-preview img {
    max-width: 48px;
    max-height: 48px;
    object-fit: contain;
}

.icon-preview .emoji {
    font-size: 48px;
}
```

---

**✨ Artık kısayollarınız daha görsel ve kullanışlı!**

