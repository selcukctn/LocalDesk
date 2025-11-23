import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import dgram from 'react-native-udp';
import Zeroconf from 'react-native-zeroconf';
import { Buffer } from 'buffer';

const UDP_PORT = 45454;
const DISCOVER_REQUEST = 'LOCALDESK_DISCOVER_REQUEST';
const DISCOVER_RESPONSE = 'LOCALDESK_DISCOVER_RESPONSE';
const DISCOVERY_INTERVAL = 5000; // 5 saniye

export const useDiscovery = () => {
  const [devices, setDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);

  // Refs for persistent references
  const udpSocketRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const localhostIntervalRef = useRef(null);
  const zeroconfRef = useRef(null);

  // Cihaz ekle veya güncelle
  const addOrUpdateDevice = useCallback((device) => {
    setDevices((prev) => {
      const existingIndex = prev.findIndex(d => d.id === device.id);

      if (existingIndex >= 0) {
        // Güncelle
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...device };
        return updated;
      } else {
        // Yeni ekle
        console.log('✅ Yeni cihaz bulundu:', device.name);
        return [...prev, device];
      }
    });
  }, []);

  // UDP Discovery Request Gönder
  const sendDiscoveryRequest = useCallback(() => {
    const socket = udpSocketRef.current;
    if (!socket) {
      console.warn('⚠️ UDP socket hazır değil');
      return;
    }

    try {
      const message = Buffer.from(DISCOVER_REQUEST);

      console.log('📡 Discovery request gönderiliyor...');

      // Broadcast adresine gönder
      socket.send(
        message,
        0,
        message.length,
        UDP_PORT,
        '255.255.255.255',
        (err) => {
          if (err) {
            console.error('Discovery request gönderme hatası:', err);
          } else {
            console.log('✅ Discovery request gönderildi');
          }
        }
      );
    } catch (err) {
      console.error('Discovery request hatası:', err);
    }
  }, []);

  // UDP Discovery
  const startUDPDiscovery = useCallback(() => {
    try {
      // Socket oluştur
      const socket = dgram.createSocket({ type: 'udp4' });
      udpSocketRef.current = socket;

      // Mesaj dinle
      socket.on('message', (msg, rinfo) => {
        try {
          const message = msg.toString();
          console.log('📨 UDP mesaj alındı:', message.substring(0, 50));

          if (message.includes(DISCOVER_RESPONSE)) {
            const response = JSON.parse(message);

            if (response.type === DISCOVER_RESPONSE) {
              console.log('✅ Desktop bulundu:', response.deviceName, rinfo.address);
              addOrUpdateDevice({
                id: response.deviceId,
                name: response.deviceName,
                type: response.deviceType,
                host: rinfo.address,
                port: response.port,
                discoveryMethod: 'udp',
                lastSeen: Date.now()
              });
            }
          }
        } catch (err) {
          console.warn('UDP mesaj ayrıştırma hatası:', err);
        }
      });

      socket.on('error', (err) => {
        console.error('UDP socket hatası:', err);
      });

      // Broadcast etkinleştir
      socket.bind(UDP_PORT, () => {
        socket.setBroadcast(true);
        console.log('✅ UDP socket hazır, broadcast etkin');

        // İlk taramayı hemen başlat
        setTimeout(() => {
          sendDiscoveryRequest();
        }, 500);

        // Periyodik tarama
        const interval = setInterval(() => {
          sendDiscoveryRequest();
        }, DISCOVERY_INTERVAL);

        scanIntervalRef.current = interval;
      });

    } catch (err) {
      console.error('UDP discovery başlatma hatası:', err);
      setError('UDP discovery başlatılamadı: ' + err.message);
    }
  }, [addOrUpdateDevice, sendDiscoveryRequest]);

  // mDNS Discovery
  const startMDNSDiscovery = useCallback(() => {
    try {
      const zeroconf = new Zeroconf();
      zeroconfRef.current = zeroconf;

      zeroconf.on('resolved', (service) => {
        console.log('🔍 mDNS servisi bulundu:', service.name, service.host);

        if (service.txt && service.txt.deviceId) {
          addOrUpdateDevice({
            id: service.txt.deviceId,
            name: service.name,
            type: service.txt.deviceType || 'desktop',
            host: service.host,
            port: service.port,
            discoveryMethod: 'mdns',
            lastSeen: Date.now()
          });
        }
      });

      zeroconf.on('error', (err) => {
        console.error('mDNS hatası:', err);
      });

      // Taramayı başlat
      zeroconf.scan('localdesk', 'tcp', 'local.');
      console.log('✅ mDNS taraması başlatıldı');

    } catch (err) {
      console.error('mDNS discovery başlatma hatası:', err);
      // mDNS başarısız olsa bile devam et (UDP yeterli)
    }
  }, [addOrUpdateDevice]);

  // Localhost discovery (Simulatör için)
  const checkLocalhost = useCallback(async () => {
    try {
      console.log('🔍 Localhost kontrol ediliyor (Simulatör modu)...');

      // iOS simulatör localhost, Android emulator 10.0.2.2 kullanır
      const localhostAddresses = Platform.OS === 'android'
        ? ['10.0.2.2', 'localhost', '127.0.0.1']
        : ['localhost', '127.0.0.1'];

      for (const host of localhostAddresses) {
        try {
          const response = await fetch(`http://${host}:3100/device-info`, {
            timeout: 2000
          });

          if (response.ok) {
            const deviceInfo = await response.json();
            console.log('✅ Localhost Desktop bulundu:', deviceInfo);

            addOrUpdateDevice({
              id: deviceInfo.id,
              name: `${deviceInfo.name} (Simulatör)`,
              type: deviceInfo.type,
              host: host,
              port: 3100,
              discoveryMethod: 'localhost',
              lastSeen: Date.now()
            });
            break;
          }
        } catch (err) {
          // Bu host çalışmıyor, devam et
          continue;
        }
      }
    } catch (err) {
      console.log('ℹ️ Localhost discovery başarısız (Normal ağ modunda beklenen)');
    }
  }, [addOrUpdateDevice]);

  // Discovery başlat
  const startDiscovery = useCallback(() => {
    console.log('🔍 Discovery başlatılıyor...');
    setIsScanning(true);
    setError(null);
    setDevices([]);

    // Her iki discovery metodunu başlat
    startUDPDiscovery();
    startMDNSDiscovery();

    // Localhost kontrolü (Simulatör için)
    checkLocalhost();

    // Periyodik localhost kontrolü
    const localhostInterval = setInterval(() => {
      checkLocalhost();
    }, DISCOVERY_INTERVAL);

    // Cleanup için interval'i sakla
    localhostIntervalRef.current = localhostInterval;
  }, [startUDPDiscovery, startMDNSDiscovery, checkLocalhost]);

  // Discovery durdur
  const stopDiscovery = useCallback(() => {
    console.log('🛑 Discovery durduruluyor...');
    setIsScanning(false);

    // UDP'yi kapat
    if (udpSocketRef.current) {
      try {
        udpSocketRef.current.close();
        udpSocketRef.current = null;
      } catch (err) {
        console.error('UDP kapatma hatası:', err);
      }
    }

    // UDP interval'i temizle
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    // Localhost interval'i temizle
    if (localhostIntervalRef.current) {
      clearInterval(localhostIntervalRef.current);
      localhostIntervalRef.current = null;
    }

    // mDNS'i durdur
    if (zeroconfRef.current) {
      try {
        zeroconfRef.current.stop();
        zeroconfRef.current = null;
      } catch (err) {
        console.error('mDNS durdurma hatası:', err);
      }
    }
  }, []);

  // Otomatik temizlik
  useEffect(() => {
    return () => {
      stopDiscovery();
    };
  }, [stopDiscovery]);

  // Eski cihazları temizle (30 saniye görünmeyen)
  useEffect(() => {
    if (!isScanning) return;

    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setDevices(prev =>
        prev.filter(device => now - device.lastSeen < 30000)
      );
    }, 10000); // 10 saniyede bir kontrol

    return () => clearInterval(cleanupInterval);
  }, [isScanning]);

  return {
    devices,
    isScanning,
    error,
    startDiscovery,
    stopDiscovery
  };
};
