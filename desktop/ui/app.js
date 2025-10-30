// Global state
let shortcuts = [];
let trustedDevices = [];
let editingShortcutId = null;
let recordingKeys = false;
let recordedKeys = [];
let currentPairingRequest = null;

// DOM Elements
const shortcutsGrid = document.getElementById('shortcutsGrid');
const trustedDevicesList = document.getElementById('trustedDevicesList');
const shortcutModal = document.getElementById('shortcutModal');
const pairingModal = document.getElementById('pairingModal');
const shortcutForm = document.getElementById('shortcutForm');

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Local Desk UI başlatılıyor...');
    
    // Load data
    await loadShortcuts();
    await loadTrustedDevices();
    await loadServerInfo();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup pairing listener
    window.electronAPI.onPairingRequest((deviceInfo) => {
        showPairingRequest(deviceInfo);
    });
    
    console.log('✅ UI hazır');
});

// Tab switching
function setupEventListeners() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Add shortcut
    document.getElementById('addShortcutBtn').addEventListener('click', () => {
        openShortcutModal();
    });
    
    // Modal close
    document.getElementById('closeModalBtn').addEventListener('click', closeShortcutModal);
    document.getElementById('cancelBtn').addEventListener('click', closeShortcutModal);
    
    // Form submit
    shortcutForm.addEventListener('submit', handleShortcutSubmit);
    
    // Record keys
    document.getElementById('recordKeysBtn').addEventListener('click', toggleKeyRecording);
    
    // Pairing buttons
    document.getElementById('approvePairingBtn').addEventListener('click', () => approvePairing(true));
    document.getElementById('rejectPairingBtn').addEventListener('click', () => approvePairing(false));
    
    // Search
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // Device name save
    document.getElementById('saveDeviceNameBtn').addEventListener('click', saveDeviceName);
    
    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target === shortcutModal) {
            closeShortcutModal();
        }
        if (e.target === pairingModal) {
            // Don't close pairing modal on outside click
        }
    });
    
    // Keyboard shortcuts for recording
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
}

function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `${tabName}-tab`);
    });
}

// Load shortcuts
async function loadShortcuts() {
    try {
        shortcuts = await window.electronAPI.getShortcuts();
        renderShortcuts();
    } catch (error) {
        console.error('Kısayollar yüklenemedi:', error);
    }
}

