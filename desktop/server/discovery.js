const dgram = require('dgram');
const { Bonjour } = require('bonjour-service');

const UDP_PORT = 45454;
const DISCOVER_REQUEST = 'LOCALDESK_DISCOVER_REQUEST';
const DISCOVER_RESPONSE = 'LOCALDESK_DISCOVER_RESPONSE';

class DiscoveryService {
  constructor() {
    this.udpSocket = null;
    this.bonjour = null;
    this.bonjourService = null;
    this.port = null;
    this.deviceId = null;
    this.deviceName = null;
  }

  async start(httpPort, deviceId, deviceName) {
    this.port = httpPort;
    this.deviceId = deviceId;
    this.deviceName = deviceName;

    console.log('🔍 Discovery servisleri başlatılıyor...');

    // UDP Discovery
    await this.startUDPDiscovery();

    // mDNS (Bonjour)
    await this.startMDNS();

    console.log('✅ Discovery servisleri aktif');
  }

  async startUDPDiscovery() {
    return new Promise((resolve, reject) => {
      this.udpSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.udpSocket.on('error', (err) => {
        console.error('UDP socket hatası:', err);
        reject(err);
      });

      this.udpSocket.on('message', (msg, rinfo) => {
        const message = msg.toString();
        
        // Discovery isteği geldi mi?
        if (message.startsWith(DISCOVER_REQUEST)) {
          console.log('📡 Discovery isteği alındı:', rinfo.address);
          
          // Yanıt gönder
          const response = JSON.stringify({
            type: DISCOVER_RESPONSE,
            deviceId: this.deviceId,
            deviceName: this.deviceName,
            deviceType: 'desktop',
            port: this.port,
            timestamp: Date.now()
          });
          
          this.udpSocket.send(response, rinfo.port, rinfo.address, (err) => {
            if (err) {
              console.error('UDP yanıt gönderme hatası:', err);
            } else {
              console.log('✅ Discovery yanıtı gönderildi:', rinfo.address);
            }
          });
        }
      });

      this.udpSocket.on('listening', () => {
        const address = this.udpSocket.address();
        console.log(`✅ UDP socket dinliyor: ${address.address}:${address.port}`);
        
        // Broadcast'i etkinleştir
        this.udpSocket.setBroadcast(true);
        
        resolve();
      });

      this.udpSocket.bind(UDP_PORT);
    });
  }

  async startMDNS() {
    try {
      this.bonjour = new Bonjour();

      // mDNS servisi yayınla
      this.bonjourService = this.bonjour.publish({
        name: this.deviceName,
        type: 'localdesk',
        port: this.port,
        txt: {
          deviceId: this.deviceId,
          deviceType: 'desktop',
          version: '1.0.0'
        }
      });

      console.log('✅ mDNS servisi yayınlanıyor:', this.deviceName);
    } catch (error) {
      console.error('mDNS başlatma hatası:', error);
      // mDNS başarısız olsa bile devam et (UDP discovery yeterli olabilir)
    }
  }

  async stop() {
    console.log('🛑 Discovery servisleri durduruluyor...');

    if (this.udpSocket) {
      this.udpSocket.close();
      this.udpSocket = null;
    }

    if (this.bonjourService) {
      this.bonjourService.stop();
      this.bonjourService = null;
    }

    if (this.bonjour) {
      this.bonjour.destroy();
      this.bonjour = null;
    }

    console.log('✅ Discovery servisleri durduruldu');
  }

  // Lokal IP adreslerini al
  getLocalIPAddresses() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const results = [];

    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        // IPv4 ve harici adresleri al
        if (net.family === 'IPv4' && !net.internal) {
          results.push(net.address);
        }
      }
    }

    return results;
  }
}

const discovery = new DiscoveryService();
module.exports = discovery;

