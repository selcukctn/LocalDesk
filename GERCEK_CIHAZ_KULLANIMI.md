# Gerçek iPhone Cihazında Test Etme

## ⚠️ ÖNEMLİ: iOS Simulator UDP Broadcast Desteklemez!

LocalDesk uygulaması network discovery için UDP broadcast kullanır. 
iOS Simulator gerçek network interface'lere erişemediği için bu özellik simulator'da ÇALIŞMAZ.

## 📱 Gerçek Cihazda Çalıştırma Adımları

### 1. iPhone'unuzu Mac'e Bağlayın (USB)

### 2. iPhone'u Xcode'da Seçin

```bash
cd /Users/harunselcukcetin/Desktop/LocalDesk/LocalDesk/ios
xed .
```

- Xcode açıldığında üst menüden cihaz seçiminde "iPhone'unuzun adı" seçin
- Simulator yerine gerçek cihazınızı seçin

### 3. Entitlements Dosyasını Projeye Ekleyin

Xcode'da:
1. Sol menüde **LocalDesk** projesine sağ tıklayın
2. **Add Files to "LocalDesk"...** seçin
3. `LocalDesk/LocalDesk.entitlements` dosyasını seçin
4. ✅ **"Copy items if needed"** işaretleyin
5. ✅ **"LocalDesk" target'ını** seçin
6. **Add** butonuna basın

### 4. Build Settings'i Kontrol Edin

1. LocalDesk projesine tıklayın
2. **TARGETS** altında **LocalDesk**'i seçin
3. **Signing & Capabilities** sekmesine gidin
4. **Team** seçin (Apple Developer hesabınız)
5. ✅ **Automatically manage signing** işaretli olsun

### 5. Capabilities Ekleyin (İsteğe Bağlı)

Signing & Capabilities sekmesinde:
1. **+ Capability** butonuna basın
2. **"Network Extensions"** aratın ve ekleyin (isteğe bağlı)

### 6. iPhone ve Mac'in Aynı WiFi'da Olduğundan Emin Olun

- **Mac**: WiFi ayarlarından IP adresinizi kontrol edin (örn: 192.168.1.5)
- **iPhone**: Ayarlar > WiFi > Aynı ağa bağlı olmalı (örn: 192.168.1.10)

### 7. Uygulamayı Gerçek Cihazda Çalıştırın

Terminal'de:
```bash
cd /Users/harunselcukcetin/Desktop/LocalDesk/LocalDesk

# Önce metro'yu başlatın
npm start

# Başka bir terminalde gerçek cihaza deploy edin
npm run ios --device="iPhone'unuzun Adı"
```

VEYA Xcode'dan direkt **▶ Run** butonuna basın

### 8. İlk Çalıştırmada İzin Verin

iPhone'da ilk çalıştırmada şu izinleri verin:
- ✅ **"Local Network"** izni (Bu çok önemli!)
- ✅ Uygulama güvenilir geliştirici onayı (Ayarlar > Genel > VPN & Cihaz Yönetimi)

## 🔍 Beklenen Sonuç

Desktop çalışırken, iPhone'da discovery başlatınca şunu görmelisiniz:

```
🔍 Discovery başlatılıyor...
✅ UDP socket hazır, broadcast etkin
📡 Discovery request gönderiliyor...
✅ Discovery request gönderildi
📨 UDP mesaj alındı: {"type":"LOCALDESK_DISCOVER_RESPONSE"...
✅ Desktop bulundu: harun 192.168.1.X
```

## 🐛 Sorun Giderme

### "Could not find an iPhone" hatası
- iPhone'unuzu USB ile bağladığınızdan emin olun
- iPhone'da "Bu bilgisayara güven" deyin

### "Code signing failed" hatası
- Apple Developer hesabınızı Xcode'a ekleyin
- Signing & Capabilities'te Team seçin

### "Local Network Permission" popup çıkmıyor
- iPhone Ayarlar > LocalDesk > Local Network > ✅ Açık

### Hala bulamıyor
1. Her iki cihazın da aynı WiFi'da olduğunu kontrol edin
2. Desktop'tan iPhone IP'sine ping atın: `ping 192.168.1.X`
3. Router/Firewall'da cihazlar arası iletişim kapalı olabilir (AP Isolation)

