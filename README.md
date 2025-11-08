# 🎮 Local Desk

**Stream Deck-like keyboard shortcut controller - Mobile control over local network**

Local Desk transforms your mobile device (iOS/Android) into a wireless shortcut controller for your desktop computer. With a Stream Deck-like interface, you can easily trigger keyboard shortcuts for OBS, video editing, game streaming, and general productivity.

## ✨ Features

### 🔍 Automatic Device Discovery
- Automatically finds devices on the network via UDP broadcast
- mDNS/Bonjour support
- No internet connection required
- Works on local network

### 🔐 Secure Connection
- Pairing system on first connection
- Requires approval from desktop
- Trusted device list
- Automatic reconnection

### ⌨️ Real Keyboard Input
- Uses Windows SendInput API
- C++ Native addon
- Compatible with all applications (OBS, Premiere, games, etc.)
- Detected as physical keyboard

### 🎨 Stream Deck Style UI
- Colorful button grid
- Customizable icons
- Drag-and-drop editing
- Page/category support

### 🔄 Live Synchronization
- Changes made on desktop appear instantly on mobile
- Real-time updates via Socket.IO
- Bidirectional communication

## 🏗️ Architecture

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

## 📦 Project Structure

```
LocalDesk/
├── desktop/                # Electron desktop application
│   ├── main.js            # Electron main process
│   ├── preload.js         # IPC bridge
│   ├── server/            # Node.js backend
│   │   ├── index.js       # Socket.IO server
│   │   ├── discovery.js   # UDP + mDNS
│   │   └── keyboard-addon/ # C++ SendInput module
│   └── ui/                # HTML/CSS/JS interface
│
└── LocalDesk/             # React Native mobile app
    ├── App.jsx            # Main application
    └── src/
        ├── hooks/         # Custom hooks
        ├── components/    # UI components
        └── screens/       # Screens
```

## 🚀 Quick Start

### Prerequisites

**Desktop:**
- Node.js 20+
- Windows (for keyboard addon)
- Visual Studio Build Tools 2019+

**Mobile:**
- Node.js 20+
- React Native CLI
- iOS: Xcode 14+ (macOS)
- Android: Android Studio + JDK 17

### Installation

#### 1️⃣ Desktop Application

```bash
cd desktop

# Install dependencies
npm install

# Build C++ Addon
cd server/keyboard-addon
npm install
cd ../..

# Or directly
npm run rebuild

# Start the application
npm start
```

#### 2️⃣ Mobile Application

```bash
cd LocalDesk

# Install dependencies
npm install

# For iOS
cd ios && pod install && cd ..
npm run ios

# For Android
npm run android
```

## 📖 Usage

### 1. Start Desktop Application

- Open Local Desk Desktop on Windows
- UDP and mDNS services start automatically
- Device name and status appear in the top left corner

### 2. Open Mobile Application

- Make sure you're on the same WiFi network
- The app automatically finds your desktop device
- Select your device from the list

### 3. Pair Devices

- When you select a device on mobile, a pairing request is sent
- Click "Approve" on the popup that appears on desktop
- Connection is established and shortcuts are downloaded

### 4. Use Shortcuts

- Stream Deck-style button grid appears on mobile screen
- Press any button to trigger the keyboard shortcut
- Desktop detects it as if real keyboard keys were pressed

### 5. Adding Shortcuts

- Click "➕ Add New Shortcut" in the desktop application
- Select label, keys, and color
- Save - appears instantly on mobile

## 🎯 Use Cases

### 🎥 OBS Studio
```javascript
{
  "label": "Start/Stop Recording",
  "keys": ["CONTROL", "ALT", "R"],
  "color": "#f44336"
}
```

### 🎬 Video Editing
```javascript
{
  "label": "Render",
  "keys": ["CONTROL", "M"],
  "color": "#9c27b0"
}
```

### 🎮 Game Streaming
```javascript
{
  "label": "Discord Mute",
  "keys": ["CONTROL", "SHIFT", "M"],
  "color": "#5865F2"
}
```

### 💼 General Productivity
```javascript
{
  "label": "Screenshot",
  "keys": ["WIN", "SHIFT", "S"],
  "color": "#00C853"
}
```

