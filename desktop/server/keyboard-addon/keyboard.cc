#include <napi.h>

#ifdef _WIN32
#include <windows.h>
#include <map>
#include <string>

// Klavye tuşlarının Virtual Key kodları
std::map<std::string, WORD> keyMap = {
    {"A", 0x41}, {"B", 0x42}, {"C", 0x43}, {"D", 0x44}, {"E", 0x45},
    {"F", 0x46}, {"G", 0x47}, {"H", 0x48}, {"I", 0x49}, {"J", 0x4A},
    {"K", 0x4B}, {"L", 0x4C}, {"M", 0x4D}, {"N", 0x4E}, {"O", 0x4F},
    {"P", 0x50}, {"Q", 0x51}, {"R", 0x52}, {"S", 0x53}, {"T", 0x54},
    {"U", 0x55}, {"V", 0x56}, {"W", 0x57}, {"X", 0x58}, {"Y", 0x59},
    {"Z", 0x5A},
    
    {"0", 0x30}, {"1", 0x31}, {"2", 0x32}, {"3", 0x33}, {"4", 0x34},
    {"5", 0x35}, {"6", 0x36}, {"7", 0x37}, {"8", 0x38}, {"9", 0x39},
    
    {"F1", VK_F1}, {"F2", VK_F2}, {"F3", VK_F3}, {"F4", VK_F4},
    {"F5", VK_F5}, {"F6", VK_F6}, {"F7", VK_F7}, {"F8", VK_F8},
    {"F9", VK_F9}, {"F10", VK_F10}, {"F11", VK_F11}, {"F12", VK_F12},
    
    {"ENTER", VK_RETURN},
    {"ESCAPE", VK_ESCAPE},
    {"BACKSPACE", VK_BACK},
    {"TAB", VK_TAB},
    {"SPACE", VK_SPACE},
    
    {"SHIFT", VK_SHIFT},
    {"CONTROL", VK_CONTROL},
    {"ALT", VK_MENU},
    {"CTRL", VK_CONTROL},
    
    {"LEFT", VK_LEFT},
    {"UP", VK_UP},
    {"RIGHT", VK_RIGHT},
    {"DOWN", VK_DOWN},
    
    {"HOME", VK_HOME},
    {"END", VK_END},
    {"PAGEUP", VK_PRIOR},
    {"PAGEDOWN", VK_NEXT},
    
    {"DELETE", VK_DELETE},
    {"INSERT", VK_INSERT},
    
    {"CAPSLOCK", VK_CAPITAL},
    {"NUMLOCK", VK_NUMLOCK},
    {"SCROLLLOCK", VK_SCROLL},
    
    {"PRINTSCREEN", VK_SNAPSHOT},
    {"PAUSE", VK_PAUSE},
    
    // Medya tuşları
    {"VOLUMEUP", VK_VOLUME_UP},
    {"VOLUMEDOWN", VK_VOLUME_DOWN},
    {"VOLUMEMUTE", VK_VOLUME_MUTE},
    {"MEDIAPLAYPAUSE", VK_MEDIA_PLAY_PAUSE},
    {"MEDIASTOP", VK_MEDIA_STOP},
    {"MEDIANEXTTRACK", VK_MEDIA_NEXT_TRACK},
    {"MEDIAPREVIOUSTRACK", VK_MEDIA_PREV_TRACK},
    
    // Tarayıcı tuşları
    {"BROWSERHOME", VK_BROWSER_HOME},
    {"BROWSERBACK", VK_BROWSER_BACK},
    {"BROWSERFORWARD", VK_BROWSER_FORWARD},
    {"BROWSERREFRESH", VK_BROWSER_REFRESH},
    {"BROWSERSTOP", VK_BROWSER_STOP},
    {"BROWSERSEARCH", VK_BROWSER_SEARCH},
    {"BROWSERFAVORITES", VK_BROWSER_FAVORITES},
    
    // Windows tuşları
    {"WIN", VK_LWIN},
    {"LWIN", VK_LWIN},
    {"RWIN", VK_RWIN}
};

