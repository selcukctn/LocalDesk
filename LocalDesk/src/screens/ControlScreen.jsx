import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert
} from 'react-native';
import { ButtonGrid } from '../components/ButtonGrid';

export const ControlScreen = ({
  device,
  shortcuts,
  isConnected,
  isPairing,
  onExecuteShortcut,
  onDisconnect
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleDisconnect = () => {
    Alert.alert(
      'Bağlantıyı Kes',
      'Bu cihazdan bağlantıyı kesmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kes',
          style: 'destructive',
          onPress: onDisconnect
        }
      ]
    );
  };

  const getStatusText = () => {
    if (isPairing) return 'Eşleşiyor...';
    if (isConnected) return 'Bağlı';
    return 'Bağlanıyor...';
  };

  const getStatusColor = () => {
    if (isConnected) return '#00C853';
    if (isPairing) return '#FF9800';
    return '#808080';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1e1e" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>🎮 Local Desk</Text>
          <View style={styles.connectionInfo}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.deviceName}>{device?.name || 'Bilinmeyen'}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenu(!showMenu)}
        >
          <Text style={styles.menuIcon}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Menu Dropdown */}
      {showMenu && (
        <View style={styles.menuDropdown}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              handleDisconnect();
            }}
          >
            <Text style={styles.menuItemIcon}>🔌</Text>
            <Text style={styles.menuItemText}>Bağlantıyı Kes</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Status Banner */}
      <View style={styles.statusBanner}>
        <Text style={styles.statusText}>{getStatusText()}</Text>
        {device && (
          <Text style={styles.statusSubtext}>
            {device.host}:{device.port}
          </Text>
        )}
      </View>

      {/* Button Grid */}
      <View style={styles.content}>
        {isPairing ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingIcon}>🔐</Text>
            <Text style={styles.loadingText}>Eşleşme onayı bekleniyor...</Text>
            <Text style={styles.loadingSubtext}>
              Masaüstü uygulamasından bağlantı isteğini onaylayın
            </Text>
          </View>
        ) : (
          <ButtonGrid
            shortcuts={shortcuts}
            onPress={onExecuteShortcut}
            disabled={!isConnected}
          />
        )}
      </View>

      {/* Footer Info */}
      {isConnected && shortcuts && shortcuts.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {shortcuts.length} kısayol aktif
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e'
  },
  header: {
    backgroundColor: '#252526',
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#3e3e42',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerLeft: {
    flex: 1
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#CCCCCC',
    marginBottom: 4
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  deviceName: {
    fontSize: 14,
    color: '#808080'
  },
  menuButton: {
    padding: 8
  },
  menuIcon: {
    fontSize: 24,
    color: '#CCCCCC'
  },
  menuDropdown: {
    position: 'absolute',
    top: 90,
    right: 16,
    backgroundColor: '#2d2d30',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3e3e42',
    minWidth: 200,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12
  },
  menuItemIcon: {
    fontSize: 18
  },
  menuItemText: {
    fontSize: 16,
    color: '#CCCCCC'
  },
  statusBanner: {
    backgroundColor: '#252526',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#3e3e42'
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 2
  },
  statusSubtext: {
    fontSize: 11,
    color: '#808080',
    fontFamily: 'monospace'
  },
  content: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  loadingIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 8,
    textAlign: 'center'
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#808080',
    textAlign: 'center',
    lineHeight: 20
  },
  footer: {
    backgroundColor: '#252526',
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#3e3e42'
  },
  footerText: {
    fontSize: 12,
    color: '#808080'
  }
});

