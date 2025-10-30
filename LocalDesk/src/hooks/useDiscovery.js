import { useState, useEffect, useCallback } from 'react';
import dgram from 'react-native-udp';
import Zeroconf from 'react-native-zeroconf';

const UDP_PORT = 45454;
const DISCOVER_REQUEST = 'LOCALDESK_DISCOVER_REQUEST';
const DISCOVER_RESPONSE = 'LOCALDESK_DISCOVER_RESPONSE';
const DISCOVERY_INTERVAL = 5000; // 5 saniye

export const useDiscovery = () => {
  const [devices, setDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  
  const zeroconf = new Zeroconf();
  let udpSocket = null;
  let scanInterval = null;

  // UDP Discovery
  const startUDPDiscovery = useCallback(() => {
    try {
      // Socket oluştur
      udpSocket = dgram.createSocket({ type: 'udp4' });
      
      // Mesaj dinle
      udpSocket.on('message', (msg, rinfo) => {
        try {
          const message = msg.toString();
          
          if (message.includes(DISCOVER_RESPONSE)) {
            const response = JSON.parse(message);
            
            if (response.type === DISCOVER_RESPONSE) {
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
      
      // Broadcast etkinleştir
      udpSocket.bind(UDP_PORT, () => {
        udpSocket.setBroadcast(true);
        console.log('✅ UDP socket hazır');
        
        // İlk taramayı hemen başlat
        sendDiscoveryRequest();
        
        // Periyodik tarama
        scanInterval = setInterval(() => {
          sendDiscoveryRequest();
        }, DISCOVERY_INTERVAL);
      });
      
    } catch (err) {
      console.error('UDP discovery başlatma hatası:', err);
      setError('UDP discovery başlatılamadı');
    }
  }, []);

  // UDP Discovery Request Gönder
  const sendDiscoveryRequest = useCallback(() => {
    if (!udpSocket) return;
    
    try {
      const message = Buffer.from(DISCOVER_REQUEST);
      
      // Broadcast adresine gönder
      udpSocket.send(
        message,
        0,
        message.length,
        UDP_PORT,
        '255.255.255.255',
        (err) => {
          if (err) {
            console.error('Discovery request gönderme hatası:', err);
          } else {
            console.log('📡 Discovery request gönderildi');
          }
        }
      );
    } catch (err) {
      console.error('Discovery request hatası:', err);
    }
  }, [udpSocket]);

  // mDNS Discovery
  const startMDNSDiscovery = useCallback(() => {
    try {
      zeroconf.on('resolved', (service) => {
        console.log('🔍 mDNS servisi bulundu:', service.name);
        
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
  }, []);

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

  // Discovery başlat
  const startDiscovery = useCallback(() => {
    console.log('🔍 Discovery başlatılıyor...');
    setIsScanning(true);
    setError(null);
    setDevices([]);
    
    // Her iki discovery metodunu başlat
    startUDPDiscovery();
    startMDNSDiscovery();
  }, [startUDPDiscovery, startMDNSDiscovery]);

  // Discovery durdur
  const stopDiscovery = useCallback(() => {
    console.log('🛑 Discovery durduruluyor...');
    setIsScanning(false);
    
    // UDP'yi kapat
    if (udpSocket) {
      try {
        udpSocket.close();
        udpSocket = null;
      } catch (err) {
        console.error('UDP kapatma hatası:', err);
      }
    }
    
    // Interval'i temizle
    if (scanInterval) {
      clearInterval(scanInterval);
      scanInterval = null;
    }
    
    // mDNS'i durdur
    try {
      zeroconf.stop();
    } catch (err) {
      console.error('mDNS durdurma hatası:', err);
    }
  }, [udpSocket, scanInterval]);

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

