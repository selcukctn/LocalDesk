#include <napi.h>

#ifdef _WIN32
#include <windows.h>
#include <roapi.h>
#include <windows.media.control.h>
#include <wrl.h>
#include <wrl/wrappers/corewrappers.h>

using namespace Microsoft::WRL;
using namespace Microsoft::WRL::Wrappers;
using namespace ABI::Windows::Media::Control;
using namespace ABI::Windows::Media;
using namespace ABI::Windows::Foundation;

#pragma comment(lib, "windowsapp.lib")
#pragma comment(lib, "runtimeobject.lib")
#pragma comment(lib, "ole32.lib")
#pragma comment(lib, "oleaut32.lib")

// Helper: Async işlemi await et
template<typename T>
HRESULT Await(IAsyncOperation<T>* asyncOp, T* result) {
    if (!asyncOp) return E_INVALIDARG;
    
    ComPtr<IAsyncInfo> asyncInfo;
    HRESULT hr = asyncOp->QueryInterface(IID_PPV_ARGS(&asyncInfo));
    if (FAILED(hr)) return hr;
    
    AsyncStatus status;
    hr = asyncInfo->get_Status(&status);
    if (FAILED(hr)) return hr;
    
    // Eğer tamamlanmışsa sonucu al
    if (status == AsyncStatus::Completed) {
        hr = asyncOp->GetResults(result);
        return hr;
    }
    
    // Bekle (basit polling)
    while (status == AsyncStatus::Started) {
        Sleep(10);
        hr = asyncInfo->get_Status(&status);
        if (FAILED(hr)) return hr;
    }
    
    if (status == AsyncStatus::Completed) {
        hr = asyncOp->GetResults(result);
        return hr;
    }
    
    return E_FAIL;
}