// Medya tuşları mı kontrol et
bool IsMediaKey(WORD vk) {
    return vk == VK_VOLUME_UP || vk == VK_VOLUME_DOWN || vk == VK_VOLUME_MUTE ||
           vk == VK_MEDIA_PLAY_PAUSE || vk == VK_MEDIA_STOP ||
           vk == VK_MEDIA_NEXT_TRACK || vk == VK_MEDIA_PREV_TRACK ||
           vk == VK_BROWSER_HOME || vk == VK_BROWSER_BACK ||
           vk == VK_BROWSER_FORWARD || vk == VK_BROWSER_REFRESH ||
           vk == VK_BROWSER_STOP || vk == VK_BROWSER_SEARCH ||
           vk == VK_BROWSER_FAVORITES;
}

// Extended key mi kontrol et
bool IsExtendedKey(WORD vk) {
    return vk == VK_UP || vk == VK_DOWN || vk == VK_LEFT || vk == VK_RIGHT ||
           vk == VK_HOME || vk == VK_END || vk == VK_PRIOR || vk == VK_NEXT ||
           vk == VK_INSERT || vk == VK_DELETE ||
           vk == VK_RMENU || vk == VK_RCONTROL || // Sağ Alt ve Ctrl
           vk == VK_LWIN || vk == VK_RWIN;
}

// Tuşları basma fonksiyonu - Gerçek klavye gibi davranır
void PressKeys(const std::vector<std::string>& keys) {
    // Medya tuşları için özel işlem (tek tuş ve medya tuşu ise)
    if (keys.size() == 1) {
        auto it = keyMap.find(keys[0]);
        if (it != keyMap.end() && IsMediaKey(it->second)) {
            // Medya tuşları için ayrı ayrı gönder
            INPUT inputs[2] = {0};
            
            // Scan code'u al
            WORD scanCode = MapVirtualKeyEx(it->second, MAPVK_VK_TO_VSC, GetKeyboardLayout(0));
            
            // Key Down
            inputs[0].type = INPUT_KEYBOARD;
            inputs[0].ki.wVk = it->second;
            inputs[0].ki.wScan = scanCode;
            inputs[0].ki.dwFlags = KEYEVENTF_EXTENDEDKEY;
            
            // Key Up
            inputs[1].type = INPUT_KEYBOARD;
            inputs[1].ki.wVk = it->second;
            inputs[1].ki.wScan = scanCode;
            inputs[1].ki.dwFlags = KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP;
            
            // İki eventi de gönder
            SendInput(2, inputs, sizeof(INPUT));
            return;
        }
    }
    
    // Normal tuş kombinasyonları için (Ctrl+C, Alt+Tab, vb.)
    std::vector<INPUT> inputs;
    
    // Tüm tuşları bas (key down)
    for (const auto& keyName : keys) {
        auto it = keyMap.find(keyName);
        if (it == keyMap.end()) {
            continue; // Bilinmeyen tuş, atla
        }
        
        WORD vk = it->second;
        
        // Scan code'u al - Gerçek klavye gibi davranmak için ZORUNLU
        WORD scanCode = MapVirtualKeyEx(vk, MAPVK_VK_TO_VSC, GetKeyboardLayout(0));
        
        INPUT input = {0};
        input.type = INPUT_KEYBOARD;
        input.ki.wVk = vk;
        input.ki.wScan = scanCode; // Scan code ekle
        input.ki.dwFlags = 0;
        
        // Extended key kontrolü
        if (IsExtendedKey(vk) || IsMediaKey(vk)) {
            input.ki.dwFlags |= KEYEVENTF_EXTENDEDKEY;
        }
        
        inputs.push_back(input);
    }
    
    // Tüm tuşları bırak (key up) - ters sırayla
    for (auto it = keys.rbegin(); it != keys.rend(); ++it) {
        auto keyIt = keyMap.find(*it);
        if (keyIt == keyMap.end()) {
            continue;
        }
        
        WORD vk = keyIt->second;
        
        // Scan code'u al
        WORD scanCode = MapVirtualKeyEx(vk, MAPVK_VK_TO_VSC, GetKeyboardLayout(0));
        
        INPUT input = {0};
        input.type = INPUT_KEYBOARD;
        input.ki.wVk = vk;
        input.ki.wScan = scanCode; // Scan code ekle
        input.ki.dwFlags = KEYEVENTF_KEYUP;
        
        // Extended key kontrolü
        if (IsExtendedKey(vk) || IsMediaKey(vk)) {
            input.ki.dwFlags |= KEYEVENTF_EXTENDEDKEY;
        }
        
        inputs.push_back(input);
    }
    
    // SendInput ile tuşları gönder
    if (!inputs.empty()) {
        UINT result = SendInput(inputs.size(), inputs.data(), sizeof(INPUT));
        
        // Başarı kontrolü
        if (result != inputs.size()) {
            // Hata: Tüm inputlar gönderilemedi
            DWORD error = GetLastError();
            // printf("SendInput hatası: %lu, gönderilen: %u/%zu\n", error, result, inputs.size());
        }
    }
}

