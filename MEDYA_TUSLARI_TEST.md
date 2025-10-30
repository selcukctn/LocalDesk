# 🎵 Medya Tuşları Test Rehberi

## ⚠️ Önemli Notlar

Medya tuşlarının çalışması için:
1. ✅ **Bir medya oynatıcı AÇIK olmalı** (Spotify, YouTube, VLC, Windows Media Player, vb.)
2. ✅ **Oynatıcıda bir medya oynatılıyor/duraklatılmış olmalı**
3. ✅ **Desktop uygulaması yeniden derlendi ve başlatıldı**

## 🧪 Test Adımları

### 1. PowerShell Test (Manuel)

Desktop klasöründen çalıştırın:
```powershell
.\test-media-key.ps1
```

**Beklenen:** Spotify/YouTube açıksa oynat/duraklat yapmalı

### 2. LocalDesk Test

1. **Desktop'u derleyin:**
```bash
cd desktop
npm run rebuild
npm start
```

2. **Spotify/YouTube'u açın ve bir şarkı başlatın**

3. **Desktop'ta yeni kısayol ekleyin:**
   - Etiket: `Medya Oynat/Duraklat`
   - Eylem Tipi: `⌨️ Klavye Kısayolu`
   - Tuşlar: `MEDIAPLAYPAUSE` yazın (🎹 Tuşları Kaydet'e basmadan direkt yazın)
   - İkon: `⏯️`
   - Renk: İstediğiniz renk
   - **Kaydet**

4. **Mobil'den bağlanın ve butona basın**

5. **Spotify/YouTube duraklamalı/oynatmalı!**

## 📋 Desteklenen Medya Tuşları

### Medya Kontrolleri
| Tuş Adı | Açıklama | Örnek Kullanım |
|---------|----------|----------------|
| `MEDIAPLAYPAUSE` | Oynat/Duraklat | Spotify, YouTube |
| `MEDIASTOP` | Durdur | Medya oynatıcılar |
| `MEDIANEXTTRACK` | Sonraki parça | Spotify, iTunes |
| `MEDIAPREVIOUSTRACK` | Önceki parça | Spotify, iTunes |

### Ses Kontrolleri
| Tuş Adı | Açıklama |
|---------|----------|
| `VOLUMEUP` | Ses artır |
| `VOLUMEDOWN` | Ses azalt |
| `VOLUMEMUTE` | Sessiz |

### Tarayıcı Tuşları
| Tuş Adı | Açıklama |
|---------|----------|
| `BROWSERHOME` | Ana sayfa |
| `BROWSERBACK` | Geri |
| `BROWSERFORWARD` | İleri |
| `BROWSERREFRESH` | Yenile |

## 🔧 Sorun Giderme

### ❌ "Çalışmıyor"

**1. Medya oynatıcı açık mı?**
- Spotify, YouTube, VLC, Windows Media Player vb. açık olmalı

**2. Ses sürücüleri düzgün mü?**
- Klavyenizdeki medya tuşları çalışıyor mu?
- Eğer klavyenizden de çalışmıyorsa, ses sürücülerinizi kontrol edin

**3. Derleme yapıldı mı?**
```bash
cd desktop
npm run rebuild
```

**4. Desktop yeniden başlatıldı mı?**
- Desktop uygulamasını kapatıp yeniden `npm start`

**5. Windows 10/11 mi?**
- Windows 7'de bazı medya tuşları çalışmayabilir

### ✅ Hangi Uygulamalar Destekliyor?

**Tam Destek:**
- ✅ Spotify (Desktop)
- ✅ YouTube (Chrome/Edge)
- ✅ VLC Media Player
- ✅ Windows Media Player
- ✅ iTunes
- ✅ Foobar2000
- ✅ AIMP

**Kısıtlı Destek:**
- ⚠️ Discord (sadece ses çağrılarında)
- ⚠️ Teams (sadece çağrılarında)

**Desteklenmez:**
- ❌ Web browser'da play/pause tuşu olmayan siteler
- ❌ Tam ekran oyunlar (oyun odağı alıyor)

## 💡 İpuçları

1. **Spotify Desktop kullanın** - Web versiyonu kadar iyi yanıt vermiyor
2. **Global medya kontrolü** - Windows 10/11'de "Ayarlar > Aygıtlar > Medya kontrolü" açık olmalı
3. **Tek medya uygulaması** - Aynı anda birden fazla medya uygulaması açıksa karışıklık olabilir

## 🎯 Örnek Kısayollar

### Spotify Kontrolü
```
Kısayol 1: ⏯️ Oynat/Duraklat - MEDIAPLAYPAUSE
Kısayol 2: ⏭️ Sonraki - MEDIANEXTTRACK
Kısayol 3: ⏮️ Önceki - MEDIAPREVIOUSTRACK
Kısayol 4: 🔇 Sessiz - VOLUMEMUTE
```

### YouTube Kontrolü (Chrome/Edge)
```
Kısayol 1: ⏯️ Oynat/Duraklat - MEDIAPLAYPAUSE
Kısayol 2: 🔊 Ses Artır - VOLUMEUP
Kısayol 3: 🔉 Ses Azalt - VOLUMEDOWN
```

## 📝 Teknik Detaylar

Windows'ta medya tuşları `KEYEVENTF_EXTENDEDKEY` flag'i ile gönderilir:

```cpp
// Key Down
input.ki.dwFlags = KEYEVENTF_EXTENDEDKEY;

// Key Up
input.ki.dwFlags = KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP;
```

Bu flag sayesinde Windows medya oynatıcılarına global mesaj gönderilir.

