#include <napi.h>

#ifdef _WIN32
#include <windows.h>
#include <winuser.h>

// Windows Miracast/WiDi receiver'ı etkinleştirme
// Registry kullanarak Miracast receiver özelliğini etkinleştiriyoruz

// Miracast receiver'ı etkinleştir
Napi::Value EnableMiracastReceiver(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Object result = Napi::Object::New(env);
    
    // Miracast receiver'ı etkinleştirmek için Registry kullanıyoruz
        // Windows 10/11'de Miracast receiver özelliği varsayılan olarak kapalıdır
        HKEY hKey;
        LONG regResult;
        
        // Registry path: HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\WirelessDisplay
        regResult = RegOpenKeyExA(
            HKEY_LOCAL_MACHINE,
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WirelessDisplay",
            0,
            KEY_WRITE,
            &hKey
        );
        
        if (regResult == ERROR_SUCCESS) {
            // Miracast receiver'ı etkinleştir
            DWORD enableValue = 1;
            regResult = RegSetValueExA(
                hKey,
                "EnableMiracastReceiver",
                0,
                REG_DWORD,
                (BYTE*)&enableValue,
                sizeof(DWORD)
            );
            
            RegCloseKey(hKey);
            
            if (regResult == ERROR_SUCCESS) {
                result.Set("success", Napi::Boolean::New(env, true));
                result.Set("message", Napi::String::New(env, "Miracast receiver etkinleştirildi (yeniden başlatma gerekebilir)"));
            } else {
                result.Set("success", Napi::Boolean::New(env, false));
                result.Set("message", Napi::String::New(env, "Miracast receiver etkinleştirilemedi (yönetici hakları gerekebilir)"));
                result.Set("errorCode", Napi::Number::New(env, regResult));
            }
        } else {
            // Registry key yoksa oluştur
            regResult = RegCreateKeyExA(
                HKEY_LOCAL_MACHINE,
                "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WirelessDisplay",
                0,
                NULL,
                REG_OPTION_NON_VOLATILE,
                KEY_WRITE,
                NULL,
                &hKey,
                NULL
            );
            
            if (regResult == ERROR_SUCCESS) {
                DWORD enableValue = 1;
                regResult = RegSetValueExA(
                    hKey,
                    "EnableMiracastReceiver",
                    0,
                    REG_DWORD,
                    (BYTE*)&enableValue,
                    sizeof(DWORD)
                );
                
                RegCloseKey(hKey);
                
                if (regResult == ERROR_SUCCESS) {
                    result.Set("success", Napi::Boolean::New(env, true));
                    result.Set("message", Napi::String::New(env, "Miracast receiver etkinleştirildi (yeniden başlatma gerekebilir)"));
                } else {
                    result.Set("success", Napi::Boolean::New(env, false));
                    result.Set("message", Napi::String::New(env, "Miracast receiver etkinleştirilemedi"));
                    result.Set("errorCode", Napi::Number::New(env, regResult));
                }
            } else {
                result.Set("success", Napi::Boolean::New(env, false));
                result.Set("message", Napi::String::New(env, "Registry key oluşturulamadı (yönetici hakları gerekebilir)"));
                result.Set("errorCode", Napi::Number::New(env, regResult));
            }
        }
    
    return result;
}

// Miracast receiver durumunu kontrol et
Napi::Value IsMiracastReceiverEnabled(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Object result = Napi::Object::New(env);
    
    HKEY hKey;
    LONG regResult = RegOpenKeyExA(
        HKEY_LOCAL_MACHINE,
        "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WirelessDisplay",
        0,
        KEY_READ,
        &hKey
    );
    
    if (regResult == ERROR_SUCCESS) {
        DWORD value = 0;
        DWORD dataSize = sizeof(DWORD);
        DWORD type = REG_DWORD;
        
        regResult = RegQueryValueExA(
            hKey,
            "EnableMiracastReceiver",
            NULL,
            &type,
            (LPBYTE)&value,
            &dataSize
        );
        
        RegCloseKey(hKey);
        
        if (regResult == ERROR_SUCCESS && value == 1) {
            result.Set("enabled", Napi::Boolean::New(env, true));
            result.Set("message", Napi::String::New(env, "Miracast receiver etkin"));
        } else {
            result.Set("enabled", Napi::Boolean::New(env, false));
            result.Set("message", Napi::String::New(env, "Miracast receiver kapalı"));
        }
    } else {
        result.Set("enabled", Napi::Boolean::New(env, false));
        result.Set("message", Napi::String::New(env, "Miracast receiver durumu kontrol edilemedi"));
    }
    
    return result;
}

