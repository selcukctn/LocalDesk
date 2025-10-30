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
    {"PAUSE", VK_PAUSE}
};

// Tuşları basma fonksiyonu
void PressKeys(const std::vector<std::string>& keys) {
    std::vector<INPUT> inputs;
    
    // Tüm tuşları bas (key down)
    for (const auto& keyName : keys) {
        auto it = keyMap.find(keyName);
        if (it == keyMap.end()) {
            continue; // Bilinmeyen tuş, atla
        }
        
        INPUT input = {0};
        input.type = INPUT_KEYBOARD;
        input.ki.wVk = it->second;
        input.ki.dwFlags = 0; // Key down
        inputs.push_back(input);
    }
    
    // Tüm tuşları bırak (key up) - ters sırayla
    for (auto it = keys.rbegin(); it != keys.rend(); ++it) {
        auto keyIt = keyMap.find(*it);
        if (keyIt == keyMap.end()) {
            continue;
        }
        
        INPUT input = {0};
        input.type = INPUT_KEYBOARD;
        input.ki.wVk = keyIt->second;
        input.ki.dwFlags = KEYEVENTF_KEYUP;
        inputs.push_back(input);
    }
    
    // SendInput ile tuşları gönder
    if (!inputs.empty()) {
        SendInput(inputs.size(), inputs.data(), sizeof(INPUT));
    }
}

// N-API fonksiyonu
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

// Modül başlatma
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "sendKeys"), Napi::Function::New(env, SendKeys));
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

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "sendKeys"), Napi::Function::New(env, SendKeys));
    return exports;
}

NODE_API_MODULE(keyboard, Init)

#endif

