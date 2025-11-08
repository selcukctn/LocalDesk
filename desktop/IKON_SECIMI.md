# 🎨 Icon Selection Feature

When adding or editing shortcuts, there are 3 different methods for icon selection:

## 1️⃣ File Selection (📁 Select File button)

- Click the **"📁 Select File"** button
- Windows file picker will open
- Supported formats:
  - PNG (.png)
  - JPEG (.jpg, .jpeg)
  - SVG (.svg)
  - GIF (.gif)
  - ICO (.ico)
- Selected file is automatically copied to `server/data/icons/` folder
- Unique name is assigned: `icon-1730300000000.png`

## 2️⃣ Emoji Usage (😊 Use Emoji button)

- Click the **"😊 Use Emoji"** button
- Enter your desired emoji in the popup
- Examples:
  - 🎮 (Gaming)
  - 🎬 (Video)
  - 📱 (Mobile)
  - 🎨 (Design)
  - ⚙️ (Settings)
  - 🔊 (Sound)

## 3️⃣ Manual Entry

- You can directly type in the icon input field:
  - Emoji: `🚀`
  - File name: `obs.png`
  - Existing icon file: `icon-1730300000000.png`

## 🔍 Preview

- When an icon is selected or typed, a **live preview** appears
- If it's an emoji, it's displayed in large size
- If it's a file, it's loaded and displayed via HTTP

## 📂 Icon Storage

```
desktop/
└── server/
    └── data/
        └── icons/
            ├── icon-1730300000000.png
            ├── icon-1730300001234.svg
            └── ... (user-selected icons)
```

## 🌐 HTTP Service

Icons are served via HTTP:
```
http://localhost:3100/icons/icon-1730300000000.png
```

This allows both desktop UI and mobile app to view icons.

## 💡 Tips

1. **Using emojis is faster** - No file upload required
2. **Select file for custom icons** - Brand logos, custom designs
3. **Check the preview** - See how it looks before saving
4. **You can leave it empty** - Default ⌨️ emoji will be used

## 🎯 Usage Examples

### OBS Studio Control
```json
{
  "label": "Start OBS",
  "icon": "🎥",
  "keys": ["CONTROL", "ALT", "O"]
}
```

### With Custom Logo
```json
{
  "label": "Premiere Pro",
  "icon": "icon-1730300000000.png",  // Adobe Premiere logo
  "keys": ["ALT", "SHIFT", "P"]
}
```

### Discord Mute
```json
{
  "label": "Mute Microphone",
  "icon": "🎤",
  "keys": ["CONTROL", "SHIFT", "M"]
}
```

## 🔧 Technical Details

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
        title: 'Select Icon',
        filters: [
            { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'svg', 'gif', 'ico'] }
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

## 🎨 UI Style

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

**✨ Your shortcuts are now more visual and user-friendly!**
