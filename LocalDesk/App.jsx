import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Alert
} from 'react-native';
import { DiscoveryScreen } from './src/screens/DiscoveryScreen';
import { PageListScreen } from './src/screens/PageListScreen';
import { ControlScreen } from './src/screens/ControlScreen';
import { useConnection } from './src/hooks/useConnection';

function App() {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);
  
  const {
    isConnected,
    isPairing,
    currentDevice,
    pages,
    shortcuts,
    error,
    connect,
    disconnect,
    executeShortcut
  } = useConnection();

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
      Alert.alert('Hata', 'Kısayol çalıştırılamadı');
    }
  };

  // Hata göster
  React.useEffect(() => {
    if (error) {
      Alert.alert('Bağlantı Hatası', error, [
        {
          text: 'Tekrar Dene',
          onPress: () => {
            if (selectedDevice) {
              connect(selectedDevice);
            }
          }
        },
        {
          text: 'Geri Dön',
          style: 'cancel',
          onPress: handleDisconnect
        }
      ]);
    }
  }, [error]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1e1e" />
      
      {!selectedDevice ? (
        // Discovery ekranı - Cihaz seçimi
        <DiscoveryScreen onDeviceSelect={handleDeviceSelect} />
      ) : !selectedPage ? (
        // Sayfa listesi ekranı - Bağlandıktan sonra
        <PageListScreen
          device={currentDevice || selectedDevice}
          pages={pages}
          isConnected={isConnected}
          isPairing={isPairing}
          onPageSelect={handlePageSelect}
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

export default App;

