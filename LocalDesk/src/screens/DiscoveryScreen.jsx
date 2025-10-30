import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { useDiscovery } from '../hooks/useDiscovery';

export const DiscoveryScreen = ({ onDeviceSelect }) => {
  const { devices, isScanning, error, startDiscovery, stopDiscovery } = useDiscovery();

  useEffect(() => {
    startDiscovery();
    
    return () => {
      stopDiscovery();
    };
  }, []);

  const handleDevicePress = (device) => {
    if (onDeviceSelect) {
      onDeviceSelect(device);
    }
  };

  const renderDevice = ({ item }) => (
    <TouchableOpacity
      style={styles.deviceCard}
      onPress={() => handleDevicePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.deviceIcon}>
        <Text style={styles.deviceIconText}>🖥️</Text>
      </View>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceHost}>{item.host}:{item.port}</Text>
        <View style={styles.deviceMeta}>
          <Text style={styles.deviceType}>{item.type}</Text>
          <View style={styles.dot} />
          <Text style={styles.discoveryMethod}>
            {item.discoveryMethod === 'udp' ? 'UDP' : 'mDNS'}
          </Text>
        </View>
      </View>
      <View style={styles.deviceArrow}>
        <Text style={styles.arrowText}>›</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyText}>Cihaz aranıyor...</Text>
      <Text style={styles.emptySubtext}>
        Masaüstü uygulamanızın açık ve aynı ağda olduğundan emin olun
      </Text>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1e1e" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>🎮 Local Desk</Text>
          <Text style={styles.subtitle}>Cihaz Bul</Text>
        </View>
        <View style={styles.statusBadge}>
          {isScanning && <ActivityIndicator size="small" color="#00C853" />}
          <Text style={styles.statusText}>
            {isScanning ? 'Aranıyor...' : 'Durduruldu'}
          </Text>
        </View>
      </View>

      {/* Device List */}
      <FlatList
        data={devices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      {/* Info Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Masaüstü uygulamanızı başlatın ve aynı Wi-Fi ağına bağlanın
        </Text>
      </View>
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
  headerContent: {
    flex: 1
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#CCCCCC',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#808080'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 8
  },
  statusText: {
    fontSize: 12,
    color: '#CCCCCC'
  },
  listContent: {
    padding: 16
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252526',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3e3e42'
  },
  deviceIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2d2d30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  deviceIconText: {
    fontSize: 24
  },
  deviceInfo: {
    flex: 1
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 4
  },
  deviceHost: {
    fontSize: 12,
    color: '#808080',
    fontFamily: 'monospace',
    marginBottom: 4
  },
  deviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  deviceType: {
    fontSize: 11,
    color: '#808080',
    textTransform: 'uppercase'
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#808080'
  },
  discoveryMethod: {
    fontSize: 11,
    color: '#1F6FEB',
    fontWeight: '600'
  },
  deviceArrow: {
    marginLeft: 12
  },
  arrowText: {
    fontSize: 24,
    color: '#808080'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 8,
    textAlign: 'center'
  },
  emptySubtext: {
    fontSize: 14,
    color: '#808080',
    textAlign: 'center',
    lineHeight: 20
  },
  errorText: {
    fontSize: 14,
    color: '#f44336',
    marginTop: 16,
    textAlign: 'center'
  },
  footer: {
    backgroundColor: '#252526',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#3e3e42'
  },
  footerText: {
    fontSize: 12,
    color: '#808080',
    textAlign: 'center',
    lineHeight: 18
  }
});

