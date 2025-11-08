# 🚀 Quick Start - Local Desk

## 1️⃣ Start Desktop Application

```bash
cd desktop
npm start
```

You will see these logs:
```
🚀 Local Desk Server starting...
✅ 0 shortcuts loaded (or default shortcuts)
✅ Keyboard addon loaded
✅ HTTP/Socket.IO server running: 3100
🔍 Discovery services starting...
✅ UDP socket listening: 0.0.0.0:45454
✅ mDNS service broadcasting
✅ Discovery services active
✅ Local Desk server started
```

## 2️⃣ Add Shortcut WITHOUT Phone Connection

**You can now add shortcuts even without your phone connected!**

### Step 1: Open Desktop Window

The Electron app will open automatically.

### Step 2: Go to "⌨️ Shortcuts" Tab

It should already be open (default).

### Step 3: Click "➕ Add New Shortcut" Button

A modal window will open.

### Step 4: Fill in the Shortcut

#### Example 1: Start OBS Studio

```
Label: OBS Studio
Action Type: 🚀 Launch Application
📂 Select App: C:\Program Files\obs-studio\bin\64bit\obs64.exe
Icon: 🎥 (from Use Emoji button)
Color: Blue (#1F6FEB)
```

#### Example 2: Keyboard Shortcut

```
Label: Take Screenshot
Action Type: ⌨️ Keyboard Shortcut
Keys: WIN + SHIFT + S (click 🎹 Record Keys button and press keys)
Icon: 📸
Color: Orange (#FF9800)
```

#### Example 3: Both Combined

```
Label: Chrome New Tab
Action Type: 🔗 Both
Keys: CONTROL + T
📂 Application: C:\Program Files\Google\Chrome\Application\chrome.exe
Icon: 🌐
Color: Green (#00C853)
```

### Step 5: Save

Click the "Save" button. The shortcut will appear in the grid!

## 3️⃣ Automatic Sync When Phone Connects

### What Happens When Phone Connects?

1. **Phone scans the network** → Finds desktop
2. **Sends pairing request** → Popup appears on desktop
3. **Click "Approve"** → Device is added to trusted list
4. **Shortcuts are automatically sent** → All your shortcuts appear on phone! 🎉

### How the Code Works?

**When pairing is approved:**

```javascript
// server/index.js - line 226
pairing.socket.emit('shortcuts-update', this.shortcuts);
```

**When a new shortcut is added:**

```javascript
// server/index.js - line 388
if (this.io) {
  this.io.emit('shortcuts-update', shortcuts);
}
```

All connected mobile devices receive the update instantly!

## 4️⃣ Testing Shortcuts

### Test from Desktop

Currently, there's no direct test feature from desktop UI, but:

1. You can view shortcuts in the grid
2. You can edit/delete them
3. You can see their colors and icons

### Test from Phone

1. Open phone app
2. Find and connect to your desktop
3. Shortcuts will appear in the grid
4. Click a button → It works on desktop!

## 5️⃣ Data Files

All your shortcuts are stored here:

```
desktop/server/data/
├── shortcuts.json       ← Your shortcuts
├── trusted.json         ← Trusted devices
├── config.json          ← Server settings
└── icons/               ← Custom icons
    ├── icon-1730300000000.png
    └── ...
```

### shortcuts.json Example

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
    "label": "Chrome New Tab",
    "icon": "🌐",
    "keys": ["CONTROL", "T"],
    "color": "#00C853",
    "actionType": "both",
    "appPath": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  }
]
```

## 6️⃣ Popular Shortcut Examples

### 🎮 Gaming/Streaming

```javascript
// OBS Start/Stop Recording
{
  "label": "OBS Record",
  "icon": "🔴",
  "keys": ["CONTROL", "ALT", "R"],
  "actionType": "keys"
}

// Discord Mute
{
  "label": "Mute Microphone",
  "icon": "🎤",
  "keys": ["CONTROL", "SHIFT", "M"],
  "actionType": "keys"
}

// Start Spotify
{
  "label": "Spotify",
  "icon": "🎵",
  "appPath": "C:\\Users\\YourUser\\AppData\\Roaming\\Spotify\\Spotify.exe",
  "actionType": "app"
}
```

### 💼 Productivity

```javascript
// Open VS Code
{
  "label": "VS Code",
  "icon": "💻",
  "appPath": "C:\\Users\\YourUser\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
  "actionType": "app"
}

// Minimize All Windows
{
  "label": "Show Desktop",
  "icon": "🖥️",
  "keys": ["WIN", "D"],
  "actionType": "keys"
}

// Save
{
  "label": "Save",
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

// Render
{
  "label": "Render",
  "icon": "⚙️",
  "keys": ["CONTROL", "M"],
  "actionType": "keys"
}
```

## 7️⃣ Troubleshooting

### I See mDNS Error

```
mDNS startup error: TypeError: Bonjour is not a constructor
```

**Solution:** Already fixed! Code is up to date, just restart:
```bash
# Stop with Ctrl+C
npm start
```

### Shortcuts Disappeared

Don't worry! They're stored in `desktop/server/data/shortcuts.json`.

**Check:**
```bash
cat desktop/server/data/shortcuts.json
```

**Backup:**
```bash
cp desktop/server/data/shortcuts.json shortcuts-backup.json
```

### Keyboard Addon Error

```
⚠️  Keyboard addon failed to load
```

**Solution:**
```bash
cd desktop/server/keyboard-addon
npm install
cd ../../..
npm start
```

### Phone Can't Find Desktop

1. **Are you on the same WiFi network?**
   - Desktop and phone must be connected to the same router

2. **Is firewall open?**
   - Windows Defender → Open ports 3100 and 45454

3. **Is UDP working?**
   - You should see "UDP socket listening" message in console

## 8️⃣ Advanced

### Manual JSON Editing

You can directly edit the `shortcuts.json` file:

```bash
notepad desktop/server/data/shortcuts.json
```

Save and restart the application.

### Bulk Import

Paste the JSON array directly to add many shortcuts at once.

### Backup & Restore

```bash
# Backup
cp -r desktop/server/data desktop-backup

# Restore
cp -r desktop-backup desktop/server/data
```

## 9️⃣ Next Steps

1. ✅ Add 5-10 shortcuts from desktop
2. ✅ Connect your phone
3. ✅ Do pairing
4. ✅ Test shortcuts
5. ✅ Add your favorite apps!

---

## 💡 Important Reminders

- 📱 **You can add shortcuts even without phone connected**
- 🔄 **Automatic synchronization** - All shortcuts come when phone connects
- 💾 **Data is persistent** - Stored in `data/` folder
- 🔐 **Secure** - Only approved devices can connect
- ⚡ **Real-time** - Changes on desktop → Instantly visible on phone

**🎉 Enjoy using it!**
