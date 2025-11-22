import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Alert
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import OrientationLocker from 'react-native-orientation-locker';
import { I18nProvider, useI18n } from './src/contexts/I18nContext';
import { DiscoveryScreen } from './src/screens/DiscoveryScreen';
import { PageListScreen } from './src/screens/PageListScreen';
import { ControlScreen } from './src/screens/ControlScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { RemoteScreenScreen } from './src/screens/RemoteScreenScreen';
import { useConnection } from './src/hooks/useConnection';

function AppContent() {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showRemoteScreen, setShowRemoteScreen] = useState(false);
  const { t } = useI18n();
  
  const {
    isConnected,
    isPairing,
    currentDevice,
    pages,
    shortcuts,
    error,
    connect,
    disconnect,
    executeShortcut,
    socket
  } = useConnection();

  // Tüm uygulama için yatay mod zorla
  useEffect(() => {
    OrientationLocker.lockToLandscape();
    
    return () => {
      OrientationLocker.unlockAllOrientations();
    };
  }, []);

  // Cihaz seçildiğinde bağlan
  const handleDeviceSelect = async (device) => {
    setSelectedDevice(device);
    await connect(device);
  };

  // Bağlantıyı kes
  const handleDisconnect = () => {
    disconnect();
    setSelectedDevice(null);
    setSelectedPage(null);
    setShowRemoteScreen(false);
  };

  // Remote Screen'e geç
  const handleRemoteScreenOpen = () => {
    setShowRemoteScreen(true);
    setSelectedPage(null);
  };

  // Remote Screen'den geri dön
  const handleRemoteScreenBack = () => {
    setShowRemoteScreen(false);
  };

  // Sayfa seçimi
  const handlePageSelect = (page) => {
    setSelectedPage(page);
  };

  // Sayfa listesine geri dön
  const handleBackToPages = () => {
    setSelectedPage(null);
  };

  // Kısayol çalıştır
  const handleExecuteShortcut = (shortcut) => {
    try {
      executeShortcut(shortcut);
      // Haptic feedback (optional)
      // Vibration.vibrate(50);
    } catch (err) {
      Alert.alert(t('errors.shortcutError'), t('errors.shortcutFailed'));
    }
  };

  // Sayfalar güncellendiğinde seçili sayfayı da güncelle
  React.useEffect(() => {
    if (selectedPage && pages.length > 0) {
      // Seçili sayfayı güncel pages listesinden bul
      const updatedPage = pages.find(p => p.id === selectedPage.id);
      if (updatedPage) {
        setSelectedPage(updatedPage);
        console.log('📄 Seçili sayfa güncellendi:', updatedPage.name, 'Kısayol sayısı:', updatedPage.shortcuts?.length);
      }
    }
  }, [pages]);

  // Hata göster
  React.useEffect(() => {
    if (error) {
      Alert.alert(t('errors.connectionError'), error, [
        {
          text: t('errors.tryAgain'),
          onPress: () => {
            if (selectedDevice) {
              connect(selectedDevice);
            }
          }
        },
        {
          text: t('errors.goBack'),
          style: 'cancel',
          onPress: handleDisconnect
        }
      ]);
    }
  }, [error, t]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1e1e" />
      
      {showSettings ? (
        // Ayarlar ekranı
        <SettingsScreen onBack={() => setShowSettings(false)} />
      ) : !selectedDevice ? (
        // Discovery ekranı - Cihaz seçimi
        <DiscoveryScreen 
          onDeviceSelect={handleDeviceSelect}
          onSettingsPress={() => setShowSettings(true)}
        />
      ) : showRemoteScreen ? (
        // Remote Screen ekranı - Uzaktan kontrol
        <RemoteScreenScreen
          device={currentDevice || selectedDevice}
          socket={socket}
          onBack={handleRemoteScreenBack}
          onDisconnect={handleDisconnect}
        />
      ) : !selectedPage ? (
        // Sayfa listesi ekranı - Bağlandıktan sonra
        <PageListScreen
          device={currentDevice || selectedDevice}
          pages={pages}
          isConnected={isConnected}
          isPairing={isPairing}
          onPageSelect={handlePageSelect}
          onRemoteScreenOpen={handleRemoteScreenOpen}
          onDisconnect={handleDisconnect}
        />
      ) : (
        // Control ekranı - Sayfa seçildikten sonra
        <ControlScreen
          device={currentDevice || selectedDevice}
          page={selectedPage}
          shortcuts={selectedPage.shortcuts || []}
          isConnected={isConnected}
          isPairing={isPairing}
          onExecuteShortcut={handleExecuteShortcut}
          onBack={handleBackToPages}
          onDisconnect={handleDisconnect}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e'
  }
});

function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AppContent />
      </I18nProvider>
    </SafeAreaProvider>
  );
}

export default App;