## 🔧 Configuration

### Desktop Ports

- **HTTP/Socket.IO**: 3100
- **UDP Discovery**: 45454
- **mDNS**: Automatic

### Data Files

```
desktop/server/data/
├── config.json        # Device settings
├── shortcuts.json     # Shortcut list
├── trusted.json       # Trusted devices
└── icons/            # Custom icons
```

## 🛠️ Development

### Debug Mode

**Desktop:**
```bash
NODE_ENV=development npm start
# DevTools opens automatically
```

**Mobile:**
```bash
npm start -- --reset-cache
# Shake device > Debug
```

### C++ Addon Rebuild

```bash
cd desktop/server/keyboard-addon
npm run rebuild
```

### Log Levels

- ✅ Successful operations
- 📡 Network events
- ⌨️ Keyboard inputs
- 🔐 Pairing operations
- ❌ Errors
- ⚠️ Warnings

## 📡 Protocol Details

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
  message: 'Pairing approved'
})
```

**Execute Shortcut:**
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

**Synchronization:**
```javascript
// Server → Client
emit('shortcuts-update', [
  { id: 1, label: '...', keys: [...], color: '...' }
])
```

## 🔐 Security

- ✅ Works on local network (no internet required)
- ✅ Manual approval on first connection
- ✅ Trusted device system
- ✅ Permission check for each command
- ⚠️ SSL/TLS not used (not necessary for local network)

## 🐛 Troubleshooting

### Device Not Found

1. Make sure you're on the same WiFi network
2. Firewall should allow ports 3100 and 45454
3. Check that desktop application is running
4. Restart mobile application

### Connection Error

1. If you approved pairing on desktop
2. Check if you're in the trusted devices list
3. Clear trusted devices on mobile and try again
4. Restart both applications

### Shortcuts Not Working

1. Make sure C++ Addon is built: `npm run rebuild`
2. Check if Windows Build Tools is installed
3. Check desktop logs
4. Make sure target application is in focus

### Performance Issues

1. Check if there's heavy traffic on the same network
2. Check WiFi signal strength
3. Don't leave mobile app in background
4. Check if other heavy processes are running on desktop

## 🎨 Customization

### Custom Icons

Add icons to `desktop/server/data/icons/` folder:

```json
{
  "label": "OBS",
  "icon": "obs.png",
  "keys": ["CONTROL", "ALT", "O"],
  "color": "#1F6FEB"
}
```

### Theme Colors

For desktop UI `desktop/ui/style.css`:

```css
:root {
  --bg-primary: #1e1e1e;
  --accent-blue: #1F6FEB;
  /* ... */
}
```

For mobile UI `LocalDesk/src/components/ButtonGrid.jsx`:

```javascript
const styles = StyleSheet.create({
  button: {
    backgroundColor: '#252526',
    // ...
  }
});
```

## 🚧 Upcoming Features

- [ ] Macro recording system
- [ ] Multiple page/category support
- [ ] Custom icon upload interface
- [ ] Haptic feedback
- [ ] Widget support (iOS/Android)
- [ ] Theme support (light/dark)
- [ ] macOS/Linux support
- [ ] Web interface

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - See `LICENSE` file for details

## 👨‍💻 Developer


<table>
  <tr>
    <td align="center" width="180">
      <img src="https://avatars.githubusercontent.com/u/56540582?v=4&size=64" width="120px" style="border-radius: 50%;" alt="Harun Selçuk Çetin Profile Photo"/>
      <br/><b>Harun Selçuk Çetin</b><br/>
      <a href="https://www.linkedin.com/in/harun-selcuk-cetin/" target="_blank">🔗 LinkedIn</a> •
      <a href="https://www.youtube.com/@harunselcukcetin" target="_blank">▶️ YouTube</a>
    </td>
  </tr>
</table>

## 🙏 Acknowledgments

- [Electron](https://www.electronjs.org/)
- [React Native](https://reactnative.dev/)
- [Socket.IO](https://socket.io/)
- [LocalSend](https://localsend.org/) - Inspiration for discovery logic

---

**⭐ If you liked the project, don't forget to give it a star!**
