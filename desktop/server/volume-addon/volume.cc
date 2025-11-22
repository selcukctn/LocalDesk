#include <napi.h>

#ifdef _WIN32
#include <windows.h>
#include <mmdeviceapi.h>
#include <endpointvolume.h>
#include <comdef.h>
#include <comutil.h>

#pragma comment(lib, "ole32.lib")
#pragma comment(lib, "oleaut32.lib")

// COM interface GUID'leri
const CLSID CLSID_MMDeviceEnumerator = __uuidof(MMDeviceEnumerator);
const IID IID_IMMDeviceEnumerator = __uuidof(IMMDeviceEnumerator);
const IID IID_IAudioEndpointVolume = __uuidof(IAudioEndpointVolume);

// Ses seviyesini al
Napi::Value GetVolume(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    HRESULT hr = CoInitializeEx(NULL, COINIT_APARTMENTTHREADED);
    if (FAILED(hr)) {
        Napi::Error::New(env, "COM başlatılamadı").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    float volume = 50.0f;
    bool success = false;
    
    try {
        // MMDeviceEnumerator oluştur
        IMMDeviceEnumerator* pEnumerator = NULL;
        hr = CoCreateInstance(
            CLSID_MMDeviceEnumerator,
            NULL,
            CLSCTX_ALL,
            IID_IMMDeviceEnumerator,
            (void**)&pEnumerator
        );
        
        if (SUCCEEDED(hr)) {
            // Varsayılan ses cihazını al
            IMMDevice* pDevice = NULL;
            hr = pEnumerator->GetDefaultAudioEndpoint(eRender, eConsole, &pDevice);
            
            if (SUCCEEDED(hr)) {
                // IAudioEndpointVolume interface'ini al
                IAudioEndpointVolume* pEndpointVolume = NULL;
                hr = pDevice->Activate(IID_IAudioEndpointVolume, CLSCTX_ALL, NULL, (void**)&pEndpointVolume);
                
                if (SUCCEEDED(hr)) {
                    // Ses seviyesini al (0.0 - 1.0 arası)
                    hr = pEndpointVolume->GetMasterVolumeLevelScalar(&volume);
                    
                    if (SUCCEEDED(hr)) {
                        volume = volume * 100.0f; // 0-100 arasına çevir
                        success = true;
                    }
                    
                    pEndpointVolume->Release();
                }
                
                pDevice->Release();
            }
            
            pEnumerator->Release();
        }
    } catch (...) {
        // Hata durumunda varsayılan değer
    }
    
    CoUninitialize();
    
    Napi::Object result = Napi::Object::New(env);
    result.Set("volume", Napi::Number::New(env, volume));
    result.Set("success", Napi::Boolean::New(env, success));
    
    return result;
}

// Ses seviyesini ayarla
Napi::Value SetVolume(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Ses seviyesi (0-100) bekleniyor").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    float volume = info[0].As<Napi::Number>().FloatValue();
    
    // 0-100 arasına sınırla
    if (volume < 0.0f) volume = 0.0f;
    if (volume > 100.0f) volume = 100.0f;
    
    // 0.0-1.0 arasına normalize et
    float normalizedVolume = volume / 100.0f;
    
    HRESULT hr = CoInitializeEx(NULL, COINIT_APARTMENTTHREADED);
    if (FAILED(hr)) {
        Napi::Error::New(env, "COM başlatılamadı").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    bool success = false;
    
    try {
        // MMDeviceEnumerator oluştur
        IMMDeviceEnumerator* pEnumerator = NULL;
        hr = CoCreateInstance(
            CLSID_MMDeviceEnumerator,
            NULL,
            CLSCTX_ALL,
            IID_IMMDeviceEnumerator,
            (void**)&pEnumerator
        );
        
        if (SUCCEEDED(hr)) {
            // Varsayılan ses cihazını al
            IMMDevice* pDevice = NULL;
            hr = pEnumerator->GetDefaultAudioEndpoint(eRender, eConsole, &pDevice);
            
            if (SUCCEEDED(hr)) {
                // IAudioEndpointVolume interface'ini al
                IAudioEndpointVolume* pEndpointVolume = NULL;
                hr = pDevice->Activate(IID_IAudioEndpointVolume, CLSCTX_ALL, NULL, (void**)&pEndpointVolume);
                
                if (SUCCEEDED(hr)) {
                    // Ses seviyesini ayarla
                    hr = pEndpointVolume->SetMasterVolumeLevelScalar(normalizedVolume, NULL);
                    
                    if (SUCCEEDED(hr)) {
                        success = true;
                    }
                    
                    pEndpointVolume->Release();
                }
                
                pDevice->Release();
            }
            
            pEnumerator->Release();
        }
    } catch (...) {
        // Hata durumunda
    }
    
    CoUninitialize();
    
    Napi::Object result = Napi::Object::New(env);
    result.Set("success", Napi::Boolean::New(env, success));
    
    return result;
}

// Sesi kapat/aç
Napi::Value SetMute(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsBoolean()) {
        Napi::TypeError::New(env, "Boolean (mute durumu) bekleniyor").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    BOOL mute = info[0].As<Napi::Boolean>().Value() ? TRUE : FALSE;
    
    HRESULT hr = CoInitializeEx(NULL, COINIT_APARTMENTTHREADED);
    if (FAILED(hr)) {
        Napi::Error::New(env, "COM başlatılamadı").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    bool success = false;
    
    try {
        // MMDeviceEnumerator oluştur
        IMMDeviceEnumerator* pEnumerator = NULL;
        hr = CoCreateInstance(
            CLSID_MMDeviceEnumerator,
            NULL,
            CLSCTX_ALL,
            IID_IMMDeviceEnumerator,
            (void**)&pEnumerator
        );
        
        if (SUCCEEDED(hr)) {
            // Varsayılan ses cihazını al
            IMMDevice* pDevice = NULL;
            hr = pEnumerator->GetDefaultAudioEndpoint(eRender, eConsole, &pDevice);
            
            if (SUCCEEDED(hr)) {
                // IAudioEndpointVolume interface'ini al
                IAudioEndpointVolume* pEndpointVolume = NULL;
                hr = pDevice->Activate(IID_IAudioEndpointVolume, CLSCTX_ALL, NULL, (void**)&pEndpointVolume);
                
                if (SUCCEEDED(hr)) {
                    // Mute durumunu ayarla
                    hr = pEndpointVolume->SetMute(mute, NULL);
                    
                    if (SUCCEEDED(hr)) {
                        success = true;
                    }
                    
                    pEndpointVolume->Release();
                }
                
                pDevice->Release();
            }
            
            pEnumerator->Release();
        }
    } catch (...) {
        // Hata durumunda
    }
    
    CoUninitialize();
    
    Napi::Object result = Napi::Object::New(env);
    result.Set("success", Napi::Boolean::New(env, success));
    
    return result;
}

// Mute durumunu al
Napi::Value GetMute(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    HRESULT hr = CoInitializeEx(NULL, COINIT_APARTMENTTHREADED);
    if (FAILED(hr)) {
        Napi::Error::New(env, "COM başlatılamadı").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    BOOL mute = FALSE;
    bool success = false;
    
    try {
        // MMDeviceEnumerator oluştur
        IMMDeviceEnumerator* pEnumerator = NULL;
        hr = CoCreateInstance(
            CLSID_MMDeviceEnumerator,
            NULL,
            CLSCTX_ALL,
            IID_IMMDeviceEnumerator,
            (void**)&pEnumerator
        );
        
        if (SUCCEEDED(hr)) {
            // Varsayılan ses cihazını al
            IMMDevice* pDevice = NULL;
            hr = pEnumerator->GetDefaultAudioEndpoint(eRender, eConsole, &pDevice);
            
            if (SUCCEEDED(hr)) {
                // IAudioEndpointVolume interface'ini al
                IAudioEndpointVolume* pEndpointVolume = NULL;
                hr = pDevice->Activate(IID_IAudioEndpointVolume, CLSCTX_ALL, NULL, (void**)&pEndpointVolume);
                
                if (SUCCEEDED(hr)) {
                    // Mute durumunu al
                    hr = pEndpointVolume->GetMute(&mute);
                    
                    if (SUCCEEDED(hr)) {
                        success = true;
                    }
                    
                    pEndpointVolume->Release();
                }
                
                pDevice->Release();
            }
            
            pEnumerator->Release();
        }
    } catch (...) {
        // Hata durumunda
    }
    
    CoUninitialize();
    
    Napi::Object result = Napi::Object::New(env);
    result.Set("mute", Napi::Boolean::New(env, mute == TRUE));
    result.Set("success", Napi::Boolean::New(env, success));
    
    return result;
}

// Modül başlatma
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "getVolume"), Napi::Function::New(env, GetVolume));
    exports.Set(Napi::String::New(env, "setVolume"), Napi::Function::New(env, SetVolume));
    exports.Set(Napi::String::New(env, "setMute"), Napi::Function::New(env, SetMute));
    exports.Set(Napi::String::New(env, "getMute"), Napi::Function::New(env, GetMute));
    return exports;
}

NODE_API_MODULE(volume, Init)

#else
// Windows dışı platformlar için dummy implementation

Napi::Value GetVolume(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Object result = Napi::Object::New(env);
    result.Set("volume", Napi::Number::New(env, 50.0));
    result.Set("success", Napi::Boolean::New(env, false));
    return result;
}

Napi::Value SetVolume(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Object result = Napi::Object::New(env);
    result.Set("success", Napi::Boolean::New(env, false));
    return result;
}

Napi::Value SetMute(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Object result = Napi::Object::New(env);
    result.Set("success", Napi::Boolean::New(env, false));
    return result;
}

Napi::Value GetMute(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Object result = Napi::Object::New(env);
    result.Set("mute", Napi::Boolean::New(env, false));
    result.Set("success", Napi::Boolean::New(env, false));
    return result;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "getVolume"), Napi::Function::New(env, GetVolume));
    exports.Set(Napi::String::New(env, "setVolume"), Napi::Function::New(env, SetVolume));
    exports.Set(Napi::String::New(env, "setMute"), Napi::Function::New(env, SetMute));
    exports.Set(Napi::String::New(env, "getMute"), Napi::Function::New(env, GetMute));
    return exports;
}

NODE_API_MODULE(volume, Init)

#endif

