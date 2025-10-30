# 📦 Local Desk - Detaylı Kurulum Kılavuzu

Bu döküman, Local Desk projesini sıfırdan kurmak için adım adım talimatlar içerir.

## 📋 İçindekiler

1. [Sistem Gereksinimleri](#sistem-gereksinimleri)
2. [Masaüstü Uygulaması Kurulumu](#masaüstü-uygulaması-kurulumu)
3. [Mobil Uygulama Kurulumu](#mobil-uygulama-kurulumu)
4. [Sorun Giderme](#sorun-giderme)

---

## 🖥️ Sistem Gereksinimleri

### Masaüstü (Windows)

- **İşletim Sistemi**: Windows 10/11 (64-bit)
- **Node.js**: 20.x veya üzeri
- **RAM**: En az 4GB
- **Build Tools**: Visual Studio 2019 Build Tools veya üzeri

### Mobil

**iOS:**
- macOS 12+ (Monterey veya üzeri)
- Xcode 14+
- CocoaPods
- iOS 13+ cihaz veya simulator

**Android:**
- Windows/macOS/Linux
- Android Studio 2023+
- JDK 17
- Android SDK (API 28+)
- Android 8+ cihaz veya emulator

---

## 🖥️ Masaüstü Uygulaması Kurulumu

### Adım 1: Node.js Kurulumu

1. [Node.js İndir](https://nodejs.org/)
2. LTS versiyonunu (20.x) indirin ve kurun
3. Kurulumu doğrulayın:

```bash
node --version
# v20.x.x olmalı

npm --version
# 10.x.x olmalı
```

### Adım 2: Build Tools Kurulumu

**Otomatik Kurulum:**
```bash
npm install --global windows-build-tools
```

**Manuel Kurulum:**
1. [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/) indirin
2. "Desktop development with C++" workload'unu seçin
3. Kurulumu tamamlayın

### Adım 3: Projeyi Klonlayın

```bash
git clone https://github.com/your-username/LocalDesk.git
cd LocalDesk
```

### Adım 4: Masaüstü Bağımlılıklarını Yükleyin

```bash
cd desktop
npm install
```

### Adım 5: C++ Addon'u Derleyin

```bash
cd server/keyboard-addon
npm install
cd ../..
```

Derleme başarılı olursa:
```
✓ Keyboard addon başarıyla derlendi
```

**Hata alırsanız:**
```bash
# node-gyp'i global olarak yükleyin
npm install -g node-gyp

# Yeniden deneyin
npm run rebuild
```

### Adım 6: Masaüstü Uygulamasını Başlatın

```bash
npm start
```

İlk çalıştırmada:
- Güvenlik duvarı izni isteyebilir → **İzin Ver**
- Electron penceresi açılır
- Sol üst köşede cihaz adınız görünür
- Durum: "Aktif" göstermelidir

---

## 📱 Mobil Uygulama Kurulumu

### iOS Kurulumu (macOS Gerekli)

#### Adım 1: Xcode Kurulumu

1. App Store'dan Xcode'u indirin
2. Xcode Command Line Tools'u kurun:

```bash
xcode-select --install
```

#### Adım 2: CocoaPods Kurulumu

```bash
sudo gem install cocoapods
```

#### Adım 3: React Native CLI Kurulumu

```bash
npm install -g react-native-cli
```

#### Adım 4: Mobil Bağımlılıkları Yükleyin

```bash
cd LocalDesk
npm install
```

#### Adım 5: iOS Pods'ları Yükleyin

```bash
cd ios
pod install
cd ..
```

#### Adım 6: iOS Uygulamasını Çalıştırın

**Simulator için:**
```bash
npm run ios
```

**Fiziksel cihaz için:**
1. Xcode'da `ios/LocalDesk.xcworkspace` dosyasını açın
2. Cihazınızı USB ile bağlayın
3. "Signing & Capabilities" sekmesinde Apple ID'nizi ekleyin
4. Xcode'dan Run edin veya:

```bash
npm run ios --device "iPhone Adı"
```

### Android Kurulumu (Tüm Platformlar)

#### Adım 1: JDK 17 Kurulumu

**Windows:**
```bash
# Chocolatey ile
choco install openjdk17

# Veya Oracle'dan manuel indirin
```

**macOS:**
```bash
brew install openjdk@17
```

**Linux:**
```bash
sudo apt install openjdk-17-jdk
```

Doğrulama:
```bash
java -version
# 17.x.x olmalı
```

#### Adım 2: Android Studio Kurulumu

1. [Android Studio İndir](https://developer.android.com/studio)
2. Kurulum sırasında:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device
   seçeneklerini işaretleyin

#### Adım 3: Android SDK Yapılandırması

Android Studio'da:
1. **SDK Manager** açın (⚙️ Settings > Appearance & Behavior > System Settings > Android SDK)
2. **SDK Platforms** sekmesinde:
   - Android 13.0 (API 33)
   - Android 12.0 (API 31)
   - Android 11.0 (API 30)
3. **SDK Tools** sekmesinde:
   - Android SDK Build-Tools
   - Android Emulator
   - Android SDK Platform-Tools

#### Adım 4: Environment Variables

**Windows:**
```bash
# ANDROID_HOME ayarlayın
setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"
setx PATH "%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools"
```

**macOS/Linux:**
```bash
# ~/.bash_profile veya ~/.zshrc dosyasına ekleyin
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

#### Adım 5: Mobil Bağımlılıkları Yükleyin

```bash
cd LocalDesk
npm install
```

#### Adım 6: Android Uygulamasını Çalıştırın

**Emulator için:**
1. Android Studio'dan AVD Manager açın
2. Bir emulator oluşturun ve başlatın
3. Komut:

```bash
npm run android
```

**Fiziksel cihaz için:**
1. Cihazda Geliştirici Seçeneklerini etkinleştirin:
   - Ayarlar > Telefon Hakkında > Yapı Numarası'na 7 kez tıklayın
2. USB Debugging'i aktif edin
3. USB ile bağlayın
4. Komut:

```bash
npm run android
```

---

## 🔧 İlk Yapılandırma

### Masaüstü İlk Kurulum

1. Uygulama ilk açıldığında:
   - Otomatik cihaz ID oluşturulur
   - Varsayılan kısayollar yüklenir
   - Discovery servisleri başlar

2. Güvenlik duvarı izni:
   - Windows Defender popup çıkabilir
   - "Özel ağlar" seçeneğini işaretleyin
   - **İzin Ver** tıklayın

3. Cihaz adını değiştirmek için:
   - ⚙️ Ayarlar sekmesine gidin
   - Cihaz Adı'nı düzenleyin
   - **Kaydet** tıklayın

### Mobil İlk Kurulum

1. Uygulama ilk açıldığında:
   - Otomatik cihaz ID oluşturulur
   - Ağ izni istenir → **İzin Ver**
   - Discovery başlar

2. WiFi'ye bağlı olduğunuzdan emin olun:
   - Ayarlar > WiFi
   - Masaüstü ile **aynı ağa** bağlanın

3. İlk bağlantı:
   - Cihaz listesinde masaüstünüzü görün
   - Tıklayın
   - Masaüstünde çıkan popup'tan **Onayla**
   - Bağlantı kurulur

---

## ❗ Sorun Giderme

### Masaüstü Sorunları

#### ❌ C++ Addon Derlenemiyor

**Hata:**
```
gyp ERR! stack Error: Could not find any Visual Studio installation
```

**Çözüm:**
```bash
# Visual Studio Build Tools kurun
npm install --global windows-build-tools

# Veya manuel: https://visualstudio.microsoft.com/downloads/
```

#### ❌ Port Zaten Kullanılıyor

**Hata:**
```
Error: listen EADDRINUSE: address already in use :::3100
```

**Çözüm:**
```bash
# Portu kullanan process'i bulun
netstat -ano | findstr :3100

# Process'i sonlandırın
taskkill /PID <PID> /F

# Veya uygulamayı yeniden başlatın
```

#### ❌ Klavye Addon Yüklenemiyor

**Hata:**
```
Error: Cannot find module './keyboard-addon/build/Release/keyboard'
```

**Çözüm:**
```bash
cd desktop/server/keyboard-addon
npm run rebuild
cd ../../..
npm start
```

### Mobil Sorunları

#### ❌ iOS Pod Install Hatası

**Hata:**
```
CocoaPods could not find compatible versions
```

**Çözüm:**
```bash
cd ios
pod repo update
pod install --repo-update
cd ..
```

#### ❌ Android Build Hatası

**Hata:**
```
FAILURE: Build failed with an exception
```

**Çözüm:**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

#### ❌ Metro Bundler Hatası

**Hata:**
```
error: bundling failed: Error: Unable to resolve module
```

**Çözüm:**
```bash
# Cache'i temizle
npm start -- --reset-cache

# node_modules'ü yeniden yükle
rm -rf node_modules
npm install
```

### Bağlantı Sorunları

#### ❌ Cihaz Bulunamıyor

**Kontrol Listesi:**
- [ ] Masaüstü uygulaması çalışıyor mu?
- [ ] Aynı WiFi ağında mısınız?
- [ ] Güvenlik duvarı portları (3100, 45454) açık mı?
- [ ] Router AP isolation kapalı mı?

**Çözüm:**
```bash
# Masaüstünde IP adresini kontrol edin
ipconfig
# veya
ip addr show

# Mobilde manuel bağlantı deneyin
# (Gelecek sürümde eklenecek)
```

#### ❌ Pairing Reddedildi

**Çözüm:**
1. Masaüstünde güvenilir cihazlar listesinden eski kayıtları silin
2. Mobilde:
```javascript
// AsyncStorage'ı temizle
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.clear();
```
3. Her iki uygulamayı yeniden başlatın

#### ❌ Kısayollar Gelmiyor

**Çözüm:**
```bash
# Masaüstünde shortcuts.json kontrol edin
cat desktop/server/data/shortcuts.json

# Yoksa manuel oluşturun
mkdir -p desktop/server/data
echo '[]' > desktop/server/data/shortcuts.json

# Uygulamayı yeniden başlatın
```

---

## ✅ Kurulum Doğrulama

### Masaüstü Test

1. Uygulama açıldığında:
   - ✅ Durum: "Aktif"
   - ✅ Cihaz ID görünüyor
   - ✅ En az 3 varsayılan kısayol var

2. Console'da (F12):
   - ✅ `✅ Local Desk server başlatıldı`
   - ✅ `✅ UDP socket dinliyor`
   - ✅ `✅ mDNS servisi yayınlanıyor`

### Mobil Test

1. Uygulama açıldığında:
   - ✅ Discovery ekranı görünüyor
   - ✅ "Aranıyor..." yazısı var
   - ✅ 5-10 saniye içinde masaüstü bulundu

2. Bağlantı sonrası:
   - ✅ Control ekranına geçti
   - ✅ Kısayollar grid'de görünüyor
   - ✅ Durum: "Bağlı"

3. Kısayol testi:
   - ✅ Bir butona bas
   - ✅ Masaüstünde tuş kombinasyonu çalıştı
   - ✅ Hedef uygulama tepki verdi

---

## 🎓 Sonraki Adımlar

Kurulum tamamlandıktan sonra:

1. 📖 [Ana README](README.md) dosyasını okuyun
2. 🎯 [Kullanım senaryolarını](README.md#-kullanım-senaryoları) inceleyin
3. 🔧 Kendi kısayollarınızı ekleyin
4. 🎨 Tema ve renkleri özelleştirin

---

## 💡 Yardım Alma

Sorun devam ediyorsa:

1. [GitHub Issues](https://github.com/your-username/LocalDesk/issues) açın
2. Aşağıdaki bilgileri ekleyin:
   - İşletim sistemi ve versiyon
   - Node.js versiyon
   - Hata mesajları (tam log)
   - Ekran görüntüleri

---

**🎉 Başarılı kurulum için tebrikler!**

