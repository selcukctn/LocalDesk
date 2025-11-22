import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  DEVICE_ID: '@localdesk_device_id',
  DEVICE_NAME: '@localdesk_device_name',
  TRUSTED_DEVICES: '@localdesk_trusted_devices'
};

const generateDeviceId = () => {
  return `mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const useConnection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [currentDevice, setCurrentDevice] = useState(null);
  const [pages, setPages] = useState([]); // Sayfalar listesi
  const [shortcuts, setShortcuts] = useState([]); // Geriye uyumluluk için
  const [error, setError] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  
  const socketRef = useRef(null);

  // Cihaz bilgilerini yükle
  useEffect(() => {
    loadDeviceInfo();
  }, []);

  const loadDeviceInfo = async () => {
    try {
      let deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
      let deviceName = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_NAME);
      
      if (!deviceId) {
        deviceId = generateDeviceId();
        await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
      }
      
      if (!deviceName) {
        deviceName = `${Platform.OS === 'ios' ? 'iPhone' : 'Android'} ${Platform.Version}`;
        await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_NAME, deviceName);
      }
      
      setDeviceInfo({ deviceId, deviceName });
      console.log('📱 Cihaz bilgileri yüklendi:', deviceName, deviceId);
    } catch (err) {
      console.error('Cihaz bilgileri yükleme hatası:', err);
    }
  };

  // Cihaza bağlan
  const connect = useCallback(async (device) => {
    if (!deviceInfo) {
      setError('Cihaz bilgileri yüklenmedi');
      return;
    }
    
    // Mevcut bağlantı varsa önce kapat
    if (socketRef.current) {
      console.log('⚠️ Mevcut bağlantı kapatılıyor...');
      try {
        socketRef.current.disconnect();
        socketRef.current = null;
      } catch (err) {
        console.error('Eski bağlantı kapatma hatası:', err);
      }
    }
    
    try {
      console.log('🔌 Bağlanılıyor:', device.name);
      setError(null);
      setCurrentDevice(device);
      
      // Socket.IO bağlantısı
      const socket = io(`http://${device.host}:${device.port}`, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });
      
      socketRef.current = socket;
      
      // Event listeners
      socket.on('connect', () => {
        console.log('✅ Socket.IO bağlandı');
        // Pairing isteği gönder
        requestPairing(socket);
      });
      
      socket.on('disconnect', () => {
        console.log('📴 Bağlantı kesildi');
        setIsConnected(false);
      });
      
      socket.on('pair-response', (response) => {
        handlePairingResponse(response, device);
      });
      
      // Yeni format: pages-update
      socket.on('pages-update', (updatedPages) => {
        console.log('📥 Sayfalar güncellendi:', updatedPages.length);
        setPages(updatedPages);
        
        // Geriye uyumluluk için ilk sayfanın shortcuts'larını da set et
        if (updatedPages.length > 0 && updatedPages[0].shortcuts) {
          setShortcuts(updatedPages[0].shortcuts);
        } else {
          setShortcuts([]);
        }
      });
      
      // Eski format: shortcuts-update (geriye uyumluluk)
      socket.on('shortcuts-update', (updatedShortcuts) => {
        console.log('📥 Kısayollar güncellendi (eski format):', updatedShortcuts.length);
        setShortcuts(updatedShortcuts);
        
        // Eğer pages boşsa, eski formatı pages'e çevir
        if (pages.length === 0) {
          setPages([{
            id: 'default',
            name: 'Genel',
            shortcuts: updatedShortcuts
          }]);
        }
      });
      
      socket.on('execute-result', (result) => {
        console.log('✅ Kısayol çalıştırıldı:', result);
      });
      
      socket.on('error', (err) => {
        console.error('❌ Socket hatası:', err);
        setError(err.message || 'Bağlantı hatası');
      });
      
      socket.on('connect_error', (err) => {
        console.error('❌ Bağlantı hatası:', err);
        setError('Sunucuya bağlanılamadı');
        setIsPairing(false);
      });
      
    } catch (err) {
      console.error('Bağlantı hatası:', err);
      setError('Bağlantı başlatılamadı');
    }
  }, [deviceInfo]);

  // Pairing isteği
  const requestPairing = useCallback((socket) => {
    if (!deviceInfo) return;
    
    setIsPairing(true);
    console.log('🔐 Pairing isteği gönderiliyor...');
    
    socket.emit('pair-request', {
      deviceId: deviceInfo.deviceId,
      deviceName: deviceInfo.deviceName,
      deviceType: Platform.OS
    });
  }, [deviceInfo]);

  // Pairing yanıtı
  const handlePairingResponse = useCallback(async (response, device) => {
    setIsPairing(false);
    
    if (response.success) {
      console.log('✅ Pairing başarılı:', response.message);
      setIsConnected(true);
      setError(null);
      
      // Güvenilir cihazlara ekle
      if (response.autoConnected !== true) {
        await addTrustedDevice(device);
      }
      
      // Sayfaları yükle (cihaz bilgisini geçir)
      await loadPages(device);
    } else {
      console.error('❌ Pairing reddedildi:', response.message);
      setError(response.message || 'Bağlantı reddedildi');
      disconnect();
    }
  }, [loadShortcuts, disconnect, addTrustedDevice]);

  // Güvenilir cihaz ekle
  const addTrustedDevice = async (device) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.TRUSTED_DEVICES);
      const trusted = stored ? JSON.parse(stored) : [];
      
      // Zaten ekli mi?
      if (!trusted.find(d => d.id === device.id)) {
        trusted.push({
          id: device.id,
          name: device.name,
          host: device.host,
          port: device.port,
          addedAt: Date.now()
        });
        
        await AsyncStorage.setItem(
          STORAGE_KEYS.TRUSTED_DEVICES,
          JSON.stringify(trusted)
        );
        
        console.log('✅ Güvenilir cihaza eklendi:', device.name);
      }
    } catch (err) {
      console.error('Güvenilir cihaz ekleme hatası:', err);
    }
  };

  // Sayfaları yükle
  const loadPages = useCallback(async (device) => {
    try {
      const targetDevice = device || currentDevice;
      if (!targetDevice) {
        console.warn('⚠️ Sayfa yüklemek için cihaz bilgisi yok');
        return;
      }
      
      console.log('📡 Sayfalar yükleniyor:', `http://${targetDevice.host}:${targetDevice.port}/pages`);
      
      // HTTP üzerinden sayfaları al
      const response = await fetch(
        `http://${targetDevice.host}:${targetDevice.port}/pages`,
        { timeout: 5000 }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPages(data);
      console.log('📥 Sayfalar yüklendi:', data.length, 'adet');
      
      // Geriye uyumluluk için ilk sayfanın shortcuts'larını da set et
      if (data.length > 0 && data[0].shortcuts) {
        setShortcuts(data[0].shortcuts);
      }
    } catch (err) {
      console.error('❌ Sayfa yükleme hatası:', err);
      setError('Sayfalar yüklenemedi: ' + err.message);
    }
  }, [currentDevice]);

  // Kısayolları yükle (geriye uyumluluk)
  const loadShortcuts = useCallback(async (device) => {
    await loadPages(device);
  }, [loadPages]);

  // Kısayol çalıştır
  const executeShortcut = useCallback((shortcut) => {
    if (!socketRef.current || !isConnected) {
      console.warn('⚠️ Bağlantı yok, kısayol çalıştırılamadı');
      return;
    }
    
    console.log('⌨️ Kısayol çalıştırılıyor:', shortcut.label);
    
    socketRef.current.emit('execute-shortcut', {
      shortcutId: shortcut.id,
      keys: shortcut.keys,
      appPath: shortcut.appPath,
      actionType: shortcut.actionType
    });
  }, [isConnected]);

  // Bağlantıyı kes
  const disconnect = useCallback(() => {
    console.log('🔌 Bağlantı kesiliyor...');
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setIsConnected(false);
    setCurrentDevice(null);
    setPages([]);
    setShortcuts([]);
  }, []);

  // Otomatik temizlik
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Socket'i dışarıya aç (remote screen için gerekli)
  const getSocket = useCallback(() => {
    return socketRef.current;
  }, []);

  return {
    isConnected,
    isPairing,
    currentDevice,
    pages,
    shortcuts,
    error,
    connect,
    disconnect,
    executeShortcut,
    deviceInfo,
    socket: socketRef.current,
    getSocket
  };
};

