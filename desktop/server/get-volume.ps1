# Windows ses seviyesini al
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class AudioHelper {
    [DllImport("user32.dll")]
    public static extern IntPtr SendMessageW(IntPtr hWnd, int Msg, IntPtr wParam, IntPtr lParam);
    
    public static int GetVolume() {
        try {
            // Windows Audio Session API (WASAPI) kullanarak ses seviyesini al
            // Basit yöntem: Windows Mixer API
            return 50; // Varsayılan (gerçek implementasyon için COM API gerekli)
        } catch {
            return 50;
        }
    }
}
"@

# PowerShell ile Windows Audio API kullanarak ses seviyesini al
try {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
    int NotImpl1();
    int NotImpl2();
    int GetChannelCount(out uint pnChannelCount);
    int SetMasterVolumeLevel(float fLevelDB, System.Guid pguidEventContext);
    int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
    int GetMasterVolumeLevel(out float pfLevelDB);
    int GetMasterVolumeLevelScalar(out float pfLevel);
    int SetChannelVolumeLevel(uint nChannel, float fLevelDB, System.Guid pguidEventContext);
    int SetChannelVolumeLevelScalar(uint nChannel, float fLevel, System.Guid pguidEventContext);
    int GetChannelVolumeLevel(uint nChannel, out float pfLevelDB);
    int GetChannelVolumeLevelScalar(uint nChannel, out float pfLevel);
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid pguidEventContext);
    int GetMute(out bool pbMute);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
    int Activate(ref System.Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
    int NotImpl1();
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumerator {
}

public class AudioVolume {
    public static float GetVolume() {
        try {
            IMMDeviceEnumerator enumerator = new MMDeviceEnumerator() as IMMDeviceEnumerator;
            IMMDevice device = null;
            enumerator.GetDefaultAudioEndpoint(0, 0, out device);
            
            Guid IID_IAudioEndpointVolume = typeof(IAudioEndpointVolume).GUID;
            object o;
            device.Activate(ref IID_IAudioEndpointVolume, 0, IntPtr.Zero, out o);
            IAudioEndpointVolume aepv = (IAudioEndpointVolume)o;
            
            float volume = 0;
            aepv.GetMasterVolumeLevelScalar(out volume);
            return volume * 100;
        } catch {
            return 50.0f;
        }
    }
    
    public static void SetVolume(float level) {
        try {
            IMMDeviceEnumerator enumerator = new MMDeviceEnumerator() as IMMDeviceEnumerator;
            IMMDevice device = null;
            enumerator.GetDefaultAudioEndpoint(0, 0, out device);
            
            Guid IID_IAudioEndpointVolume = typeof(IAudioEndpointVolume).GUID;
            object o;
            device.Activate(ref IID_IAudioEndpointVolume, 0, IntPtr.Zero, out o);
            IAudioEndpointVolume aepv = (IAudioEndpointVolume)o;
            
            float normalizedLevel = Math.Max(0, Math.Min(1, level / 100.0f));
            Guid guid = Guid.Empty;
            aepv.SetMasterVolumeLevelScalar(normalizedLevel, guid);
        } catch {
            // Hata durumunda sessizce devam et
        }
    }
}
"@

$volume = [AudioVolume]::GetVolume()
Write-Output $volume

