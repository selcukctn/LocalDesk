import { useState, useEffect, useCallback, useRef } from 'react';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, MediaStream, mediaDevices } from 'react-native-webrtc';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const useRemoteScreen = (socket, deviceInfo) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [error, setError] = useState(null);
  const [screenSources, setScreenSources] = useState({ screens: [], windows: [] });
  const [selectedSourceId, setSelectedSourceId] = useState(null);
  
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(socket);
  const deviceRef = useRef(deviceInfo);
  
  // Device referansını güncelle
  useEffect(() => {
    deviceRef.current = deviceInfo;
  }, [deviceInfo]);

  // Socket referansını güncelle
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Ekran ve pencere kaynaklarını al
  const fetchScreenSources = useCallback(async () => {
    const device = deviceRef.current;
    if (!device) return;
    
    try {
      const response = await fetch(`http://${device.host}:${device.port}/screen-sources`);
      if (response.ok) {
        const data = await response.json();
        setScreenSources(data);
        // İlk ekranı varsayılan olarak seç (sadece henüz seçilmemişse)
        setSelectedSourceId(prev => {
          if (!prev && data.screens && data.screens.length > 0) {
            return data.screens[0].id;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('❌ Screen sources alınamadı:', error);
    }
  }, []);

  // WebRTC bağlantısını başlat
  const startSession = useCallback(async (sourceId = null) => {
    if (!socketRef.current || !socketRef.current.connected) {
      setError('Cihaza bağlı değilsiniz');
      return;
    }

    // sourceId parametresi varsa onu kullan, yoksa selectedSourceId'yi kullan
    let currentSourceId = sourceId || selectedSourceId;
    
    // Eğer hala source seçilmemişse, önce ekran kaynaklarını al
    if (!currentSourceId) {
      // Önce ekran kaynaklarını al
      await fetchScreenSources();
      
      // State güncellemesi için kısa bir delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // State'i tekrar kontrol et
      currentSourceId = selectedSourceId;
      
      // Hala seçilmemişse, hata ver
      if (!currentSourceId) {
        setError('Lütfen önce bir ekran veya pencere seçin');
        setIsConnecting(false);
        return;
      }
    }
    
    // Seçilen sourceId'yi state'e kaydet
    if (currentSourceId && currentSourceId !== selectedSourceId) {
      setSelectedSourceId(currentSourceId);
    }

    try {
      setIsConnecting(true);
      setError(null);
      console.log('📹 Remote Screen oturumu başlatılıyor...');
      console.log('📹 Selected source ID:', currentSourceId || selectedSourceId);

      // Peer connection oluştur
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Remote stream - modern API (ontrack)
      let remoteStreamObj = null;
      pc.ontrack = (event) => {
        console.log('📹 Track alındı:', event.track.kind);
        console.log('📹 Streams:', event.streams);
        
        if (event.streams && event.streams[0]) {
          console.log('✅ Remote stream alındı (ontrack)');
          remoteStreamObj = event.streams[0];
          setRemoteStream(remoteStreamObj);
          setIsSessionActive(true);
          setIsConnecting(false);
        } else {
          console.warn('⚠️ No streams in track event, creating new stream');
          if (!remoteStreamObj) {
            remoteStreamObj = new MediaStream();
          }
          remoteStreamObj.addTrack(event.track);
          setRemoteStream(remoteStreamObj);
          setIsSessionActive(true);
          setIsConnecting(false);
        }
      };

      // Fallback: deprecated onaddstream (eski cihazlar için)
      pc.onaddstream = (event) => {
        console.log('📹 Remote stream alındı (deprecated onaddstream)');
        console.log('📹 Stream:', event.stream);
        setRemoteStream(event.stream);
        setIsSessionActive(true);
        setIsConnecting(false);
      };

      // ICE candidate event
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('📹 ICE candidate gönderiliyor');
          socketRef.current?.emit('webrtc-ice-candidate', {
            candidate: event.candidate
          });
        }
      };

      // Connection state change
      pc.onconnectionstatechange = () => {
        console.log('📹 Connection state:', pc.connectionState);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setError('Bağlantı kesildi');
          stopSession();
        }
      };

      // ICE connection state change
      pc.oniceconnectionstatechange = () => {
        console.log('📹 ICE connection state:', pc.iceConnectionState);
      };

      // Offer oluştur ve gönder
      console.log('📹 Creating offer...');
      const offer = await pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: false
      });
      console.log('✅ Offer created');
      console.log('📹 Offer SDP type:', offer.type);
      console.log('📹 Offer SDP (first 100 chars):', offer.sdp?.substring(0, 100));

      await pc.setLocalDescription(offer);
      console.log('✅ Local description set');
      
      console.log('📹 Sending offer to desktop via socket.io');
      console.log('📹 Socket connected?', socketRef.current.connected);
      console.log('📹 Socket id:', socketRef.current.id);
      
      console.log('📹 Selected source ID:', currentSourceId);
      
      socketRef.current.emit('webrtc-offer', {
        offer: pc.localDescription,
        sourceId: currentSourceId // Seçilen ekran/pencere ID'si
      });
      console.log('✅ Offer emitted successfully');

    } catch (err) {
      console.error('❌ Remote Screen başlatma hatası:', err);
      setError('Oturum başlatılamadı: ' + err.message);
      setIsConnecting(false);
      setIsSessionActive(false);
    }
  }, [selectedSourceId, screenSources, fetchScreenSources]);

  // WebRTC bağlantısını durdur
  const stopSession = useCallback(() => {
    console.log('📹 Remote Screen oturumu durduruluyor...');
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    setRemoteStream(null);
    setIsSessionActive(false);
    setIsConnecting(false);
  }, []);

  // Mouse hareketini gönder (normalized coordinates 0-1)
  const sendMouseMove = useCallback((x, y) => {
    if (!socketRef.current || !isSessionActive) {
      console.warn('⚠️ Cannot send mouse move - socket:', !!socketRef.current, 'active:', isSessionActive);
      return;
    }
    
    console.log('🖱️ Sending mouse move:', { x, y });
    socketRef.current.emit('remote-mouse-move', { x, y });
  }, [isSessionActive]);

  // Mouse tıklamasını gönder
  const sendMouseClick = useCallback((button, x, y) => {
    if (!socketRef.current || !isSessionActive) return;
    
    console.log(`🖱️ Mouse click: ${button} at (${x}, ${y})`);
    socketRef.current.emit('remote-mouse-click', { button, x, y });
  }, [isSessionActive]);

  // Mouse button down (sürükleme başlangıcı)
  const sendMouseButtonDown = useCallback((button, x, y) => {
    if (!socketRef.current || !isSessionActive) return;
    
    console.log(`🖱️ Mouse button down: ${button} at (${x}, ${y})`);
    socketRef.current.emit('remote-mouse-button-down', { button, x, y });
  }, [isSessionActive]);

  // Mouse button up (sürükleme bitişi)
  const sendMouseButtonUp = useCallback((button, x, y) => {
    if (!socketRef.current || !isSessionActive) return;
    
    console.log(`🖱️ Mouse button up: ${button} at (${x}, ${y})`);
    socketRef.current.emit('remote-mouse-button-up', { button, x, y });
  }, [isSessionActive]);

  // Scroll olayını gönder
  const sendMouseScroll = useCallback((deltaX, deltaY) => {
    if (!socketRef.current || !isSessionActive) return;
    
    socketRef.current.emit('remote-mouse-scroll', { deltaX, deltaY });
  }, [isSessionActive]);

  // Klavye girişini gönder
  const sendKeyboardInput = useCallback((text = null, keys = null) => {
    if (!socketRef.current || !isSessionActive) return;
    
    console.log(`⌨️ Keyboard input: text="${text}", keys=${keys}`);
    socketRef.current.emit('remote-keyboard-input', { text, keys });
  }, [isSessionActive]);

  // Medya kontrolü gönder
  const sendMediaControl = useCallback((action) => {
    if (!socketRef.current || !isSessionActive) return;
    
    console.log(`🎵 Media control: ${action}`);
    socketRef.current.emit('remote-media-control', { action });
  }, [isSessionActive]);

  // Ses seviyesi kontrolü gönder
  const sendVolumeControl = useCallback((action, value = null) => {
    if (!socketRef.current || !isSessionActive) return;
    
    console.log(`🔊 Volume control: ${action}`, value ? `value: ${value}` : '');
    socketRef.current.emit('remote-volume-control', { action, value });
  }, [isSessionActive]);

  // Ses seviyesini al
  const [volume, setVolume] = useState(50);
  
  const fetchVolume = useCallback(async () => {
    const device = deviceRef.current;
    if (!device) return;
    
    try {
      const response = await fetch(`http://${device.host}:${device.port}/volume`);
      if (response.ok) {
        const data = await response.json();
        setVolume(data.volume || 50);
      }
    } catch (error) {
      console.error('❌ Ses seviyesi alınamadı:', error);
    }
  }, []);

  // Ses seviyesini ayarla
  const setVolumeLevel = useCallback(async (newVolume) => {
    const device = deviceRef.current;
    if (!device) return;
    
    const clampedVolume = Math.max(0, Math.min(100, newVolume));
    
    try {
      const response = await fetch(`http://${device.host}:${device.port}/volume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ volume: clampedVolume })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setVolume(clampedVolume);
          // Ayrıca socket event'i de gönder (hızlı feedback için)
          sendVolumeControl('set', clampedVolume);
        }
      }
    } catch (error) {
      console.error('❌ Ses seviyesi ayarlanamadı:', error);
    }
  }, [sendVolumeControl]);

  // WebRTC signaling event'lerini dinle
  useEffect(() => {
    if (!socketRef.current) {
      console.warn('⚠️ Socket ref not available for WebRTC signaling');
      return;
    }

    console.log('📹 Setting up WebRTC signaling listeners');

    const handleAnswer = async (data) => {
      console.log('📹 WebRTC answer alındı:', data);
      try {
        if (!peerConnectionRef.current) {
          console.error('❌ Peer connection not available!');
          return;
        }
        
        if (!data.answer) {
          console.error('❌ Answer data is missing!');
          return;
        }
        
        console.log('📹 Answer SDP type:', data.answer.type);
        console.log('📹 Answer SDP (first 100 chars):', data.answer.sdp?.substring(0, 100));
        
        const remoteDesc = new RTCSessionDescription(data.answer);
        await peerConnectionRef.current.setRemoteDescription(remoteDesc);
        console.log('✅ Remote description set edildi');
      } catch (err) {
        console.error('❌ Answer işleme hatası:', err);
        console.error('❌ Error details:', err.message);
        setError('Bağlantı kurulamadı: ' + err.message);
        setIsConnecting(false);
      }
    };

    const handleIceCandidate = async (data) => {
      console.log('📹 WebRTC ICE candidate alındı');
      try {
        if (!peerConnectionRef.current) {
          console.error('❌ Peer connection not available for ICE!');
          return;
        }
        
        if (data.candidate) {
          const candidate = new RTCIceCandidate(data.candidate);
          await peerConnectionRef.current.addIceCandidate(candidate);
          console.log('✅ ICE candidate eklendi');
        } else {
          console.log('📹 Empty ICE candidate (end of candidates)');
        }
      } catch (err) {
        console.error('❌ ICE candidate ekleme hatası:', err);
        console.error('❌ Error details:', err.message);
      }
    };

    socketRef.current.on('webrtc-answer', handleAnswer);
    socketRef.current.on('webrtc-ice-candidate', handleIceCandidate);
    
    console.log('✅ WebRTC signaling listeners registered');

    return () => {
      console.log('📹 Cleaning up WebRTC signaling listeners');
      socketRef.current?.off('webrtc-answer', handleAnswer);
      socketRef.current?.off('webrtc-ice-candidate', handleIceCandidate);
    };
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  return {
    isSessionActive,
    isConnecting,
    remoteStream,
    error,
    startSession,
    stopSession,
    sendMouseMove,
    sendMouseClick,
    sendMouseButtonDown,
    sendMouseButtonUp,
    sendMouseScroll,
    sendKeyboardInput,
    sendMediaControl,
    sendVolumeControl,
    volume,
    setVolumeLevel,
    fetchVolume,
    screenSources,
    selectedSourceId,
    setSelectedSourceId,
    fetchScreenSources
  };
};

