# Test medya tuşu - PowerShell ile
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class MediaKeyTest {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    
    public const byte VK_MEDIA_PLAY_PAUSE = 0xB3;
    public const uint KEYEVENTF_EXTENDEDKEY = 0x0001;
    public const uint KEYEVENTF_KEYUP = 0x0002;
    
    public static void SendMediaPlayPause() {
        keybd_event(VK_MEDIA_PLAY_PAUSE, 0, KEYEVENTF_EXTENDEDKEY, UIntPtr.Zero);
        keybd_event(VK_MEDIA_PLAY_PAUSE, 0, KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP, UIntPtr.Zero);
    }
}
"@

Write-Host "Medya Play/Pause tuşu gönderiliyor..."
[MediaKeyTest]::SendMediaPlayPause()
Write-Host "Gönderildi! Medya oynatıcınız açık mı kontrol edin."

