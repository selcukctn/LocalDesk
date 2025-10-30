// Global state
let pages = []; // Sayfalar listesi
let currentPageId = null; // Seçili sayfa
let shortcuts = []; // Mevcut sayfanın shortcut'ları
let trustedDevices = [];
let editingShortcutId = null;
let recordingKeys = false;
let recordedKeys = [];
let currentPairingRequest = null;
let selectedIcon = null; // İkon dosya adı veya emoji
let selectedAppPath = null; // Başlatılacak uygulama yolu

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
    await loadPages();
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
    
    // Icon selection
    document.getElementById('selectIconBtn').addEventListener('click', selectIconFile);
    document.getElementById('useEmojiBtn').addEventListener('click', useEmoji);
    
    // Icon input değişikliği
    document.getElementById('iconInput').addEventListener('input', (e) => {
        const value = e.target.value.trim();
        if (value) {
            selectedIcon = value;
            showIconPreview(value);
        } else {
            hideIconPreview();
        }
    });
    
    // App selection
    document.getElementById('selectAppBtn').addEventListener('click', selectAppFile);
    
    // Action type değişikliği
    document.querySelectorAll('input[name="actionType"]').forEach(radio => {
        radio.addEventListener('change', handleActionTypeChange);
    });
    
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

// Load pages
async function loadPages() {
    try {
        pages = await window.electronAPI.getPages();
        
        // İlk sayfayı seç
        if (pages.length > 0) {
            currentPageId = pages[0].id;
            shortcuts = pages[0].shortcuts || [];
        } else {
            shortcuts = [];
        }
        
        renderPages();
        renderShortcuts();
    } catch (error) {
        console.error('Sayfalar yüklenemedi:', error);
    }
}

// Render pages selector
function renderPages() {
    const pagesContainer = document.getElementById('pagesSelector');
    if (!pagesContainer) return;
    
    pagesContainer.innerHTML = pages.map(page => `
        <button class="page-tab ${page.id === currentPageId ? 'active' : ''}" 
                data-page-id="${page.id}"
                onclick="selectPage('${page.id}')">
            ${page.name}
        </button>
    `).join('') + `
        <button class="page-tab page-add" onclick="addNewPage()">
            + Yeni Sayfa
        </button>
    `;
}

// Select page
async function selectPage(pageId) {
    currentPageId = pageId;
    const page = pages.find(p => p.id === pageId);
    if (page) {
        shortcuts = page.shortcuts || [];
        renderPages();
        renderShortcuts();
    }
}

// Add new page
async function addNewPage() {
    const name = prompt('Yeni sayfa adı:', 'Yeni Sayfa');
    if (!name) return;
    
    const newPage = await window.electronAPI.addPage(name);
    await loadPages();
    currentPageId = newPage.id;
    renderPages();
    renderShortcuts();
}

// Rename page
async function renamePage(pageId) {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    
    const newName = prompt('Sayfa adı:', page.name);
    if (!newName) return;
    
    await window.electronAPI.updatePageName(pageId, newName);
    await loadPages();
}

// Delete page
async function deletePage(pageId) {
    if (pages.length <= 1) {
        alert('Son sayfa silinemez!');
        return;
    }
    
    if (!confirm('Bu sayfayı silmek istediğinizden emin misiniz?')) {
        return;
    }
    
    await window.electronAPI.deletePage(pageId);
    await loadPages();
}