// Sanal display oluştur (Windows Display API ile - fallback)
Napi::Value CreateVirtualDisplay(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // Parametreleri al
    if (info.Length() < 2) {
        Napi::Error::New(env, "Width ve height parametreleri gerekli").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    int width = info[0].As<Napi::Number>().Int32Value();
    int height = info[1].As<Napi::Number>().Int32Value();
    
    Napi::Object result = Napi::Object::New(env);
    
    DEVMODE dm = {0};
    dm.dmSize = sizeof(DEVMODE);
    dm.dmDriverExtra = 0;
    
    // Mevcut display ayarlarını al
    if (EnumDisplaySettings(NULL, ENUM_CURRENT_SETTINGS, &dm)) {
        // Display ayarlarını değiştir (sadece mevcut display için)
        dm.dmPelsWidth = width;
        dm.dmPelsHeight = height;
        dm.dmFields = DM_PELSWIDTH | DM_PELSHEIGHT;
        
        // Display ayarlarını uygula
        LONG resultCode = ChangeDisplaySettings(&dm, CDS_UPDATEREGISTRY);
        
        if (resultCode == DISP_CHANGE_SUCCESSFUL) {
            result.Set("success", Napi::Boolean::New(env, true));
            result.Set("message", Napi::String::New(env, "Display ayarları güncellendi"));
        } else {
            result.Set("success", Napi::Boolean::New(env, false));
            result.Set("message", Napi::String::New(env, "Display ayarları güncellenemedi"));
            result.Set("errorCode", Napi::Number::New(env, resultCode));
        }
    } else {
        result.Set("success", Napi::Boolean::New(env, false));
        result.Set("message", Napi::String::New(env, "Display ayarları alınamadı"));
    }
    
    return result;
}

// Sanal display'i kaldır
Napi::Value RemoveVirtualDisplay(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    Napi::Object result = Napi::Object::New(env);
    
    // Display ayarlarını varsayılanlara döndür
    LONG resultCode = ChangeDisplaySettings(NULL, 0);
    
    if (resultCode == DISP_CHANGE_SUCCESSFUL) {
        result.Set("success", Napi::Boolean::New(env, true));
        result.Set("message", Napi::String::New(env, "Display ayarları varsayılanlara döndürüldü"));
    } else {
        result.Set("success", Napi::Boolean::New(env, false));
        result.Set("message", Napi::String::New(env, "Display ayarları değiştirilemedi"));
        result.Set("errorCode", Napi::Number::New(env, resultCode));
    }
    
    return result;
}

// Mevcut display sayısını al
Napi::Value GetDisplayCount(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    int count = 0;
    
    // Tüm display'leri say
    DISPLAY_DEVICE dd;
    dd.cb = sizeof(DISPLAY_DEVICE);
    
    for (int i = 0; EnumDisplayDevices(NULL, i, &dd, 0); i++) {
        if (dd.StateFlags & DISPLAY_DEVICE_ATTACHED_TO_DESKTOP) {
            count++;
        }
    }
    
    return Napi::Number::New(env, count);
}

// Modül başlatma
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(
        Napi::String::New(env, "enableMiracastReceiver"),
        Napi::Function::New(env, EnableMiracastReceiver)
    );
    exports.Set(
        Napi::String::New(env, "isMiracastReceiverEnabled"),
        Napi::Function::New(env, IsMiracastReceiverEnabled)
    );
    exports.Set(
        Napi::String::New(env, "createVirtualDisplay"),
        Napi::Function::New(env, CreateVirtualDisplay)
    );
    exports.Set(
        Napi::String::New(env, "removeVirtualDisplay"),
        Napi::Function::New(env, RemoveVirtualDisplay)
    );
    exports.Set(
        Napi::String::New(env, "getDisplayCount"),
        Napi::Function::New(env, GetDisplayCount)
    );
    return exports;
}

NODE_API_MODULE(display, Init)

#else
// Windows dışı platformlar için
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    return exports;
}

NODE_API_MODULE(display, Init)
#endif

