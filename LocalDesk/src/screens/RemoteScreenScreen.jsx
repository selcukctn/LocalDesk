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
  PanResponder
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useI18n } from '../contexts/I18nContext';
import { useRemoteScreen } from '../hooks/useRemoteScreen';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const RemoteScreenScreen = ({ device, socket, onBack, onDisconnect }) => {
  const { t } = useI18n();
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [keyboardText, setKeyboardText] = useState('');
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [videoRenderSize, setVideoRenderSize] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  const textInputRef = useRef(null);
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
  }, [device]);
  
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
    sendKeyboardInput
  } = useRemoteScreen(socket);

  // Video layout değişikliğinde boyutları al ve gerçek render boyutunu hesapla
  const handleVideoLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;
    console.log('📹 onLayout called:', { width, height });
    
    if (width > 0 && height > 0) {
      setVideoSize({ width, height });
      
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
    } else {
      console.warn('⚠️ Invalid video size:', { width, height });
    }
  };

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onBack}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('remoteScreen.title')}</Text>
          <Text style={styles.headerSubtitle}>{device.name}</Text>
        </View>
        
        <TouchableOpacity style={styles.headerButton} onPress={onDisconnect}>
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

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
            <Icon name="monitor" size={80} color="#555" />
            <Text style={styles.placeholderText}>
              {t('remoteScreen.touchToControl')}
            </Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleSessionToggle}
            >
              <Icon name="play-circle" size={24} color="#fff" />
              <Text style={styles.startButtonText}>
                {t('remoteScreen.startSession')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isConnecting && (
          <View style={styles.placeholder}>
            <ActivityIndicator size="large" color="#00C853" />
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
              <RTCView
                streamURL={remoteStream.toURL()}
                style={styles.video}
                objectFit="contain"
              />
            </View>
          </View>
        )}
      </View>

      {/* Controls */}
      {isSessionActive && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleKeyboard}
          >
            <Icon
              name={showKeyboard ? 'keyboard-off' : 'keyboard'}
              size={24}
              color="#fff"
            />
            <Text style={styles.controlButtonText}>
              {showKeyboard ? t('remoteScreen.hideKeyboard') : t('remoteScreen.showKeyboard')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.controlButtonDanger]}
            onPress={handleSessionToggle}
          >
            <Icon name="stop-circle" size={24} color="#fff" />
            <Text style={styles.controlButtonText}>
              {t('remoteScreen.endSession')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Klavye Input */}
      {showKeyboard && (
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
              <Icon name="backspace" size={20} color="#fff" />
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
              <Icon name="send" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => sendSpecialKey('enter')}
            >
              <Icon name="keyboard-return" size={24} color="#fff" />
            </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1e1e1e',
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  headerButton: {
    padding: 8,
    width: 40
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000'
  },
  videoWrapper: {
    flex: 1,
    position: 'relative'
  },
  touchOverlay: {
    flex: 1,
    width: '100%',
    height: '100%'
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
  }
});