// Load shortcuts (geriye uyumluluk)
async function loadShortcuts() {
    await loadPages();
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
    
    shortcutsGrid.innerHTML = filtered.map(shortcut => {
        // İkon gösterimi - emoji mi dosya mı?
        let iconHtml;
        if (shortcut.icon && shortcut.icon.length <= 4) {
            // Emoji
            iconHtml = shortcut.icon;
        } else if (shortcut.icon) {
            // Dosya
            iconHtml = `<img src="http://localhost:3100/icons/${shortcut.icon}" style="width: 40px; height: 40px; object-fit: contain;">`;
        } else {
            // Varsayılan
            iconHtml = '⌨️';
        }
        
        // Keys gösterimi - sadece varsa
        let keysHtml = '';
        if (shortcut.keys && shortcut.keys.length > 0) {
            keysHtml = `<div class="shortcut-keys">${shortcut.keys.join(' + ')}</div>`;
        } else if (shortcut.actionType === 'app' || shortcut.actionType === 'both') {
            keysHtml = `<div class="shortcut-keys">🚀 Uygulama</div>`;
        } else {
            keysHtml = `<div class="shortcut-keys">-</div>`;
        }
        
        return `
            <div class="shortcut-card" style="border-left: 4px solid ${shortcut.color}">
                <div class="shortcut-actions">
                    <button class="action-btn" onclick="editShortcut(${shortcut.id})">✏️</button>
                    <button class="action-btn" onclick="deleteShortcut(${shortcut.id})">🗑️</button>
                </div>
                <div class="shortcut-icon">${iconHtml}</div>
                <div class="shortcut-label">${shortcut.label}</div>
                ${keysHtml}
            </div>
        `;
    }).join('');
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
        document.getElementById('totalShortcuts').textContent = info.shortcuts;
        document.getElementById('deviceNameInput').value = info.deviceName;
        
        // Get IP addresses (simplified - would need backend support)
        document.getElementById('ipAddresses').textContent = 'Lokal ağ';
        
        // Aktif bağlantıları da güncelle
        await loadConnectedClients();
    } catch (error) {
        console.error('Server bilgisi yüklenemedi:', error);
    }
}

// Load connected clients
async function loadConnectedClients() {
    try {
        const clients = await window.electronAPI.getConnectedClients();
        renderConnectedClients(clients);
    } catch (error) {
        console.error('Bağlı cihazlar yüklenemedi:', error);
    }
}