// Belirli bir pencereye tuş gönder (Focus edip SendInput ile)
void SendKeysToWindow(HWND hwnd, const std::vector<std::string>& keys) {
    if (!IsWindow(hwnd)) {
        return; // Geçersiz window handle
    }
    
    // Mevcut aktif pencereyi kaydet
    HWND hwndForeground = GetForegroundWindow();
    DWORD dwForegroundThreadId = GetWindowThreadProcessId(hwndForeground, NULL);
    DWORD dwTargetThreadId = GetWindowThreadProcessId(hwnd, NULL);
    
    // Thread input'unu attach et (SetForegroundWindow çalışması için gerekli)
    if (dwForegroundThreadId != dwTargetThreadId) {
        AttachThreadInput(dwForegroundThreadId, dwTargetThreadId, TRUE);
    }
    
    // Pencereyi öne getir ve focus yap
    if (IsIconic(hwnd)) {
        ShowWindow(hwnd, SW_RESTORE); // Minimize ise restore et
    }
    
    BringWindowToTop(hwnd);
    SetForegroundWindow(hwnd);
    SetFocus(hwnd);
    
    // Kısa bir delay (pencere focus olması için)
    Sleep(50);
    
    // Normal SendInput kullan (PressKeys fonksiyonu)
    // Bu zaten aktif pencereye gönderir, biz de aktif pencereyi ayarladık
    PressKeys(keys);
    
    // Thread input'unu detach et
    if (dwForegroundThreadId != dwTargetThreadId) {
        AttachThreadInput(dwForegroundThreadId, dwTargetThreadId, FALSE);
    }
    
    // Orijinal pencereye geri dön (opsiyonel, isterseniz kaldırabilirsiniz)
    // SetForegroundWindow(hwndForeground);
}

// Çalışan pencereleri listele
struct WindowInfo {
    HWND hwnd;
    std::string title;
    std::string exeName;
};

std::vector<WindowInfo> windowList;

BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lParam) {
    // Görünür ve başlık barı olan pencereler
    if (!IsWindowVisible(hwnd)) return TRUE;
    
    char title[256];
    GetWindowTextA(hwnd, title, sizeof(title));
    
    if (strlen(title) == 0) return TRUE; // Başlıksız pencereler
    
    // Process ID'yi al
    DWORD processId;
    GetWindowThreadProcessId(hwnd, &processId);
    
    // Process handle'ı aç
    HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, processId);
    if (hProcess) {
        char exePath[MAX_PATH];
        DWORD size = MAX_PATH;
        
        // Exe adını al
        if (QueryFullProcessImageNameA(hProcess, 0, exePath, &size)) {
            // Sadece dosya adını al (path olmadan)
            char* exeName = strrchr(exePath, '\\');
            if (exeName) {
                exeName++; // '\' karakterini atla
            } else {
                exeName = exePath;
            }
            
            WindowInfo info;
            info.hwnd = hwnd;
            info.title = title;
            info.exeName = exeName;
            windowList.push_back(info);
        }
        
        CloseHandle(hProcess);
    }
    
    return TRUE;
}

