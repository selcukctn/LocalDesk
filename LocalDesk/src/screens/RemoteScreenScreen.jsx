import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  Keyboard,
  ActivityIndicator,
  Alert,
  StatusBar,
  PanResponder,
  Image,
  ScrollView
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useI18n } from '../contexts/I18nContext';
import { useRemoteScreen } from '../hooks/useRemoteScreen';

// Icon imports
const screenPlayIcon = require('../icons/screen-play.png');
const plugConnectionIcon = require('../icons/plug-connection.png');
const keyboardDownIcon = require('../icons/keyboard-down.png');
const leftIcon = require('../icons/left.png');
const angleDoubleSmallLeftIcon = require('../icons/angle-double-small-left.png');
const playIcon = require('../icons/play.png');
const pauseIcon = require('../icons/pause.png');
const volumeIcon = require('../icons/volume.png');
const volumeMuteIcon = require('../icons/volume-mute.png');
const minusSmallIcon = require('../icons/minus-small.png');
const plusIcon = require('../icons/plus.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const RemoteScreenScreen = ({ device, socket, onBack, onDisconnect }) => {
  const { t } = useI18n();
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showMediaControls, setShowMediaControls] = useState(false);
  const [keyboardText, setKeyboardText] = useState('');
  const [mediaStatus, setMediaStatus] = useState({
    isPlaying: false,
    title: 'Medya oynatıcı bulunamadı',
    artist: '',
    duration: 0,
    position: 0
  });
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [videoRenderSize, setVideoRenderSize] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  const textInputRef = useRef(null);
  const progressBarWidthRef = useRef(0);
  const volumeSliderWidthRef = useRef(0);
  const lastTouchRef = useRef({ 
    x: 0, 
    y: 0, 
    time: 0,
    startX: 0,  // Touch başlangıç pozisyonu
    startY: 0,
    startTime: 0,
    hasMoved: false  // Mouse hareket ettirildi mi?
  });
  const lastClickRef = useRef({ time: 0, x: 0, y: 0 }); // Son tık zamanı ve pozisyonu (çift tık için)
  const isDoubleClickDragRef = useRef(false); // Çift tık sonrası sürükleme modunda mı?
  const videoContainerRef = useRef(null);
  
  // Desktop ekran boyutunu al (ilk bağlantıda)
  const [desktopScreenSize, setDesktopScreenSize] = useState({ width: 1920, height: 1080 });
  
  // Desktop ekran boyutunu server'dan al
  React.useEffect(() => {
    const fetchScreenSize = async () => {
      try {
        // Eğer seçili bir sourceId varsa, onun bilgisini al
        if (selectedSourceId) {
          try {
            const response = await fetch(`http://${device.host}:${device.port}/screen-info?sourceId=${encodeURIComponent(selectedSourceId)}`);
            if (response.ok) {
              const screenInfo = await response.json();
              if (screenInfo.success && screenInfo.screenSize) {
                console.log('📹 Seçilen ekran boyutu:', screenInfo.screenSize);
                setDesktopScreenSize(screenInfo.screenSize);
                return;
              }
            }
          } catch (error) {
            console.warn('⚠️ Screen info alınamadı, device-info kullanılıyor:', error.message);
          }
        }
        
        // Fallback: device-info endpoint'inden al
        const response = await fetch(`http://${device.host}:${device.port}/device-info`);
        if (response.ok) {
          const info = await response.json();
          if (info.screenSize) {
            console.log('📹 Desktop screen size from device-info:', info.screenSize);
            setDesktopScreenSize(info.screenSize);
          } else {
            console.warn('⚠️ No screenSize in device-info, using default');
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch screen size, using default:', error.message);
      }
    };
    
    if (device) {
      fetchScreenSize();
    }
  }, [device, selectedSourceId]); // selectedSourceId değiştiğinde de güncelle
  
  const {
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
  } = useRemoteScreen(socket, device);
  
  const [showSourceSelector, setShowSourceSelector] = useState(false);
  const [showHeader, setShowHeader] = useState(false); // Header varsayılan olarak gizli
  const [showZoomControls, setShowZoomControls] = useState(false); // Zoom kontrolleri paneli
  const [zoomLevel, setZoomLevel] = useState(1.0); // Zoom seviyesi (1.0 = %100)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 }); // Pan offset (piksel cinsinden)

  // Zaman formatı (saniye -> mm:ss)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Video layout değişikliğinde boyutları al ve gerçek render boyutunu hesapla
  const handleVideoLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;
    console.log('📹 onLayout called:', { width, height });
    
    if (width > 0 && height > 0) {
      setVideoSize({ width, height });
      
      // Desktop screen size kontrolü
      if (!desktopScreenSize || !desktopScreenSize.width || !desktopScreenSize.height) {
        console.warn('⚠️ Desktop screen size not available yet, using default');
        setVideoRenderSize({ width, height, offsetX: 0, offsetY: 0 });
        return;
      }
      
      // Video'nun gerçek render boyutunu hesapla (objectFit="contain" için)
      // Desktop ekran aspect ratio'su ile container aspect ratio'sunu karşılaştır
      const containerAspect = width / height;
      const desktopAspect = desktopScreenSize.width / desktopScreenSize.height;
      
      let renderWidth, renderHeight, offsetX, offsetY;
      
      if (containerAspect > desktopAspect) {
        // Container daha geniş - letterbox (üst/alt boşluk)
        renderHeight = height;
        renderWidth = height * desktopAspect;
        offsetX = (width - renderWidth) / 2;
        offsetY = 0;
      } else {
        // Container daha yüksek - pillarbox (sağ/sol boşluk)
        renderWidth = width;
        renderHeight = width / desktopAspect;
        offsetX = 0;
        offsetY = (height - renderHeight) / 2;
      }
      
      setVideoRenderSize({ width: renderWidth, height: renderHeight, offsetX, offsetY });
      
      console.log('✅ Video size set:', width, 'x', height);
      console.log('✅ Video render size:', { renderWidth, renderHeight, offsetX, offsetY });
      console.log('✅ Aspect ratios:', { container: containerAspect, desktop: desktopAspect });
      console.log('✅ Desktop screen size:', desktopScreenSize);
    } else {
      console.warn('⚠️ Invalid video size:', { width, height });
    }
  };

  // Desktop screen size değiştiğinde video render boyutunu yeniden hesapla
  React.useEffect(() => {
    if (videoSize.width > 0 && videoSize.height > 0 && desktopScreenSize.width > 0 && desktopScreenSize.height > 0) {
      // Video layout'u yeniden hesapla
      const containerAspect = videoSize.width / videoSize.height;
      const desktopAspect = desktopScreenSize.width / desktopScreenSize.height;
      
      let renderWidth, renderHeight, offsetX, offsetY;
      
      if (containerAspect > desktopAspect) {
        renderHeight = videoSize.height;
        renderWidth = videoSize.height * desktopAspect;
        offsetX = (videoSize.width - renderWidth) / 2;
        offsetY = 0;
      } else {
        renderWidth = videoSize.width;
        renderHeight = videoSize.width / desktopAspect;
        offsetX = 0;
        offsetY = (videoSize.height - renderHeight) / 2;
      }
      
      setVideoRenderSize({ width: renderWidth, height: renderHeight, offsetX, offsetY });
      console.log('✅ Video render size updated from desktop screen size:', { renderWidth, renderHeight, offsetX, offsetY });
    }
  }, [desktopScreenSize, videoSize]);

  // PanResponder oluştur - useMemo ile dependency'lere göre yeniden oluştur
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => {
        const canRespond = isSessionActive && videoSize.width > 0 && videoSize.height > 0;
        console.log('🖱️ onStartShouldSetPanResponder:', { 
          canRespond, 
          isSessionActive, 
          videoSize 
        });
        return canRespond;
      },
      onMoveShouldSetPanResponder: () => {
        return isSessionActive && videoSize.width > 0 && videoSize.height > 0;
      },
      onPanResponderGrant: (evt) => {
        console.log('🖱️ onPanResponderGrant called');
        console.log('🖱️ State check:', { 
          isSessionActive, 
          videoSize,
          videoRenderSize,
          hasSize: videoSize.width > 0 && videoSize.height > 0
        });

        if (!isSessionActive) {
          console.warn('⚠️ Session not active');
          return;
        }

        if (!videoSize.width || !videoSize.height || !videoRenderSize.width || !videoRenderSize.height) {
          console.warn('⚠️ Video size not set:', { videoSize, videoRenderSize });
          return;
        }

        const { locationX, locationY } = evt.nativeEvent;
        
        // Touch koordinatlarını video'nun gerçek render alanına göre normalize et
        // Önce offset'i çıkar
        const relativeX = locationX - videoRenderSize.offsetX;
        const relativeY = locationY - videoRenderSize.offsetY;
        
        // Sonra render boyutuna göre normalize et
        const x = relativeX / videoRenderSize.width;
        const y = relativeY / videoRenderSize.height;

        const normalizedX = Math.max(0, Math.min(1, x));
        const normalizedY = Math.max(0, Math.min(1, y));

        console.log('🖱️ Touch Start (PanResponder):', {
          raw: { locationX, locationY },
          relative: { relativeX, relativeY },
          normalized: { x: normalizedX, y: normalizedY },
          videoSize,
          videoRenderSize
        });

        // Başlangıç pozisyonunu ve zamanını kaydet
        const now = Date.now();
        
        // Çift tık kontrolü
        const DOUBLE_CLICK_TIME = 500; // 500ms içinde
        const DOUBLE_CLICK_DISTANCE = 0.02; // %2 mesafe içinde
        const timeSinceLastClick = now - lastClickRef.current.time;
        const distanceFromLastClick = Math.sqrt(
          Math.pow(normalizedX - lastClickRef.current.x, 2) + 
          Math.pow(normalizedY - lastClickRef.current.y, 2)
        );
        
        const isDoubleClick = timeSinceLastClick < DOUBLE_CLICK_TIME && 
                             distanceFromLastClick < DOUBLE_CLICK_DISTANCE;
        
        if (isDoubleClick) {
          console.log('🖱️ Double click detected!');
          isDoubleClickDragRef.current = true; // Çift tık sonrası sürükleme modu
          // Çift tık sonrası sürükleme için left button down yap
          sendMouseButtonDown('left', normalizedX, normalizedY);
        } else {
          // Normal tık - çift tık değil
          isDoubleClickDragRef.current = false;
        }
        
        lastTouchRef.current = { 
          x: normalizedX, 
          y: normalizedY, 
          time: now,
          startX: normalizedX,
          startY: normalizedY,
          startTime: now,
          hasMoved: false
        };
        
        // Son tık zamanını güncelle
        lastClickRef.current = { time: now, x: normalizedX, y: normalizedY };
        
        sendMouseMove(normalizedX, normalizedY);
      },
      onPanResponderMove: (evt) => {
        if (!isSessionActive || !videoSize.width || !videoSize.height || !videoRenderSize.width || !videoRenderSize.height) {
          console.warn('⚠️ Cannot move - session:', isSessionActive, 'size:', videoSize, 'renderSize:', videoRenderSize);
          return;
        }

        const { locationX, locationY } = evt.nativeEvent;
        
        // Touch koordinatlarını video'nun gerçek render alanına göre normalize et
        const relativeX = locationX - videoRenderSize.offsetX;
        const relativeY = locationY - videoRenderSize.offsetY;
        
        const x = relativeX / videoRenderSize.width;
        const y = relativeY / videoRenderSize.height;

        const normalizedX = Math.max(0, Math.min(1, x));
        const normalizedY = Math.max(0, Math.min(1, y));

        // Hareket mesafesini hesapla (başlangıç pozisyonundan)
        const deltaX = Math.abs(normalizedX - lastTouchRef.current.startX);
        const deltaY = Math.abs(normalizedY - lastTouchRef.current.startY);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Eğer mesafe belirli bir threshold'dan büyükse, hareket var demektir
        const MOVEMENT_THRESHOLD = 0.01; // %1 hareket (normalize edilmiş koordinatlarda)
        if (distance > MOVEMENT_THRESHOLD) {
          lastTouchRef.current.hasMoved = true;
        }

        lastTouchRef.current.x = normalizedX;
        lastTouchRef.current.y = normalizedY;
        lastTouchRef.current.time = Date.now();
        
        // Çift tık sürükleme modundaysa, mouse button down'u sürdür
        if (isDoubleClickDragRef.current) {
          // Button zaten down, sadece hareket ettir
          sendMouseMove(normalizedX, normalizedY);
        } else {
          // Normal hareket
          sendMouseMove(normalizedX, normalizedY);
        }
      },
      onPanResponderRelease: () => {
        if (!isSessionActive) {
          console.warn('⚠️ Cannot release - session not active');
          return;
        }

        const now = Date.now();
        const timeDiff = now - lastTouchRef.current.startTime;
        
        // Son pozisyondan başlangıç pozisyonuna mesafe
        const deltaX = Math.abs(lastTouchRef.current.x - lastTouchRef.current.startX);
        const deltaY = Math.abs(lastTouchRef.current.y - lastTouchRef.current.startY);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        const MOVEMENT_THRESHOLD = 0.01; // %1 hareket (normalize edilmiş koordinatlarda)
        const MAX_CLICK_TIME = 300; // 300ms'den kısa süre
        
        // Çift tık sürükleme modundaysa
        if (isDoubleClickDragRef.current) {
          const { x, y } = lastTouchRef.current;
          
          // Eğer hareket varsa, seçim yapıldı (drag selection)
          if (lastTouchRef.current.hasMoved || distance > MOVEMENT_THRESHOLD) {
            console.log('🖱️ Double click drag selection completed');
            sendMouseButtonUp('left', x, y);
          } else {
            // Hareket yoksa, sadece çift tık (sağ tık)
            console.log('🖱️ Double click (right click)');
            sendMouseButtonUp('left', x, y); // Önce button up
            sendMouseClick('right', x, y); // Sonra sağ tık
          }
          
          isDoubleClickDragRef.current = false;
          return;
        }
        
        // Normal tık/drag kontrolü
        // Click olarak algıla SADECE:
        // 1. Hareket edilmemişse (hasMoved = false) VEYA mesafe çok küçükse
        // 2. VE süre kısa ise
        const isClick = !lastTouchRef.current.hasMoved && 
                       distance < MOVEMENT_THRESHOLD && 
                       timeDiff < MAX_CLICK_TIME;
        
        console.log('🖱️ Touch Release:', {
          timeDiff,
          distance,
          hasMoved: lastTouchRef.current.hasMoved,
          isClick,
          startPos: { x: lastTouchRef.current.startX, y: lastTouchRef.current.startY },
          endPos: { x: lastTouchRef.current.x, y: lastTouchRef.current.y }
        });

        if (isClick) {
          const { x, y } = lastTouchRef.current;
          console.log('🖱️ Click detected:', { x, y });
          sendMouseClick('left', x, y);
        } else {
          console.log('🖱️ Drag detected (no click)');
        }
      }
    });
  }, [isSessionActive, videoSize, videoRenderSize, sendMouseMove, sendMouseClick]);


  // Klavye toggle
  const toggleKeyboard = useCallback(() => {
    if (showKeyboard) {
      Keyboard.dismiss();
      setShowKeyboard(false);
    } else {
      setShowKeyboard(true);
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    }
  }, [showKeyboard]);

  // Klavye input gönder
  const handleKeyboardSubmit = useCallback(() => {
    if (keyboardText.trim()) {
      sendKeyboardInput(keyboardText.trim());
      setKeyboardText('');
    }
  }, [keyboardText, sendKeyboardInput]);

  // Özel tuş gönder (Enter, Backspace, vb.)
  const sendSpecialKey = useCallback((key) => {
    const keyMap = {
      enter: 'return',
      backspace: 'backspace',
      tab: 'tab',
      escape: 'escape'
    };
    sendKeyboardInput(null, [keyMap[key] || key]);
  }, [sendKeyboardInput]);

  // Oturumu başlat/durdur
  const handleSessionToggle = useCallback(() => {
    if (isSessionActive) {
      Alert.alert(
        t('remoteScreen.endSession'),
        'Oturumu sonlandırmak istediğinizden emin misiniz?',
        [
          { text: t('errors.goBack'), style: 'cancel' },
          {
            text: t('remoteScreen.endSession'),
            style: 'destructive',
            onPress: stopSession
          }
        ]
      );
    } else {
      startSession();
    }
  }, [isSessionActive, startSession, stopSession, t]);

  // Hata göster
  React.useEffect(() => {
    if (error) {
      Alert.alert(t('remoteScreen.error'), error);
    }
  }, [error, t]);

  // Video size değişimini logla
  React.useEffect(() => {
    console.log('📹 Video size state changed:', videoSize);
    console.log('📹 Session active:', isSessionActive);
  }, [videoSize, isSessionActive]);

  // Medya durumunu periyodik olarak güncelle
  React.useEffect(() => {
    if (!isSessionActive || !showMediaControls) return;

    const fetchMediaStatus = async () => {
      try {
        const response = await fetch(`http://${device.host}:${device.port}/media-status`);
        if (response.ok) {
          const status = await response.json();
          setMediaStatus(status);
        }
      } catch (error) {
        // Sessizce devam et
      }
    };

    fetchMediaStatus();
    const interval = setInterval(fetchMediaStatus, 2000); // Her 2 saniyede bir güncelle

    return () => clearInterval(interval);
  }, [isSessionActive, showMediaControls, device]);

  // Ses seviyesini periyodik olarak güncelle
  React.useEffect(() => {
    if (!isSessionActive || !showMediaControls) return;

    fetchVolume();
    const interval = setInterval(fetchVolume, 3000); // Her 3 saniyede bir güncelle

    return () => clearInterval(interval);
  }, [isSessionActive, showMediaControls, fetchVolume]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header Toggle Button - Sağ üstte */}
      {!showHeader && (
        <TouchableOpacity
          style={styles.headerToggleButton}
          onPress={() => setShowHeader(true)}
        >
          <View style={styles.headerToggleDot} />
        </TouchableOpacity>
      )}
      
      {/* Header */}
      {showHeader && (
        <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onBack}>
          <Image 
            source={leftIcon} 
            style={styles.headerBackIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('remoteScreen.title')}</Text>
          <Text style={styles.headerSubtitle}>{device.name}</Text>
        </View>
        
        <View style={styles.headerRight}>
          {isSessionActive && (
            <>
              <TouchableOpacity 
                style={styles.headerIconButton} 
                onPress={() => setShowMediaControls(!showMediaControls)}
              >
                <Image 
                  source={showMediaControls ? pauseIcon : playIcon} 
                  style={[styles.headerIconImage, showMediaControls && styles.headerIconImageActive]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.headerIconButton} 
                onPress={() => setShowZoomControls(!showZoomControls)}
              >
                <Image 
                  source={plusIcon} 
                  style={[styles.headerIconImage, showZoomControls && styles.headerIconImageActive]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              
              {/* <TouchableOpacity 
                style={styles.headerIconButton} 
                onPress={toggleKeyboard}
              >
                <Image 
                  source={keyboardDownIcon} 
                  style={[styles.headerIconImage, showKeyboard && styles.headerIconImageActive]}
                  resizeMode="contain"
                />
              </TouchableOpacity> */}
              
              <TouchableOpacity 
                style={styles.headerIconButton} 
                onPress={handleSessionToggle}
              >
                <Image 
                  source={plugConnectionIcon} 
                  style={[styles.headerIconImage, { tintColor: '#d32f2f' }]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </>
          )}
          
          {/* <TouchableOpacity style={styles.headerButton} onPress={onDisconnect}>
            <Image 
              source={plugConnectionIcon} 
              style={[styles.headerBackIcon, { tintColor: '#fff' }]}
              resizeMode="contain"
            />
          </TouchableOpacity> */}
          
          {/* Header'ı gizle butonu */}
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => setShowHeader(false)}
          >
            <View style={styles.headerHideDot} />
          </TouchableOpacity>
        </View>
      </View>
      )}

      {/* Video Stream */}
      <View 
        style={styles.videoContainer}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          console.log('📹 videoContainer layout:', { width, height });
        }}
      >
        {!isSessionActive && !isConnecting && (
          <View style={styles.placeholder}>
            <Image 
              source={screenPlayIcon} 
              style={styles.placeholderIcon}
              resizeMode="contain"
            />
            <Text style={styles.placeholderText}>
              {t('remoteScreen.touchToControl')}
            </Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => {
                // Önce ekran kaynaklarını al
                fetchScreenSources();
                setShowSourceSelector(true);
              }}
            >
              <Image 
                source={screenPlayIcon} 
                style={styles.startButtonIcon}
                resizeMode="contain"
              />
              <Text style={styles.startButtonText}>
                {t('remoteScreen.startSession')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isConnecting && (
          <View style={styles.placeholder}>
            <Image 
              source={plugConnectionIcon} 
              style={styles.connectingIcon}
              resizeMode="contain"
            />
            <ActivityIndicator size="large" color="#00C853" style={styles.connectingSpinner} />
            <Text style={styles.placeholderText}>
              {t('remoteScreen.connecting')}
            </Text>
          </View>
        )}

        {isSessionActive && remoteStream && (
          <View style={styles.videoWrapper}>
            <View
              style={styles.touchOverlay}
              onLayout={handleVideoLayout}
              {...panResponder.panHandlers}
            >
              <View
                style={[
                  styles.videoContainerInner,
                  {
                    transform: [
                      { scale: zoomLevel },
                      { translateX: panOffset.x },
                      { translateY: panOffset.y }
                    ]
                  }
                ]}
              >
                <RTCView
                  streamURL={remoteStream.toURL()}
                  style={styles.video}
                  objectFit="contain"
                />
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Medya Kontrol Paneli */}
      {showMediaControls && isSessionActive && (
        <View style={styles.mediaContainer}>
          <View style={styles.mediaInfo}>
            <Image 
              source={playIcon} 
              style={[styles.mediaInfoIcon, { tintColor: '#999' }]}
              resizeMode="contain"
            />
            <Text style={styles.mediaInfoText}>
              {mediaStatus.title}
              {mediaStatus.artist ? ` - ${mediaStatus.artist}` : ''}
            </Text>
          </View>
          
          <View style={styles.mediaControls}>
            
            <TouchableOpacity
              style={styles.mediaButton}
              onPress={() => sendMediaControl('seekbackward')}
            >
              <Image 
                source={minusSmallIcon} 
                style={styles.mediaSeekIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.mediaButton, styles.mediaButtonPrimary]}
              onPress={() => sendMediaControl('playpause')}
            >
              <Image 
                source={mediaStatus.isPlaying ? pauseIcon : playIcon} 
                style={styles.mediaButtonPrimaryIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.mediaButton}
              onPress={() => sendMediaControl('seekforward')}
            >
              <Image 
                source={plusIcon} 
                style={styles.mediaSeekIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
            
          </View>
          
          {mediaStatus.duration > 0 && (
            <View style={styles.mediaProgress}>
              <TouchableOpacity
                style={styles.mediaProgressBar}
                activeOpacity={1}
                onLayout={(event) => {
                  const { width } = event.nativeEvent.layout;
                  if (width > 0) {
                    progressBarWidthRef.current = width;
                  }
                }}
                onPress={(event) => {
                  const { locationX } = event.nativeEvent;
                  const progressBarWidth = progressBarWidthRef.current || 300;
                  const percentage = Math.max(0, Math.min(1, locationX / progressBarWidth));
                  const newPosition = Math.max(0, Math.min(mediaStatus.duration, percentage * mediaStatus.duration));
                  
                  // Medya pozisyonunu güncelle
                  setMediaStatus(prev => ({ ...prev, position: newPosition }));
                  
                  console.log('🎵 Seek to:', newPosition, 'seconds (', percentage * 100, '%)');
                }}
              >
                <View style={styles.mediaProgressBarInner}>
                  <View 
                    style={[
                      styles.mediaProgressFill, 
                      { width: `${(mediaStatus.position / mediaStatus.duration) * 100}%` }
                    ]} 
                  />
                </View>
              </TouchableOpacity>
              <Text style={styles.mediaTimeText}>
                {formatTime(mediaStatus.position)} / {formatTime(mediaStatus.duration)}
              </Text>
            </View>
          )}

          {/* Ses Seviyesi Kontrolü */}
          <View style={styles.volumeContainer}>
            <View style={styles.volumeHeader}>
              <Image 
                source={volumeIcon} 
                style={[styles.volumeHeaderIcon, { tintColor: '#999' }]}
                resizeMode="contain"
              />
              <Text style={styles.volumeLabel}>Ses Seviyesi</Text>
              <Text style={styles.volumeValue}>{Math.round(volume)}%</Text>
            </View>
            
            <View style={styles.volumeControls}>
              <TouchableOpacity
                style={styles.volumeButton}
                onPress={() => {
                  const newVolume = Math.max(0, volume - 10);
                  setVolumeLevel(newVolume);
                }}
              >
                <Image 
                  source={minusSmallIcon} 
                  style={styles.volumeButtonIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.volumeSliderContainer}
                activeOpacity={1}
                onLayout={(event) => {
                  const { width } = event.nativeEvent.layout;
                  if (width > 0) {
                    volumeSliderWidthRef.current = width;
                  }
                }}
                onPress={(event) => {
                  const { locationX } = event.nativeEvent;
                  const sliderWidth = volumeSliderWidthRef.current || 200;
                  const percentage = Math.max(0, Math.min(1, locationX / sliderWidth));
                  const newVolume = Math.round(percentage * 100);
                  setVolumeLevel(newVolume);
                }}
              >
                <View style={styles.volumeSliderTrack}>
                  <View 
                    style={[
                      styles.volumeSliderFill, 
                      { width: `${volume}%` }
                    ]} 
                  />
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.volumeButton}
                onPress={() => {
                  const newVolume = Math.min(100, volume + 10);
                  setVolumeLevel(newVolume);
                }}
              >
                <Image 
                  source={plusIcon} 
                  style={styles.volumeButtonIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.volumeButton}
                onPress={() => {
                  sendVolumeControl('mute');
                  // Mute durumunu toggle etmek için kısa bir delay sonra volume'u yeniden al
                  setTimeout(() => fetchVolume(), 200);
                }}
              >
                <Image 
                  source={volumeMuteIcon} 
                  style={styles.volumeButtonIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Zoom Kontrolleri Paneli */}
      {showZoomControls && isSessionActive && (
        <View style={styles.zoomContainer}>
          {/* Zoom Seviyesi */}
          <View style={styles.zoomHeader}>
            <Image 
              source={plusIcon} 
              style={[styles.zoomHeaderIcon, { tintColor: '#999' }]}
              resizeMode="contain"
            />
            <Text style={styles.zoomLabel}>Yakınlaştırma</Text>
            <Text style={styles.zoomValue}>{Math.round(zoomLevel * 100)}%</Text>
          </View>
          
          <View style={styles.zoomControls}>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={() => {
                const newZoom = Math.max(0.5, zoomLevel - 0.25);
                setZoomLevel(newZoom);
                // Zoom değiştiğinde pan offset'i sıfırla (merkeze dön)
                setPanOffset({ x: 0, y: 0 });
              }}
            >
              <Image 
                source={minusSmallIcon} 
                style={styles.zoomButtonIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.zoomSliderContainer}
              activeOpacity={1}
              onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                if (width > 0) {
                  volumeSliderWidthRef.current = width; // Mevcut ref'i kullan
                }
              }}
              onPress={(event) => {
                const { locationX } = event.nativeEvent;
                const sliderWidth = volumeSliderWidthRef.current || 200;
                const percentage = Math.max(0, Math.min(1, locationX / sliderWidth));
                // 0.5x ile 3.0x arasında zoom
                const newZoom = 0.5 + (percentage * 2.5);
                setZoomLevel(newZoom);
                // Zoom değiştiğinde pan offset'i sıfırla (merkeze dön)
                setPanOffset({ x: 0, y: 0 });
              }}
            >
              <View style={styles.zoomSliderTrack}>
                <View 
                  style={[
                    styles.zoomSliderFill, 
                    { width: `${((zoomLevel - 0.5) / 2.5) * 100}%` }
                  ]} 
                />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={() => {
                const newZoom = Math.min(3.0, zoomLevel + 0.25);
                setZoomLevel(newZoom);
                // Zoom değiştiğinde pan offset'i sıfırla (merkeze dön)
                setPanOffset({ x: 0, y: 0 });
              }}
            >
              <Image 
                source={plusIcon} 
                style={styles.zoomButtonIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={() => {
                // Zoom'u sıfırla (1.0x)
                setZoomLevel(1.0);
                setPanOffset({ x: 0, y: 0 });
              }}
            >
              <Text style={styles.zoomResetText}>1x</Text>
            </TouchableOpacity>
          </View>
          
          {/* Pan Kontrolleri (Hareket) */}
          <View style={styles.panContainer}>
            <View style={styles.panHeader}>
              <Image 
                source={leftIcon} 
                style={[styles.panHeaderIcon, { tintColor: '#999' }]}
                resizeMode="contain"
              />
              <Text style={styles.panLabel}>Ekran Hareketi</Text>
            </View>
            
            <View style={styles.panControls}>
              {/* Yukarı */}
              <View style={styles.panRow}>
                <View style={styles.panSpacer} />
                <TouchableOpacity
                  style={styles.panButton}
                  onPress={() => {
                    setPanOffset(prev => ({ ...prev, y: Math.min(prev.y + 50, 500) }));
                  }}
                >
                  <Image 
                    source={leftIcon} 
                    style={[styles.panButtonIcon, { transform: [{ rotate: '90deg' }] }]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <View style={styles.panSpacer} />
              </View>
              
              {/* Sola - Sağa */}
              <View style={styles.panRow}>
                <TouchableOpacity
                  style={styles.panButton}
                  onPress={() => {
                    setPanOffset(prev => ({ ...prev, x: Math.max(prev.x - 50, -500) }));
                  }}
                >
                  <Image 
                    source={leftIcon} 
                    style={[styles.panButtonIcon, { transform: [{ rotate: '180deg' }] }]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                
                <View style={styles.panCenter}>
                  <TouchableOpacity
                    style={styles.panResetButton}
                    onPress={() => {
                      setPanOffset({ x: 0, y: 0 });
                    }}
                  >
                    <Text style={styles.panResetText}>Merkez</Text>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity
                  style={styles.panButton}
                  onPress={() => {
                    setPanOffset(prev => ({ ...prev, x: Math.min(prev.x + 50, 500) }));
                  }}
                >
                  <Image 
                    source={leftIcon} 
                    style={styles.panButtonIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
              
              {/* Aşağı */}
              <View style={styles.panRow}>
                <View style={styles.panSpacer} />
                <TouchableOpacity
                  style={styles.panButton}
                  onPress={() => {
                    setPanOffset(prev => ({ ...prev, y: Math.max(prev.y - 50, -500) }));
                  }}
                >
                  <Image 
                    source={leftIcon} 
                    style={[styles.panButtonIcon, { transform: [{ rotate: '-90deg' }] }]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <View style={styles.panSpacer} />
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Klavye Input */}
      {/* {showKeyboard && (
        <View style={styles.keyboardContainer}>
          <View style={styles.keyboardRow}>
            <TouchableOpacity
              style={styles.specialKeyButton}
              onPress={() => sendSpecialKey('escape')}
            >
              <Text style={styles.specialKeyText}>ESC</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.specialKeyButton}
              onPress={() => sendSpecialKey('tab')}
            >
              <Text style={styles.specialKeyText}>TAB</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.specialKeyButton}
              onPress={() => sendSpecialKey('backspace')}
            >
              <Image 
                source={leftIcon} 
                style={[styles.specialKeyIcon, { tintColor: '#fff' }]}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.textInputRow}>
            <TextInput
              ref={textInputRef}
              style={styles.textInput}
              value={keyboardText}
              onChangeText={setKeyboardText}
              onSubmitEditing={handleKeyboardSubmit}
              placeholder="Metin yazın..."
              placeholderTextColor="#999"
              autoCorrect={false}
              autoCapitalize="none"
            />
            
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleKeyboardSubmit}
            >
              <Image 
                source={playIcon} 
                style={[styles.sendButtonIcon, { tintColor: '#fff' }]}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => sendSpecialKey('enter')}
            >
              <Image 
                source={playIcon} 
                style={[styles.sendButtonIcon, { tintColor: '#fff' }]}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>
      )} */}

      {/* Zoom Kontrolleri Paneli - Video üstünde floating */}
      {showZoomControls && isSessionActive && (
        <View style={styles.zoomPanelOverlay}>
          <View style={styles.zoomPanel}>
            {/* Zoom Seviyesi - Kompakt */}
            <View style={styles.zoomCompactHeader}>
              <Text style={styles.zoomCompactLabel}>{Math.round(zoomLevel * 100)}%</Text>
              <TouchableOpacity
                style={styles.zoomCloseButton}
                onPress={() => setShowZoomControls(false)}
              >
                <Image 
                  source={pauseIcon} 
                  style={[styles.zoomCloseIcon, { tintColor: '#999' }]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.zoomCompactControls}>
              <TouchableOpacity
                style={styles.zoomCompactButton}
                onPress={() => {
                  const newZoom = Math.max(0.5, zoomLevel - 0.25);
                  setZoomLevel(newZoom);
                  setPanOffset({ x: 0, y: 0 });
                }}
              >
                <Image 
                  source={minusSmallIcon} 
                  style={styles.zoomCompactButtonIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.zoomCompactSliderContainer}
                activeOpacity={1}
                onLayout={(event) => {
                  const { width } = event.nativeEvent.layout;
                  if (width > 0) {
                    volumeSliderWidthRef.current = width;
                  }
                }}
                onPress={(event) => {
                  const { locationX } = event.nativeEvent;
                  const sliderWidth = volumeSliderWidthRef.current || 150;
                  const percentage = Math.max(0, Math.min(1, locationX / sliderWidth));
                  const newZoom = 0.5 + (percentage * 2.5);
                  setZoomLevel(newZoom);
                  setPanOffset({ x: 0, y: 0 });
                }}
              >
                <View style={styles.zoomCompactSliderTrack}>
                  <View 
                    style={[
                      styles.zoomCompactSliderFill, 
                      { width: `${((zoomLevel - 0.5) / 2.5) * 100}%` }
                    ]} 
                  />
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.zoomCompactButton}
                onPress={() => {
                  const newZoom = Math.min(3.0, zoomLevel + 0.25);
                  setZoomLevel(newZoom);
                  setPanOffset({ x: 0, y: 0 });
                }}
              >
                <Image 
                  source={plusIcon} 
                  style={styles.zoomCompactButtonIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.zoomCompactButton}
                onPress={() => {
                  setZoomLevel(1.0);
                  setPanOffset({ x: 0, y: 0 });
                }}
              >
                <Text style={styles.zoomCompactResetText}>1x</Text>
              </TouchableOpacity>
            </View>
            
            {/* Pan Kontrolleri - Kompakt */}
            <View style={styles.panCompactContainer}>
              <View style={styles.panCompactGrid}>
                <View style={styles.panCompactSpacer} />
                <TouchableOpacity
                  style={styles.panCompactButton}
                  onPress={() => {
                    setPanOffset(prev => ({ ...prev, y: Math.min(prev.y + 50, 500) }));
                  }}
                >
                  <Image 
                    source={leftIcon} 
                    style={[styles.panCompactButtonIcon, { transform: [{ rotate: '90deg' }] }]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <View style={styles.panCompactSpacer} />
              </View>
              
              <View style={styles.panCompactGrid}>
                <TouchableOpacity
                  style={styles.panCompactButton}
                  onPress={() => {
                    setPanOffset(prev => ({ ...prev, x: Math.max(prev.x - 50, -500) }));
                  }}
                >
                  <Image 
                    source={leftIcon} 
                    style={[styles.panCompactButtonIcon, { transform: [{ rotate: '180deg' }] }]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.panCompactCenterButton}
                  onPress={() => {
                    setPanOffset({ x: 0, y: 0 });
                  }}
                >
                  <Text style={styles.panCompactCenterText}>O</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.panCompactButton}
                  onPress={() => {
                    setPanOffset(prev => ({ ...prev, x: Math.min(prev.x + 50, 500) }));
                  }}
                >
                  <Image 
                    source={leftIcon} 
                    style={styles.panCompactButtonIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
              
              <View style={styles.panCompactGrid}>
                <View style={styles.panCompactSpacer} />
                <TouchableOpacity
                  style={styles.panCompactButton}
                  onPress={() => {
                    setPanOffset(prev => ({ ...prev, y: Math.max(prev.y - 50, -500) }));
                  }}
                >
                  <Image 
                    source={leftIcon} 
                    style={[styles.panCompactButtonIcon, { transform: [{ rotate: '-90deg' }] }]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <View style={styles.panCompactSpacer} />
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Ekran/Pencere Seçim Modal */}
      {showSourceSelector && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ekran/Pencere Seç</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowSourceSelector(false)}
              >
                <Image 
                  source={pauseIcon} 
                  style={[styles.modalCloseIcon, { tintColor: '#fff' }]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              {/* Ekranlar */}
              {screenSources.screens && screenSources.screens.length > 0 && (
                <View style={styles.sourceSection}>
                  <Text style={styles.sourceSectionTitle}>Ekranlar</Text>
                  <View style={styles.sourceGrid}>
                    {screenSources.screens.map((source) => (
                      <TouchableOpacity
                        key={source.id}
                        style={[
                          styles.sourceItem,
                          selectedSourceId === source.id && styles.sourceItemSelected
                        ]}
                        onPress={() => setSelectedSourceId(source.id)}
                      >
                        {source.thumbnail && (
                          <Image 
                            source={{ uri: source.thumbnail }} 
                            style={styles.sourceThumbnail}
                            resizeMode="cover"
                          />
                        )}
                        <Text style={styles.sourceName} numberOfLines={2}>
                          {source.name}
                        </Text>
                        {selectedSourceId === source.id && (
                          <View style={styles.sourceCheck}>
                            <Image 
                              source={playIcon} 
                              style={[styles.sourceCheckIcon, { tintColor: '#00C853' }]}
                              resizeMode="contain"
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Pencereler */}
              {screenSources.windows && screenSources.windows.length > 0 && (
                <View style={styles.sourceSection}>
                  <Text style={styles.sourceSectionTitle}>Pencereler</Text>
                  <View style={styles.sourceGrid}>
                    {screenSources.windows.map((source) => (
                      <TouchableOpacity
                        key={source.id}
                        style={[
                          styles.sourceItem,
                          selectedSourceId === source.id && styles.sourceItemSelected
                        ]}
                        onPress={() => setSelectedSourceId(source.id)}
                      >
                        {source.thumbnail && (
                          <Image 
                            source={{ uri: source.thumbnail }} 
                            style={styles.sourceThumbnail}
                            resizeMode="cover"
                          />
                        )}
                        <Text style={styles.sourceName} numberOfLines={2}>
                          {source.name}
                        </Text>
                        {selectedSourceId === source.id && (
                          <View style={styles.sourceCheck}>
                            <Image 
                              source={playIcon} 
                              style={[styles.sourceCheckIcon, { tintColor: '#00C853' }]}
                              resizeMode="contain"
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowSourceSelector(false)}
              >
                <Text style={styles.modalCancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, !selectedSourceId && styles.modalConfirmButtonDisabled]}
                onPress={async () => {
                  if (selectedSourceId) {
                    const sourceIdToUse = selectedSourceId;
                    setShowSourceSelector(false);
                    
                    // Seçilen ekranın boyutunu al
                    try {
                      const response = await fetch(`http://${device.host}:${device.port}/screen-info?sourceId=${encodeURIComponent(sourceIdToUse)}`);
                      if (response.ok) {
                        const screenInfo = await response.json();
                        if (screenInfo.success && screenInfo.screenSize) {
                          console.log('📹 Seçilen ekran boyutu güncelleniyor:', screenInfo.screenSize);
                          setDesktopScreenSize(screenInfo.screenSize);
                        }
                      }
                    } catch (error) {
                      console.warn('⚠️ Screen info alınamadı:', error.message);
                    }
                    
                    // Kısa bir delay ile modal kapanmasını bekle
                    await new Promise(resolve => setTimeout(resolve, 100));
                    // Seçilen sourceId'yi parametre olarak geç
                    startSession(sourceIdToUse);
                  }
                }}
                disabled={!selectedSourceId}
              >
                <Text style={styles.modalConfirmButtonText}>Başlat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1e1e1e',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    minHeight: 50
  },
  headerButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerBackIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  headerIconButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerIconImage: {
    width: 20,
    height: 20,
    tintColor: '#fff'
  },
  headerIconImageActive: {
    tintColor: '#00C853'
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#999',
    marginTop: 1
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000'
  },
  videoWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden'
  },
  touchOverlay: {
    flex: 1,
    width: '100%',
    height: '100%'
  },
  videoContainerInner: {
    width: '100%',
    height: '100%',
    transformOrigin: 'center center'
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000'
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  placeholderIcon: {
    width: 120,
    height: 120,
    opacity: 0.6,
    marginBottom: 20
  },
  connectingIcon: {
    width: 80,
    height: 80,
    opacity: 0.7,
    marginBottom: 20
  },
  connectingSpinner: {
    marginTop: -100,
    marginBottom: 20
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    marginTop: 20,
    marginBottom: 30,
    textAlign: 'center'
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C853',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8
  },
  startButtonIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff'
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  controls: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#333'
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8
  },
  controlButtonDanger: {
    backgroundColor: '#d32f2f'
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff'
  },
  mediaContainer: {
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333'
  },
  mediaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12
  },
  mediaInfoIcon: {
    width: 16,
    height: 16
  },
  mediaInfoText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500'
  },
  mediaControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 12
  },
  mediaButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center'
  },
  mediaButtonPrimary: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#00C853'
  },
  mediaButtonIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff'
  },
  mediaButtonIconRotated: {
    transform: [{ rotate: '180deg' }]
  },
  mediaButtonPrimaryIcon: {
    width: 32,
    height: 32,
    tintColor: '#fff'
  },
  mediaSeekText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff'
  },
  mediaSeekIcon: {
    width: 20,
    height: 20,
    tintColor: '#fff'
  },
  mediaProgress: {
    marginTop: 8
  },
  mediaProgressBar: {
    height: 40,
    marginBottom: 8,
    justifyContent: 'center'
  },
  mediaProgressBarInner: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2
  },
  mediaProgressFill: {
    height: '100%',
    backgroundColor: '#00C853',
    borderRadius: 2
  },
  mediaTimeText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center'
  },
  keyboardContainer: {
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333'
  },
  keyboardRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8
  },
  specialKeyButton: {
    flex: 1,
    backgroundColor: '#444',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  specialKeyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff'
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  volumeContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333'
  },
  volumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  volumeHeaderIcon: {
    width: 16,
    height: 16
  },
  volumeLabel: {
    flex: 1,
    fontSize: 12,
    color: '#999',
    fontWeight: '500'
  },
  volumeValue: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right'
  },
  volumeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  volumeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center'
  },
  volumeButtonIcon: {
    width: 20,
    height: 20,
    tintColor: '#fff'
  },
  volumeSliderContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center'
  },
  volumeSliderTrack: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2
  },
  volumeSliderFill: {
    height: '100%',
    backgroundColor: '#00C853',
    borderRadius: 2
  },
  textInput: {
    flex: 1,
    backgroundColor: '#333',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16
  },
  sendButton: {
    backgroundColor: '#00C853',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendButtonIcon: {
    width: 24,
    height: 24
  },
  specialKeyIcon: {
    width: 20,
    height: 20
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000 // Android için
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  modalCloseButton: {
    padding: 4
  },
  modalCloseIcon: {
    width: 24,
    height: 24
  },
  modalBody: {
    maxHeight: 400
  },
  modalBodyContent: {
    padding: 16
  },
  sourceSection: {
    marginBottom: 20
  },
  sourceSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12
  },
  sourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  sourceItem: {
    width: '47%',
    backgroundColor: '#333',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  sourceItemSelected: {
    borderColor: '#00C853'
  },
  sourceThumbnail: {
    width: '100%',
    height: 100,
    backgroundColor: '#222'
  },
  sourceName: {
    padding: 8,
    fontSize: 12,
    color: '#fff',
    textAlign: 'center'
  },
  sourceCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 2
  },
  sourceCheckIcon: {
    width: 24,
    height: 24
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 12
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#00C853',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  modalConfirmButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  headerToggleButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001,
    elevation: 1001 // Android için
  },
  headerToggleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff'
  },
  headerHideDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#999'
  },
  zoomPanelOverlay: {
    position: 'absolute',
    bottom: 80,
    right: 12,
    zIndex: 100,
    elevation: 100
  },
  zoomPanel: {
    backgroundColor: 'rgba(30, 30, 30, 0.92)',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#444',
    minWidth: 140,
    maxWidth: 160
  },
  zoomCompactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  zoomCompactLabel: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600'
  },
  zoomCloseButton: {
    padding: 2,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  zoomCloseIcon: {
    width: 12,
    height: 12
  },
  zoomCompactControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8
  },
  zoomCompactButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center'
  },
  zoomCompactButtonIcon: {
    width: 14,
    height: 14,
    tintColor: '#fff'
  },
  zoomCompactSliderContainer: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  zoomCompactSliderTrack: {
    height: 3,
    backgroundColor: '#333',
    borderRadius: 2
  },
  zoomCompactSliderFill: {
    height: '100%',
    backgroundColor: '#00C853',
    borderRadius: 2
  },
  zoomCompactResetText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#fff'
  },
  panCompactContainer: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#444'
  },
  panCompactGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4
  },
  panCompactSpacer: {
    width: 28,
    height: 28
  },
  panCompactButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center'
  },
  panCompactButtonIcon: {
    width: 16,
    height: 16,
    tintColor: '#fff'
  },
  panCompactCenterButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#444',
    alignItems: 'center',
    justifyContent: 'center'
  },
  panCompactCenterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff'
  }
});