// Render connected clients
function renderConnectedClients(clients) {
    const list = document.getElementById('activeConnectionsList');
    
    if (!clients || clients.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <p>Aktif bağlantı yok</p>
                <small>Mobil cihazdan bağlan</small>
            </div>
        `;
        return;
    }
    
    list.innerHTML = clients.map(client => `
        <div class="device-card ${client.connected ? 'connected' : 'disconnected'}">
            <div class="device-info">
                <h3>📱 ${client.deviceName}</h3>
                <p>ID: ${client.deviceId.substring(0, 16)}...</p>
                <small>Socket: ${client.socketId.substring(0, 8)}...</small>
            </div>
            <div class="connection-status">
                <span class="status-badge ${client.connected ? 'online' : 'offline'}">
                    ${client.connected ? '🟢 Bağlı' : '🔴 Bağlantı Kesildi'}
                </span>
            </div>
        </div>
    `).join('');
}

// Otomatik server info güncellemesi
setInterval(async () => {
    await loadServerInfo();
}, 3000); // Her 3 saniyede bir güncelle

// Shortcut Modal
function openShortcutModal(shortcut = null) {
    editingShortcutId = shortcut?.id || null;
    selectedIcon = null;
    selectedAppPath = null;
    
    if (shortcut) {
        document.getElementById('modalTitle').textContent = 'Kısayolu Düzenle';
        document.getElementById('labelInput').value = shortcut.label;
        document.getElementById('keysDisplay').value = (shortcut.keys || []).join(' + ');
        document.getElementById('colorInput').value = shortcut.color;
        document.getElementById('iconInput').value = shortcut.icon || '';
        selectedIcon = shortcut.icon || null;
        recordedKeys = shortcut.keys ? [...shortcut.keys] : [];
        
        // Action type
        const actionType = shortcut.actionType || 'keys';
        document.querySelector(`input[name="actionType"][value="${actionType}"]`).checked = true;
        
        // App path
        if (shortcut.appPath) {
            selectedAppPath = shortcut.appPath;
            document.getElementById('appPathInput').value = shortcut.appPath;
        }
        
        // Grupları göster/gizle
        handleActionTypeChange({ target: document.querySelector(`input[name="actionType"][value="${actionType}"]`) });
        
        // İkon önizleme
        if (shortcut.icon) {
            showIconPreview(shortcut.icon);
        }
    } else {
        document.getElementById('modalTitle').textContent = 'Yeni Kısayol Ekle';
        shortcutForm.reset();
        recordedKeys = [];
        document.querySelector('input[name="actionType"][value="keys"]').checked = true;
        document.getElementById('keysGroup').style.display = 'block';
        document.getElementById('appGroup').style.display = 'none';
        hideIconPreview();
    }
    
    shortcutModal.classList.add('active');
}

function closeShortcutModal() {
    shortcutModal.classList.remove('active');
    editingShortcutId = null;
    recordedKeys = [];
    recordingKeys = false;
    selectedIcon = null;
    selectedAppPath = null;
    hideIconPreview();
}

async function handleShortcutSubmit(e) {
    e.preventDefault();
    
    const label = document.getElementById('labelInput').value;
    const keys = recordedKeys;
    const color = document.getElementById('colorInput').value;
    const icon = selectedIcon || '';
    const actionType = document.querySelector('input[name="actionType"]:checked').value;
    const appPath = selectedAppPath || '';
    
    // Validasyon
    if (actionType === 'keys' && keys.length === 0) {
        alert('Lütfen en az bir tuş seçin');
        return;
    }
    
    if (actionType === 'app' && !appPath) {
        alert('Lütfen bir uygulama seçin');
        return;
    }
    
    if (actionType === 'both' && (keys.length === 0 || !appPath)) {
        alert('Lütfen hem tuşları hem de uygulamayı seçin');
        return;
    }
    
    const shortcut = {
        label,
        keys: keys.length > 0 ? keys : undefined,
        color,
        icon,
        actionType,
        appPath: appPath || undefined
    };
    
    if (editingShortcutId) {
        // Edit existing
        await window.electronAPI.updateShortcutInPage(currentPageId, editingShortcutId, shortcut);
    } else {
        // Add new
        await window.electronAPI.addShortcutToPage(currentPageId, shortcut);
    }
    
    await loadPages();
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
    
    await window.electronAPI.deleteShortcutFromPage(currentPageId, id);
    await loadPages();
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

// Action type change handler
function handleActionTypeChange(e) {
    const actionType = e.target.value;
    const keysGroup = document.getElementById('keysGroup');
    const appGroup = document.getElementById('appGroup');
    
    if (actionType === 'keys') {
        keysGroup.style.display = 'block';
        appGroup.style.display = 'none';
    } else if (actionType === 'app') {
        keysGroup.style.display = 'none';
        appGroup.style.display = 'block';
    } else if (actionType === 'both') {
        keysGroup.style.display = 'block';
        appGroup.style.display = 'block';
    }
}

// App selection
async function selectAppFile() {
    try {
        const result = await window.electronAPI.selectApp();
        
        if (result.canceled) {
            return;
        }
        
        selectedAppPath = result.appPath;
        document.getElementById('appPathInput').value = result.appPath;
        
        console.log('✅ Uygulama seçildi:', result.appPath);
    } catch (error) {
        console.error('Uygulama seçimi hatası:', error);
        alert('Uygulama seçilirken hata oluştu');
    }
}

// Icon selection
async function selectIconFile() {
    try {
        const result = await window.electronAPI.selectIcon();
        
        if (result.canceled) {
            return;
        }
        
        selectedIcon = result.iconPath;
        document.getElementById('iconInput').value = result.iconPath;
        showIconPreview(result.iconPath);
        
        console.log('✅ İkon seçildi:', result.iconPath);
    } catch (error) {
        console.error('İkon seçimi hatası:', error);
        alert('İkon seçilirken hata oluştu');
    }
}

function useEmoji() {
    const emoji = prompt('Emoji girin (örn: 🎮, 🎬, 📱):', '🎮');
    
    if (emoji && emoji.trim()) {
        selectedIcon = emoji.trim();
        document.getElementById('iconInput').value = emoji.trim();
        showIconPreview(emoji.trim());
    }
}

function showIconPreview(icon) {
    const preview = document.getElementById('iconPreview');
    preview.classList.add('active');
    
    // Emoji mi yoksa dosya mı?
    if (icon && icon.length <= 4) {
        // Muhtemelen emoji
        preview.innerHTML = `<div class="emoji">${icon}</div>`;
    } else if (icon) {
        // Dosya - HTTP üzerinden göster
        preview.innerHTML = `<img src="http://localhost:3100/icons/${icon}" alt="İkon Önizleme">`;
    }
}

function hideIconPreview() {
    const preview = document.getElementById('iconPreview');
    preview.classList.remove('active');
    preview.innerHTML = '';
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

