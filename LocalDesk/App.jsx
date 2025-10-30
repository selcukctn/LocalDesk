import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Alert
} from 'react-native';
import { DiscoveryScreen } from './src/screens/DiscoveryScreen';
import { ControlScreen } from './src/screens/ControlScreen';
import { useConnection } from './src/hooks/useConnection';

function App() {
  const [selectedDevice, setSelectedDevice] = useState(null);
  
  const {
    isConnected,
    isPairing,
    currentDevice,
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
        // Discovery ekranı
        <DiscoveryScreen onDeviceSelect={handleDeviceSelect} />
      ) : (
        // Control ekranı
        <ControlScreen
          device={currentDevice || selectedDevice}
          shortcuts={shortcuts}
          isConnected={isConnected}
          isPairing={isPairing}
          onExecuteShortcut={handleExecuteShortcut}
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

