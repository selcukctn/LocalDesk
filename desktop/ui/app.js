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
let pageModal = null;
let selectedPageIcon = null; // Sayfa için ikon
let selectedPageTargetApp = null; // Sayfa için hedef uygulama (exe adı)
let confirmModal = null;
let confirmResolve = null; // Promise resolver for confirm

// DOM Elements
const shortcutsGrid = document.getElementById('shortcutsGrid');
const trustedDevicesList = document.getElementById('trustedDevicesList');
const shortcutModal = document.getElementById('shortcutModal');
const pairingModal = document.getElementById('pairingModal');
const shortcutForm = document.getElementById('shortcutForm');

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Local Desk UI başlatılıyor...');
    
    // Initialize i18n first
    await window.i18n.initI18n();
    window.i18n.updateUI();
    
    // Set language selector value
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.value = window.i18n.getCurrentLanguage();
    }
    
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
    
    // New Page modal elements
    pageModal = document.getElementById('pageModal');
    const closePageModalBtn = document.getElementById('closePageModalBtn');
    const cancelPageBtn = document.getElementById('cancelPageBtn');
    const pageForm = document.getElementById('pageForm');
    const pageIconInput = document.getElementById('pageIconInput');
    const selectPageIconBtn = document.getElementById('selectPageIconBtn');
    const usePageEmojiBtn = document.getElementById('usePageEmojiBtn');
    const selectTargetAppBtn = document.getElementById('selectTargetAppBtn');
    const clearTargetAppBtn = document.getElementById('clearTargetAppBtn');
    
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
        if (e.target === pageModal) {
            closePageModal();
        }
        if (e.target === confirmModal) {
            handleConfirmResponse(false);
        }
    });
    
    // Keyboard shortcuts for recording
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Page modal handlers
    if (closePageModalBtn) closePageModalBtn.addEventListener('click', closePageModal);
    if (cancelPageBtn) cancelPageBtn.addEventListener('click', closePageModal);
    if (pageForm) pageForm.addEventListener('submit', handlePageSubmit);
    if (selectPageIconBtn) selectPageIconBtn.addEventListener('click', selectPageIconFile);
    if (usePageEmojiBtn) usePageEmojiBtn.addEventListener('click', usePageEmoji);
    if (pageIconInput) pageIconInput.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        if (value) {
            selectedPageIcon = value;
            showPageIconPreview(value);
        } else {
            hidePageIconPreview();
        }
    });
    
    // Target app selection
    if (selectTargetAppBtn) selectTargetAppBtn.addEventListener('click', selectTargetApp);
    if (clearTargetAppBtn) clearTargetAppBtn.addEventListener('click', clearTargetApp);

    // Buy Me a Coffee link
    const buyMeCoffeeLink = document.getElementById('buyMeCoffeeLink');
    if (buyMeCoffeeLink) {
        buyMeCoffeeLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const url = 'https://buymeacoffee.com/harunselcukcetin';
            try {
                await window.electronAPI.openExternal(url);
            } catch (error) {
                console.error('URL açma hatası:', error);
            }
        });
    }

    // Confirm modal handlers
    confirmModal = document.getElementById('confirmModal');
    const confirmOkBtn = document.getElementById('confirmOkBtn');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    
    if (confirmOkBtn) confirmOkBtn.addEventListener('click', () => handleConfirmResponse(true));
    if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', () => handleConfirmResponse(false));
    
    // Language selector
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.addEventListener('change', async (e) => {
            const newLang = e.target.value;
            await window.i18n.changeLanguage(newLang);
            window.i18n.updateUI();
            // Update dynamic content
            await loadPages();
            await loadTrustedDevices();
            await loadServerInfo();
        });
    }
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
        // Mevcut sayfa ID'sini sakla
        const previousPageId = currentPageId;
        
        pages = await window.electronAPI.getPages();
        
        // Mevcut sayfa hala mevcutsa onu seç, yoksa ilk sayfayı seç
        if (pages.length > 0) {
            const currentPageExists = pages.find(p => p.id === previousPageId);
            if (currentPageExists && previousPageId !== null) {
                // Mevcut sayfa hala var, onu seç
                currentPageId = previousPageId;
                shortcuts = currentPageExists.shortcuts || [];
            } else {
                // Mevcut sayfa yok veya ilk yükleme, ilk sayfayı seç
                currentPageId = pages[0].id;
                shortcuts = pages[0].shortcuts || [];
            }
        } else {
            currentPageId = null;
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
    
    const canDelete = pages.length > 1; // Tek sayfa kalırsa silinemez
    
    pagesContainer.innerHTML = pages.map(page => `
        <div class="page-tab-wrapper">
            <button class="page-tab ${page.id === currentPageId ? 'active' : ''}" 
                    data-page-id="${page.id}"
                    onclick="selectPage('${page.id}')">
                <span class="page-name" id="page-name-${page.id}">${page.name}</span>
            </button>
            <div class="page-actions">
                <button class="page-action-btn" onclick="event.stopPropagation(); startEditPageName('${page.id}')" title="${window.i18n.t('shortcuts.editPage')}">✏️</button>
                ${canDelete ? `<button class="page-action-btn" onclick="event.stopPropagation(); deletePage('${page.id}')" title="${window.i18n.t('shortcuts.deletePage')}">🗑️</button>` : ''}
            </div>
        </div>
    `).join('') + `
        <button class="page-tab page-add" onclick="addNewPage()">
            ${window.i18n.t('shortcuts.newPage')}
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
    openPageModal();
}

// Page Modal
function openPageModal() {
    selectedPageIcon = null;
    selectedPageTargetApp = null;
    document.getElementById('pageForm').reset();
    hidePageIconPreview();
    clearTargetAppUI();
    pageModal.classList.add('active');
    
    // Modal açıldıktan sonra ilk input'a focus yap
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const pageNameInput = document.getElementById('pageNameInput');
            if (pageNameInput) {
                pageNameInput.focus();
            }
        });
    });
}

function closePageModal() {
    if (!pageModal) return;
    pageModal.classList.remove('active');
    selectedPageIcon = null;
    selectedPageTargetApp = null;
    hidePageIconPreview();
    clearTargetAppUI();
}

async function handlePageSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('pageNameInput').value.trim();
    if (!name) return;
    const icon = selectedPageIcon || undefined;
    const targetApp = selectedPageTargetApp || undefined;
    
    // Sayfa oluştur (targetApp ile birlikte)
    const newPage = await window.electronAPI.addPage(name, icon, targetApp);
    
    closePageModal();
    await loadPages();
    currentPageId = newPage.id;
    renderPages();
    renderShortcuts();
}

// Page icon selection
async function selectPageIconFile() {
    try {
        const result = await window.electronAPI.selectIcon();
        if (result.canceled) return;
        selectedPageIcon = result.iconPath;
        document.getElementById('pageIconInput').value = result.iconPath;
        showPageIconPreview(result.iconPath);
        console.log('✅ Sayfa ikonu seçildi:', result.iconPath);
    } catch (error) {
        console.error('Sayfa ikonu seçimi hatası:', error);
        await showAlert(window.i18n.t('alerts.error'), window.i18n.t('alerts.iconSelectionError'), '❌');
    }
}

function usePageEmoji() {
    const emoji = prompt('Emoji girin (örn: 📄, 🎮, 🎬):', '📄');
    if (emoji && emoji.trim()) {
        selectedPageIcon = emoji.trim();
        document.getElementById('pageIconInput').value = emoji.trim();
        showPageIconPreview(emoji.trim());
    }
}

function showPageIconPreview(icon) {
    const preview = document.getElementById('pageIconPreview');
    preview.classList.add('active');
    if (icon && icon.length <= 4) {
        preview.innerHTML = `<div class="emoji">${icon}</div>`;
    } else if (icon) {
        preview.innerHTML = `<img src="http://localhost:3100/icons/${icon}" alt="İkon Önizleme">`;
    }
}

function hidePageIconPreview() {
    const preview = document.getElementById('pageIconPreview');
    preview.classList.remove('active');
    preview.innerHTML = '';
}

// Start editing page name (inline)
function startEditPageName(pageId) {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    
    const pageNameSpan = document.getElementById(`page-name-${pageId}`);
    const pageButton = pageNameSpan.closest('.page-tab');
    
    // Mevcut metni al
    const currentName = page.name;
    
    // Input oluştur
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'page-name-edit';
    
    // Span'ı gizle ve input'u ekle
    pageNameSpan.style.display = 'none';
    pageButton.appendChild(input);
    
    // Input'a focus yap ve tüm metni seç
    input.focus();
    input.select();
    
    // Enter tuşu ile kaydet
    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            await savePageName(pageId, input.value.trim());
        } else if (e.key === 'Escape') {
            e.preventDefault();
            await loadPages(); // İptal et, sayfayı yeniden yükle
        }
    });
    
    // Focus kaybedince kaydet
    input.addEventListener('blur', async () => {
        await savePageName(pageId, input.value.trim());
    });
}

// Save page name
async function savePageName(pageId, newName) {
    if (!newName || newName.length === 0) {
        // Boş isim girilirse, değişikliği iptal et
        await loadPages();
        return;
    }
    
    try {
        await window.electronAPI.updatePageName(pageId, newName);
        await loadPages();
    } catch (error) {
        console.error('Sayfa adı güncellenemedi:', error);
        await loadPages();
    }
}

// Delete page
async function deletePage(pageId) {
    if (pages.length <= 1) {
        await showAlert(window.i18n.t('alerts.warning'), window.i18n.t('alerts.lastPageCannotDelete'), '⚠️');
        return;
    }
    
    const confirmed = await showConfirm(
        window.i18n.t('confirm.deletePage'), 
        window.i18n.t('confirm.deletePageMessage'), 
        '🗑️'
    );
    
    if (!confirmed) {
        return;
    }
    
    await window.electronAPI.deletePage(pageId);
    await loadPages();
}

// Load shortcuts (geriye uyumluluk)
async function loadShortcuts() {
    await loadPages();
}

function renderShortcuts() {
    if (shortcuts.length === 0) {
        shortcutsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <p>${window.i18n.t('shortcuts.empty')}</p>
            </div>
        `;
        return;
    }
    
    shortcutsGrid.innerHTML = shortcuts.map(shortcut => {
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
            <div class="shortcut-card" 
                 draggable="true" 
                 data-shortcut-id="${shortcut.id}"
                 style="border-left: 4px solid ${shortcut.color}">
                <div class="shortcut-actions">
                    <button class="action-btn" 
                            onclick="event.stopPropagation(); editShortcut(${shortcut.id})"
                            onmousedown="event.stopPropagation()">✏️</button>
                    <button class="action-btn" 
                            onclick="event.stopPropagation(); deleteShortcut(${shortcut.id})"
                            onmousedown="event.stopPropagation()">🗑️</button>
                </div>
                <div class="shortcut-icon">${iconHtml}</div>
                <div class="shortcut-label">${shortcut.label}</div>
                ${keysHtml}
            </div>
        `;
    }).join('');
    
    // Drag and drop event listeners ekle
    setupDragAndDrop();
}

// Drag and drop setup
let draggedElement = null;
let draggedOverElement = null;

function setupDragAndDrop() {
    const shortcutCards = document.querySelectorAll('.shortcut-card[draggable="true"]');
    
    shortcutCards.forEach(card => {
        // Butonlara tıklandığında drag'i engelle
        const actionButtons = card.querySelectorAll('.action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                card.draggable = false;
                // Kısa bir süre sonra tekrar etkinleştir
                setTimeout(() => {
                    card.draggable = true;
                }, 100);
            });
        });
        
        // Drag başladığında
        card.addEventListener('dragstart', (e) => {
            // Eğer buton tıklanmışsa drag'i iptal et
            if (e.target.closest('.action-btn')) {
                e.preventDefault();
                return false;
            }
            
            draggedElement = card;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', card.innerHTML);
        });
        
        // Drag bittiğinde
        card.addEventListener('dragend', (e) => {
            card.classList.remove('dragging');
            // Tüm kartlardan drag-over stillerini kaldır
            document.querySelectorAll('.shortcut-card').forEach(c => {
                c.classList.remove('drag-over');
            });
            draggedElement = null;
            draggedOverElement = null;
        });
        
        // Üzerine gelindiğinde
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (draggedElement && draggedElement !== card) {
                card.classList.add('drag-over');
                draggedOverElement = card;
            }
        });
        
        // Üzerinden çıkıldığında
        card.addEventListener('dragleave', (e) => {
            card.classList.remove('drag-over');
        });
        
        // Bırakıldığında
        card.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (draggedElement && draggedElement !== card) {
                // DOM'da sıralamayı değiştir
                const allCards = Array.from(shortcutsGrid.querySelectorAll('.shortcut-card'));
                const draggedIndex = allCards.indexOf(draggedElement);
                const targetIndex = allCards.indexOf(card);
                
                if (draggedIndex < targetIndex) {
                    shortcutsGrid.insertBefore(draggedElement, card.nextSibling);
                } else {
                    shortcutsGrid.insertBefore(draggedElement, card);
                }
                
                // Yeni sıralamayı al ve server'a gönder
                saveShortcutsOrder();
            }
            
            card.classList.remove('drag-over');
        });
    });
}

// Kısayolların sırasını kaydet
async function saveShortcutsOrder() {
    const allCards = Array.from(shortcutsGrid.querySelectorAll('.shortcut-card'));
    const shortcutIds = allCards.map(card => parseInt(card.dataset.shortcutId));
    
    try {
        await window.electronAPI.reorderShortcutsInPage(currentPageId, shortcutIds);
        // Sayfaları yeniden yükle (güncel sıralamayı almak için)
        await loadPages();
    } catch (error) {
        console.error('Kısayol sıralaması kaydedilemedi:', error);
        // Hata durumunda sayfayı yeniden yükle
        await loadPages();
    }
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
                <p>${window.i18n.t('devices.noTrustedDevices')}</p>
                <small>${window.i18n.t('devices.addFromMobile')}</small>
            </div>
        `;
        return;
    }
    
    const currentLang = window.i18n.getCurrentLanguage();
    const locale = currentLang === 'tr' ? 'tr-TR' : currentLang === 'de' ? 'de-DE' : 'en-US';
    
    trustedDevicesList.innerHTML = trustedDevices.map(device => `
        <div class="device-card">
            <div class="device-info">
                <h3>📱 ${device.name}</h3>
                <p>${device.id}</p>
                <small>${new Date(device.addedAt).toLocaleDateString(locale)}</small>
            </div>
            <button class="btn btn-danger" onclick="removeTrustedDevice('${device.id}')">
                ${window.i18n.t('devices.remove')}
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
        document.getElementById('statusText').textContent = window.i18n.t('status.active');
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
                <p>${window.i18n.t('devices.noActiveConnections')}</p>
                <small>${window.i18n.t('devices.connectFromMobile')}</small>
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
                    ${client.connected ? '🟢 ' + window.i18n.t('status.active') : '🔴 ' + window.i18n.t('status.waiting')}
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
        document.getElementById('modalTitle').textContent = window.i18n.t('modal.editShortcut');
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
        document.getElementById('modalTitle').textContent = window.i18n.t('modal.newShortcut');
        shortcutForm.reset();
        recordedKeys = [];
        document.querySelector('input[name="actionType"][value="keys"]').checked = true;
        document.getElementById('keysGroup').style.display = 'block';
        document.getElementById('appGroup').style.display = 'none';
        hideIconPreview();
    }
    
    shortcutModal.classList.add('active');
    
    // Modal açıldıktan sonra ilk input'a focus yap (hem yeni hem düzenle için)
    // requestAnimationFrame kullanarak DOM güncellemesinin tamamlanmasını bekle
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const labelInput = document.getElementById('labelInput');
            if (labelInput) {
                labelInput.focus();
                labelInput.select(); // Düzenlerken tüm metni seç
            }
        });
    });
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
        await showAlert(window.i18n.t('alerts.missingInfo'), window.i18n.t('alerts.pleaseSelectKeys'), '⚠️');
        return;
    }
    
    if (actionType === 'app' && !appPath) {
        await showAlert(window.i18n.t('alerts.missingInfo'), window.i18n.t('alerts.pleaseSelectApp'), '⚠️');
        return;
    }
    
    if (actionType === 'both' && (keys.length === 0 || !appPath)) {
        await showAlert(window.i18n.t('alerts.missingInfo'), window.i18n.t('alerts.pleaseSelectBoth'), '⚠️');
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
        btn.textContent = '⏸️ ' + window.i18n.t('modal.recordKeys').replace('🎹 ', '').replace('🎹', '');
        btn.style.background = 'var(--accent-red)';
        recordedKeys = [];
        document.getElementById('keysDisplay').value = window.i18n.t('modal.keysPlaceholder');
    } else {
        btn.textContent = window.i18n.t('modal.recordKeys');
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
    const confirmed = await showConfirm(
        window.i18n.t('confirm.deleteShortcut'), 
        window.i18n.t('confirm.deleteShortcutMessage'), 
        '🗑️'
    );
    
    if (!confirmed) {
        return;
    }
    
    await window.electronAPI.deleteShortcutFromPage(currentPageId, id);
    await loadPages();
}

// Device actions
async function removeTrustedDevice(deviceId) {
    const confirmed = await showConfirm(
        window.i18n.t('confirm.removeDevice'), 
        window.i18n.t('confirm.removeDeviceMessage'), 
        '📱'
    );
    
    if (!confirmed) {
        return;
    }
    
    await window.electronAPI.removeTrustedDevice(deviceId);
    await loadTrustedDevices();
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
        await showAlert(window.i18n.t('alerts.error'), window.i18n.t('alerts.appSelectionError'), '❌');
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
        await showAlert(window.i18n.t('alerts.error'), window.i18n.t('alerts.iconSelectionError'), '❌');
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
    await showAlert(window.i18n.t('alerts.success'), window.i18n.t('alerts.deviceNameSaved', { name }), '✅');
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

// Custom Confirm Dialog
function showConfirm(title, message, icon = '⚠️') {
    return new Promise((resolve) => {
        confirmResolve = resolve;
        
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmIcon').textContent = icon;
        
        // Buton metnini dinamik yapma
        const okBtn = document.getElementById('confirmOkBtn');
        if (title.includes(window.i18n.t('confirm.deleteShortcut')) || title.includes(window.i18n.t('confirm.deletePage'))) {
            okBtn.textContent = window.i18n.t('confirm.yesDelete');
            okBtn.className = 'btn btn-danger';
        } else {
            okBtn.textContent = window.i18n.t('confirm.yes');
            okBtn.className = 'btn btn-primary';
        }
        
        confirmModal.classList.add('active');
        
        // ESC tuşu ile iptal
        const escHandler = (e) => {
            if (e.key === 'Escape' && confirmModal.classList.contains('active')) {
                handleConfirmResponse(false);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    });
}

// Custom Alert Dialog (sadece bilgilendirme için)
function showAlert(title, message, icon = 'ℹ️') {
    return new Promise((resolve) => {
        confirmResolve = resolve;
        
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmIcon').textContent = icon;
        
        // Alert için sadece Tamam butonu göster
        const okBtn = document.getElementById('confirmOkBtn');
        okBtn.textContent = window.i18n.t('confirm.ok');
        okBtn.className = 'btn btn-primary';
        
        // İptal butonunu gizle
        const cancelBtn = document.getElementById('confirmCancelBtn');
        cancelBtn.style.display = 'none';
        
        confirmModal.classList.add('active');
        
        // ESC tuşu ile kapat
        const escHandler = (e) => {
            if (e.key === 'Escape' && confirmModal.classList.contains('active')) {
                handleConfirmResponse(true);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    });
}

function handleConfirmResponse(result) {
    confirmModal.classList.remove('active');
    
    // İptal butonunu tekrar göster (alert'ten sonra)
    const cancelBtn = document.getElementById('confirmCancelBtn');
    cancelBtn.style.display = '';
    
    if (confirmResolve) {
        confirmResolve(result);
        confirmResolve = null;
    }
}

// Hedef uygulama seçme
async function selectTargetApp() {
    try {
        // Önce kullanıcıya seçenek sun
        const choice = await showConfirm(
            window.i18n.t('appSelection.title'), 
            window.i18n.t('alerts.appSelectionChoice'),
            '🖥️'
        );
        
        if (choice) {
            // Çalışan uygulamalardan seç
            await selectFromRunningApps();
        } else {
            // Dosya seçici ile .exe seç
            await selectExeFile();
        }
    } catch (error) {
        console.error('Hedef uygulama seçimi hatası:', error);
        await showAlert(window.i18n.t('alerts.error'), window.i18n.t('alerts.targetAppSelectionError', { error: error.message }), '❌');
    }
}

// Çalışan uygulamalardan seç
async function selectFromRunningApps() {
    try {
        const result = await window.electronAPI.selectTargetApp();
        if (result.canceled) {
            if (result.message) {
                await showAlert(window.i18n.t('alerts.warning'), result.message, '⚠️');
            }
            return;
        }
        
        const windows = result.windows;
        if (!windows || windows.length === 0) {
            await showAlert(window.i18n.t('alerts.warning'), window.i18n.t('alerts.noRunningApps'), '⚠️');
            return;
        }
        
        // Modal ile liste göster
        showAppSelectionModal(windows);
    } catch (error) {
        console.error('Çalışan uygulama seçimi hatası:', error);
        await showAlert(window.i18n.t('alerts.error'), window.i18n.t('alerts.listError', { error: error.message }), '❌');
    }
}

// Dosya seçici ile .exe seç
async function selectExeFile() {
    try {
        const result = await window.electronAPI.selectApp();
        if (result.canceled) return;
        
        // Dosya yolundan sadece exe adını al (hem / hem \ destekle)
        const exeName = result.appPath.replace(/\\/g, '/').split('/').pop(); // Son kısmı al (örn: chrome.exe)
        
        selectedPageTargetApp = exeName;
        
        // UI'ı güncelle
        document.getElementById('pageTargetAppInput').value = exeName;
        document.getElementById('selectedTargetApp').textContent = `✅ ${exeName} (Dosyadan seçildi)`;
        document.getElementById('selectedTargetApp').style.color = '#4CAF50';
        document.getElementById('clearTargetAppBtn').style.display = 'inline-block';
        
        console.log('✅ Hedef uygulama seçildi (dosyadan):', exeName);
    } catch (error) {
        console.error('Exe dosyası seçimi hatası:', error);
        await showAlert(window.i18n.t('alerts.error'), window.i18n.t('alerts.fileSelectionError', { error: error.message }), '❌');
    }
}

// App selection modal göster
function showAppSelectionModal(windows) {
    // Modal elementi oluştur (eğer yoksa)
    let modal = document.getElementById('appSelectionModal');
    if (!modal) {
        // Modal HTML'de yok, dinamik oluştur
        modal = document.createElement('div');
        modal.id = 'appSelectionModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${window.i18n.t('appSelection.title')}</h2>
                    <button class="close-btn" id="closeAppSelectionBtn">&times;</button>
                </div>
                <div class="modal-body">
                    <p>${window.i18n.t('appSelection.message')}</p>
                    <div id="appListContainer" class="app-list"></div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" id="cancelAppSelectionBtn">${window.i18n.t('appSelection.cancel')}</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Event listeners
        document.getElementById('closeAppSelectionBtn').addEventListener('click', closeAppSelectionModal);
        document.getElementById('cancelAppSelectionBtn').addEventListener('click', closeAppSelectionModal);
    }
    
    // Liste oluştur
    const listContainer = document.getElementById('appListContainer');
    listContainer.innerHTML = '';
    
    windows.forEach((win, index) => {
        const item = document.createElement('div');
        item.className = 'app-list-item';
        item.innerHTML = `
            <div class="app-info">
                <strong>${win.exeName}</strong>
                <small>${win.title}</small>
            </div>
        `;
        item.style.cursor = 'pointer';
        item.style.padding = '12px';
        item.style.border = '1px solid #444';
        item.style.borderRadius = '8px';
        item.style.marginBottom = '8px';
        item.style.transition = 'all 0.2s';
        
        item.addEventListener('mouseenter', () => {
            item.style.backgroundColor = '#2a2a2a';
            item.style.borderColor = '#1F6FEB';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.backgroundColor = '';
            item.style.borderColor = '#444';
        });
        
        item.addEventListener('click', () => {
            selectAppFromModal(win);
            closeAppSelectionModal();
        });
        
        listContainer.appendChild(item);
    });
    
    modal.classList.add('active');
}

function closeAppSelectionModal() {
    const modal = document.getElementById('appSelectionModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function selectAppFromModal(app) {
    selectedPageTargetApp = app.exeName;
    
    // UI'ı güncelle
    document.getElementById('pageTargetAppInput').value = app.exeName;
    document.getElementById('selectedTargetApp').textContent = `✅ ${app.exeName} - ${app.title}`;
    document.getElementById('selectedTargetApp').style.color = '#4CAF50';
    document.getElementById('clearTargetAppBtn').style.display = 'inline-block';
    
    console.log('✅ Hedef uygulama seçildi:', app.exeName);
}

function clearTargetApp() {
    selectedPageTargetApp = null;
    clearTargetAppUI();
}

function clearTargetAppUI() {
    document.getElementById('pageTargetAppInput').value = '';
    document.getElementById('selectedTargetApp').textContent = '';
    document.getElementById('clearTargetAppBtn').style.display = 'none';
}