// N-API: sendKeys (Mevcut - Global)
Napi::Value SendKeys(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsArray()) {
        Napi::TypeError::New(env, "Array bekleniyor").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Array keysArray = info[0].As<Napi::Array>();
    std::vector<std::string> keys;
    
    for (uint32_t i = 0; i < keysArray.Length(); i++) {
        Napi::Value val = keysArray[i];
        if (val.IsString()) {
            keys.push_back(val.As<Napi::String>().Utf8Value());
        }
    }
    
    if (keys.empty()) {
        Napi::Error::New(env, "En az bir tuş gerekli").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    PressKeys(keys);
    
    return Napi::Boolean::New(env, true);
}

// N-API: sendKeysToWindow (Yeni - Belirli pencereye)
Napi::Value SendKeysToWindowAPI(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2) {
        Napi::TypeError::New(env, "hwnd ve keys array bekleniyor").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    if (!info[0].IsNumber() || !info[1].IsArray()) {
        Napi::TypeError::New(env, "Geçersiz parametreler").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // HWND'yi al (64-bit güvenli)
    int64_t hwndValue = info[0].As<Napi::Number>().Int64Value();
    HWND hwnd = reinterpret_cast<HWND>(hwndValue);
    
    // Keys'i al
    Napi::Array keysArray = info[1].As<Napi::Array>();
    std::vector<std::string> keys;
    
    for (uint32_t i = 0; i < keysArray.Length(); i++) {
        Napi::Value val = keysArray[i];
        if (val.IsString()) {
            keys.push_back(val.As<Napi::String>().Utf8Value());
        }
    }
    
    if (keys.empty()) {
        Napi::Error::New(env, "En az bir tuş gerekli").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    SendKeysToWindow(hwnd, keys);
    
    return Napi::Boolean::New(env, true);
}

// N-API: getWindowList (Yeni)
Napi::Value GetWindowListAPI(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // Liste temizle
    windowList.clear();
    
    // Pencereleri listele
    EnumWindows(EnumWindowsProc, 0);
    
    // JavaScript array oluştur
    Napi::Array result = Napi::Array::New(env, windowList.size());
    
    for (size_t i = 0; i < windowList.size(); i++) {
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("hwnd", Napi::Number::New(env, reinterpret_cast<int64_t>(windowList[i].hwnd)));
        obj.Set("title", Napi::String::New(env, windowList[i].title));
        obj.Set("exeName", Napi::String::New(env, windowList[i].exeName));
        result[i] = obj;
    }
    
    return result;
}

// Modül başlatma
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "sendKeys"), Napi::Function::New(env, SendKeys));
    exports.Set(Napi::String::New(env, "sendKeysToWindow"), Napi::Function::New(env, SendKeysToWindowAPI));
    exports.Set(Napi::String::New(env, "getWindowList"), Napi::Function::New(env, GetWindowListAPI));
    return exports;
}

NODE_API_MODULE(keyboard, Init)

#else
// Windows dışı platformlar için dummy implementation

Napi::Value SendKeys(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Error::New(env, "Bu özellik sadece Windows'ta destekleniyor").ThrowAsJavaScriptException();
    return env.Null();
}

Napi::Value SendKeysToWindowAPI(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Error::New(env, "Bu özellik sadece Windows'ta destekleniyor").ThrowAsJavaScriptException();
    return env.Null();
}

Napi::Value GetWindowListAPI(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    return Napi::Array::New(env, 0);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "sendKeys"), Napi::Function::New(env, SendKeys));
    exports.Set(Napi::String::New(env, "sendKeysToWindow"), Napi::Function::New(env, SendKeysToWindowAPI));
    exports.Set(Napi::String::New(env, "getWindowList"), Napi::Function::New(env, GetWindowListAPI));
    return exports;
}

NODE_API_MODULE(keyboard, Init)

#endif

