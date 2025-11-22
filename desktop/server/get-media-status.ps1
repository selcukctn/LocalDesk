# Windows Media Control API ile medya durumunu al
# PowerShell 5.1+ ve Windows 10/11 gerektirir
try {
    # Windows Runtime API'lerine erişim için
    $null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]
    
    # Async işlemleri await etmek için helper
    function Await($WinRtTask, $ResultType) {
        $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
            $_.Name -eq 'AsTask' -and 
            $_.GetParameters().Count -eq 1 -and 
            $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
        })[0]
        
        if ($asTaskGeneric) {
            $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
            $netTask = $asTask.Invoke($null, @($WinRtTask))
            $netTask.Wait(-1) | Out-Null
            return $netTask.Result
        }
        return $null
    }
    
    # Session manager'ı al
    $sessionManagerTask = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
    $sessionManager = Await $sessionManagerTask ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
    
    if ($sessionManager -eq $null) {
        Write-Output '{"isPlaying":false,"title":"Medya oynatıcı bulunamadı","artist":"","duration":0,"position":0}'
        exit 0
    }
    
    $currentSession = $sessionManager.GetCurrentSession()
    
    if ($currentSession -eq $null) {
        Write-Output '{"isPlaying":false,"title":"Medya oynatıcı bulunamadı","artist":"","duration":0,"position":0}'
        exit 0
    }
    
    # Media properties
    $mediaPropertiesTask = $currentSession.TryGetMediaPropertiesAsync()
    $mediaProperties = Await $mediaPropertiesTask ([Windows.Media.MediaProperties]::MusicDisplayProperties)
    
    # Playback info
    $playbackInfo = $currentSession.GetPlaybackInfo()
    $timelineProperties = $currentSession.GetTimelineProperties()
    
    $title = ""
    $artist = ""
    $isPlaying = $false
    $duration = 0
    $position = 0
    
    if ($mediaProperties) {
        $title = if ($mediaProperties.Title) { $mediaProperties.Title } else { "" }
        $artist = if ($mediaProperties.Artist) { $mediaProperties.Artist } else { "" }
    }
    
    if ($playbackInfo) {
        $isPlaying = $playbackInfo.PlaybackStatus -eq [Windows.Media.MediaPlaybackStatus]::Playing
    }
    
    if ($timelineProperties) {
        if ($timelineProperties.EndTime) {
            $duration = [Math]::Floor($timelineProperties.EndTime.TotalSeconds)
        }
        if ($timelineProperties.Position) {
            $position = [Math]::Floor($timelineProperties.Position.TotalSeconds)
        }
    }
    
    # JSON escape
    $titleEscaped = $title -replace '\\', '\\\\' -replace '"', '\"'
    $artistEscaped = $artist -replace '\\', '\\\\' -replace '"', '\"'
    $isPlayingStr = $isPlaying.ToString().ToLower()
    
    Write-Output "{\"isPlaying\":$isPlayingStr,\"title\":\"$titleEscaped\",\"artist\":\"$artistEscaped\",\"duration\":$duration,\"position\":$position}"
} catch {
    # Hata durumunda varsayılan değerler
    Write-Output '{"isPlaying":false,"title":"Medya oynatıcı bulunamadı","artist":"","duration":0,"position":0}'
}