// Medya durumunu al
Napi::Value GetMediaStatus(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // Windows Runtime'ı başlat
    HRESULT hr = RoInitialize(RO_INIT_MULTITHREADED);
    if (FAILED(hr)) {
        Napi::Object result = Napi::Object::New(env);
        result.Set("isPlaying", Napi::Boolean::New(env, false));
        result.Set("title", Napi::String::New(env, "Medya oynatıcı bulunamadı"));
        result.Set("artist", Napi::String::New(env, ""));
        result.Set("duration", Napi::Number::New(env, 0));
        result.Set("position", Napi::Number::New(env, 0));
        result.Set("success", Napi::Boolean::New(env, false));
        return result;
    }
    
    bool isPlaying = false;
    std::wstring title = L"";
    std::wstring artist = L"";
    int64_t duration = 0;
    int64_t position = 0;
    bool success = false;
    
    try {
        // SessionManager'ı al
        ComPtr<IGlobalSystemMediaTransportControlsSessionManagerStatics> sessionManagerStatics;
        hr = RoGetActivationFactory(
            HStringReference(L"Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager").Get(),
            IID_PPV_ARGS(&sessionManagerStatics)
        );
        
        if (SUCCEEDED(hr)) {
            ComPtr<IAsyncOperation<GlobalSystemMediaTransportControlsSessionManager*>> requestAsync;
            hr = sessionManagerStatics->RequestAsync(&requestAsync);
            
            if (SUCCEEDED(hr)) {
                ComPtr<IGlobalSystemMediaTransportControlsSessionManager> sessionManager;
                hr = Await(requestAsync.Get(), sessionManager.GetAddressOf());
                
                if (SUCCEEDED(hr) && sessionManager) {
                    ComPtr<IGlobalSystemMediaTransportControlsSession> currentSession;
                    hr = sessionManager->GetCurrentSession(&currentSession);
                    
                    if (SUCCEEDED(hr) && currentSession) {
                        // Media properties
                        ComPtr<IAsyncOperation<MusicDisplayProperties*>> mediaPropsAsync;
                        hr = currentSession->TryGetMediaPropertiesAsync(&mediaPropsAsync);
                        
                        if (SUCCEEDED(hr)) {
                            ComPtr<IMusicDisplayProperties> mediaProps;
                            hr = Await(mediaPropsAsync.Get(), mediaProps.GetAddressOf());
                            
                            if (SUCCEEDED(hr) && mediaProps) {
                                HString titleHString;
                                hr = mediaProps->get_Title(titleHString.GetAddressOf());
                                if (SUCCEEDED(hr) && titleHString) {
                                    UINT32 length;
                                    const wchar_t* titlePtr = titleHString.GetRawBuffer(&length);
                                    if (titlePtr) {
                                        title = std::wstring(titlePtr, length);
                                    }
                                }
                                
                                HString artistHString;
                                hr = mediaProps->get_Artist(artistHString.GetAddressOf());
                                if (SUCCEEDED(hr) && artistHString) {
                                    UINT32 length;
                                    const wchar_t* artistPtr = artistHString.GetRawBuffer(&length);
                                    if (artistPtr) {
                                        artist = std::wstring(artistPtr, length);
                                    }
                                }
                            }
                        }
                        
                        // Playback info
                        ComPtr<IGlobalSystemMediaTransportControlsSessionPlaybackInfo> playbackInfo;
                        hr = currentSession->get_PlaybackInfo(&playbackInfo);
                        
                        if (SUCCEEDED(hr) && playbackInfo) {
                            MediaPlaybackStatus status;
                            hr = playbackInfo->get_PlaybackStatus(&status);
                            if (SUCCEEDED(hr)) {
                                isPlaying = (status == MediaPlaybackStatus_Playing);
                            }
                        }
                        
                        // Timeline properties
                        ComPtr<IGlobalSystemMediaTransportControlsSessionTimelineProperties> timelineProps;
                        hr = currentSession->get_TimelineProperties(&timelineProps);
                        
                        if (SUCCEEDED(hr) && timelineProps) {
                            TimeSpan endTime, posTime;
                            hr = timelineProps->get_EndTime(&endTime);
                            if (SUCCEEDED(hr)) {
                                duration = endTime.Duration / 10000000; // 100-nanosecond units to seconds
                            }
                            
                            hr = timelineProps->get_Position(&posTime);
                            if (SUCCEEDED(hr)) {
                                position = posTime.Duration / 10000000;
                            }
                        }
                        
                        success = true;
                    }
                }
            }
        }
    } catch (...) {
        // Hata durumunda varsayılan değerler
    }
    
    RoUninitialize();
    
    // Wide string'i UTF-8'e çevir
    int titleLen = WideCharToMultiByte(CP_UTF8, 0, title.c_str(), -1, NULL, 0, NULL, NULL);
    char* titleUtf8 = new char[titleLen];
    WideCharToMultiByte(CP_UTF8, 0, title.c_str(), -1, titleUtf8, titleLen, NULL, NULL);
    
    int artistLen = WideCharToMultiByte(CP_UTF8, 0, artist.c_str(), -1, NULL, 0, NULL, NULL);
    char* artistUtf8 = new char[artistLen];
    WideCharToMultiByte(CP_UTF8, 0, artist.c_str(), -1, artistUtf8, artistLen, NULL, NULL);
    
    Napi::Object result = Napi::Object::New(env);
    result.Set("isPlaying", Napi::Boolean::New(env, isPlaying));
    result.Set("title", Napi::String::New(env, titleUtf8));
    result.Set("artist", Napi::String::New(env, artistUtf8));
    result.Set("duration", Napi::Number::New(env, duration));
    result.Set("position", Napi::Number::New(env, position));
    result.Set("success", Napi::Boolean::New(env, success));
    
    delete[] titleUtf8;
    delete[] artistUtf8;
    
    return result;
}

// Modül başlatma
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "getMediaStatus"), Napi::Function::New(env, GetMediaStatus));
    return exports;
}

NODE_API_MODULE(media, Init)

#else
// Windows dışı platformlar için dummy implementation

Napi::Value GetMediaStatus(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Object result = Napi::Object::New(env);
    result.Set("isPlaying", Napi::Boolean::New(env, false));
    result.Set("title", Napi::String::New(env, "Sadece Windows destekleniyor"));
    result.Set("artist", Napi::String::New(env, ""));
    result.Set("duration", Napi::Number::New(env, 0));
    result.Set("position", Napi::Number::New(env, 0));
    result.Set("success", Napi::Boolean::New(env, false));
    return result;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "getMediaStatus"), Napi::Function::New(env, GetMediaStatus));
    return exports;
}

NODE_API_MODULE(media, Init)

#endif