function renderShortcuts(filter = '') {
    const filtered = shortcuts.filter(s => 
        s.label.toLowerCase().includes(filter.toLowerCase())
    );
    
    if (filtered.length === 0) {
        shortcutsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <p>Kısayol bulunamadı</p>
            </div>
        `;
        return;
    }
    
    shortcutsGrid.innerHTML = filtered.map(shortcut => `
        <div class="shortcut-card" style="border-left: 4px solid ${shortcut.color}">
            <div class="shortcut-actions">
                <button class="action-btn" onclick="editShortcut(${shortcut.id})">✏️</button>
                <button class="action-btn" onclick="deleteShortcut(${shortcut.id})">🗑️</button>
            </div>
            <div class="shortcut-icon">${shortcut.icon || '⌨️'}</div>
            <div class="shortcut-label">${shortcut.label}</div>
            <div class="shortcut-keys">${shortcut.keys.join(' + ')}</div>
        </div>
    `).join('');
}

// Load trusted devices
async function loadTrustedDevices() {
    try {
        trustedDevices = await window.electronAPI.getTrustedDevices();
        renderTrustedDevices();
    } catch (error) {
        console.error('Güvenilir cihazlar yüklenemedi:', error);
    }
}

function renderTrustedDevices() {
    if (trustedDevices.length === 0) {
        trustedDevicesList.innerHTML = `
            <div class="empty-state">
                <p>Henüz güvenilir cihaz yok</p>
                <small>Mobil uygulamadan bağlanarak cihaz ekleyebilirsiniz</small>
            </div>
        `;
        return;
    }
    
    trustedDevicesList.innerHTML = trustedDevices.map(device => `
        <div class="device-card">
            <div class="device-info">
                <h3>📱 ${device.name}</h3>
                <p>${device.id}</p>
                <small>Eklenme: ${new Date(device.addedAt).toLocaleDateString('tr-TR')}</small>
            </div>
            <button class="btn btn-danger" onclick="removeTrustedDevice('${device.id}')">
                Kaldır
            </button>
        </div>
    `).join('');
}

// Load server info
async function loadServerInfo() {
    try {
        const info = await window.electronAPI.getServerInfo();
        document.getElementById('deviceName').textContent = info.deviceName;
        document.getElementById('deviceId').textContent = info.deviceId.substring(0, 8) + '...';
        document.getElementById('statusText').textContent = 'Aktif';
        document.getElementById('serverPort').textContent = info.port;
        document.getElementById('activeConnections').textContent = info.connectedClients;
        document.getElementById('deviceNameInput').value = info.deviceName;
        
        // Get IP addresses (simplified - would need backend support)
        document.getElementById('ipAddresses').textContent = 'Lokal ağ';
    } catch (error) {
        console.error('Server bilgisi yüklenemedi:', error);
    }
}

// Shortcut Modal
function openShortcutModal(shortcut = null) {
    editingShortcutId = shortcut?.id || null;
    
    if (shortcut) {
        document.getElementById('modalTitle').textContent = 'Kısayolu Düzenle';
        document.getElementById('labelInput').value = shortcut.label;
        document.getElementById('keysDisplay').value = shortcut.keys.join(' + ');
        document.getElementById('colorInput').value = shortcut.color;
        document.getElementById('iconInput').value = shortcut.icon || '';
        recordedKeys = [...shortcut.keys];
    } else {
        document.getElementById('modalTitle').textContent = 'Yeni Kısayol Ekle';
        shortcutForm.reset();
        recordedKeys = [];
    }
    
    shortcutModal.classList.add('active');
}

function closeShortcutModal() {
    shortcutModal.classList.remove('active');
    editingShortcutId = null;
    recordedKeys = [];
    recordingKeys = false;
}

async function handleShortcutSubmit(e) {
    e.preventDefault();
    
    const label = document.getElementById('labelInput').value;
    const keys = recordedKeys;
    const color = document.getElementById('colorInput').value;
    const icon = document.getElementById('iconInput').value;
    
    if (keys.length === 0) {
        alert('Lütfen en az bir tuş seçin');
        return;
    }
    
    const shortcut = {
        id: editingShortcutId || Date.now(),
        label,
        keys,
        color,
        icon
    };
    
    if (editingShortcutId) {
        // Edit existing
        const index = shortcuts.findIndex(s => s.id === editingShortcutId);
        shortcuts[index] = shortcut;
    } else {
        // Add new
        shortcuts.push(shortcut);
    }
    
    await window.electronAPI.saveShortcuts(shortcuts);
    await loadShortcuts();
    closeShortcutModal();
}

function toggleKeyRecording() {
    recordingKeys = !recordingKeys;
    const btn = document.getElementById('recordKeysBtn');
    
    if (recordingKeys) {
        btn.textContent = '⏸️ Durdur';
        btn.style.background = 'var(--accent-red)';
        recordedKeys = [];
        document.getElementById('keysDisplay').value = 'Tuşlara basın...';
    } else {
        btn.textContent = '🎹 Tuşları Kaydet';
        btn.style.background = '';
    }
}

const keyMap = {
    'Control': 'CONTROL',
    'Shift': 'SHIFT',
    'Alt': 'ALT',
    'Meta': 'WIN'
};

function handleKeyDown(e) {
    if (!recordingKeys) return;
    
    e.preventDefault();
    
    let key = e.key;
    if (keyMap[key]) {
        key = keyMap[key];
    } else {
        key = key.toUpperCase();
    }
    
    if (!recordedKeys.includes(key)) {
        recordedKeys.push(key);
        document.getElementById('keysDisplay').value = recordedKeys.join(' + ');
    }
}

function handleKeyUp(e) {
    if (!recordingKeys) return;
    e.preventDefault();
}

// Shortcut actions
function editShortcut(id) {
    const shortcut = shortcuts.find(s => s.id === id);
    if (shortcut) {
        openShortcutModal(shortcut);
    }
}

async function deleteShortcut(id) {
    if (!confirm('Bu kısayolu silmek istediğinizden emin misiniz?')) {
        return;
    }
    
    shortcuts = shortcuts.filter(s => s.id !== id);
    await window.electronAPI.saveShortcuts(shortcuts);
    await loadShortcuts();
}

// Device actions
async function removeTrustedDevice(deviceId) {
    if (!confirm('Bu cihazı güvenilir listesinden kaldırmak istediğinizden emin misiniz?')) {
        return;
    }
    
    await window.electronAPI.removeTrustedDevice(deviceId);
    await loadTrustedDevices();
}

// Search
function handleSearch(e) {
    const query = e.target.value;
    renderShortcuts(query);
}

// Settings
async function saveDeviceName() {
    const name = document.getElementById('deviceNameInput').value;
    // Would need backend implementation
    alert('Cihaz adı kaydedildi: ' + name);
}

// Pairing
function showPairingRequest(deviceInfo) {
    currentPairingRequest = deviceInfo;
    document.getElementById('pairingDeviceName').textContent = deviceInfo.deviceName;
    document.getElementById('pairingDeviceId').textContent = deviceInfo.deviceId;
    pairingModal.classList.add('active');
}

async function approvePairing(approved) {
    if (currentPairingRequest) {
        await window.electronAPI.approvePairing(currentPairingRequest.deviceId, approved);
        pairingModal.classList.remove('active');
        currentPairingRequest = null;
        
        if (approved) {
            await loadTrustedDevices();
        }
    }
}

