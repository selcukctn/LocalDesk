# Local Desk Desktop

Local Desk desktop application - Stream Deck-like keyboard shortcut management

## 🚀 Installation

```bash
# Install dependencies
npm install

# Build C++ Addon (Windows required)
cd server/keyboard-addon
npm install
cd ../..

# Or directly
npm run rebuild
```

## 📦 Requirements

- Node.js 20+
- Windows (for keyboard addon)
- Build tools:
  - Windows: `npm install --global windows-build-tools`
  - Or Visual Studio Build Tools 2019+

## ▶️ Running

```bash
# Development mode
npm start

# Or production build
npm run build
```

## 🏗️ Architecture

```
desktop/
├── main.js              # Electron main process
├── preload.js           # IPC bridge
├── server/
│   ├── index.js         # Socket.IO server & logic
│   ├── discovery.js     # UDP + mDNS discovery
│   ├── keyboard-addon/  # C++ SendInput module
│   └── data/            # JSON database
│       ├── shortcuts.json
│       ├── trusted.json
│       └── config.json
└── ui/
    ├── index.html       # Main UI
    ├── style.css        # Styles
    └── app.js           # Frontend logic
```

## 🔌 API Endpoints

### HTTP REST API

- `GET /device-info` - Device information
- `GET /shortcuts` - Shortcut list
- `GET /icons/:filename` - Icon service
- `GET /health` - Health check

### Socket.IO Events

**Client → Server:**
- `pair-request` - Pairing request
- `execute-shortcut` - Execute shortcut

**Server → Client:**
- `pair-response` - Pairing response
- `shortcuts-update` - Shortcuts updated
- `execute-result` - Execution result

## 🔍 Discovery Protocol

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
- `version": "1.0.0"

## ⌨️ Keyboard Addon

Uses C++ Native addon to send real keyboard input via Windows SendInput API.

Supported keys:
- Letter keys: A-Z
- Number keys: 0-9
- Function keys: F1-F12
- Modifier keys: CTRL, ALT, SHIFT
- Special keys: ENTER, ESCAPE, TAB, SPACE, etc.

Usage:
```javascript
const keyboard = require('./keyboard-addon/build/Release/keyboard');
keyboard.sendKeys(['CONTROL', 'ALT', 'O']);
```

## 🔐 Security

- Pairing required on first connection
- Approved devices stored in `trusted.json`
- Only trusted devices can send commands
- Auto-connect feature for automatic connection

## 📝 Shortcut Format

```json
{
  "id": 1,
  "label": "Start OBS",
  "icon": "obs.png",
  "keys": ["CONTROL", "ALT", "O"],
  "color": "#1F6FEB"
}
```

## 🎨 UI Features

- Dark theme
- Shortcut management (add, edit, delete)
- Trusted device management
- Live connection status
- Pairing approval system

## 🐛 Debug

DevTools automatically opens in development mode:
```bash
NODE_ENV=development npm start
```

Log levels:
- ✅ Successful operations
- 📡 Network events
- ⌨️ Keyboard inputs
- ❌ Errors
- ⚠️ Warnings

## 📄 License

MIT
