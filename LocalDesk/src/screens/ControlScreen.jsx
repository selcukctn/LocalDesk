import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const ControlScreen = ({
  device,
  page,
  shortcuts,
  isConnected,
  isPairing,
  onExecuteShortcut,
  onBack,
  onDisconnect
}) => {
  const [headerExpanded, setHeaderExpanded] = useState(true);

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E27" />
      
      {/* Header */}
      <View style={styles.header}>
        {headerExpanded && (
          <>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={onBack}>
                <Text style={styles.wifiIcon}>◀️</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.headerCenter}>
              <Text style={styles.title}>{page?.name || 'Control Hub'}</Text>
            </View>
          </>
        )}
        <TouchableOpacity
          style={[styles.settingsButton, !headerExpanded && styles.settingsButtonCollapsed]}
          onPress={() => setHeaderExpanded(!headerExpanded)}
        >
          <Text style={styles.settingsIcon}>
            {headerExpanded ? '⬆️' : '⬇️'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Quick Actions Section */}
        <View style={styles.section}>
          
          {isPairing ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingIcon}>🔐</Text>
              <Text style={styles.loadingText}>Eşleşme onayı bekleniyor...</Text>
              <Text style={styles.loadingSubtext}>
                Masaüstü uygulamasından bağlantı isteğini onaylayın
              </Text>
            </View>
          ) : shortcuts && shortcuts.length > 0 ? (
            <View style={styles.actionsGrid}>
              {shortcuts.map((shortcut) => (
                <ShortcutCard
                  key={shortcut.id}
                  shortcut={shortcut}
                  onPress={onExecuteShortcut}
                  disabled={!isConnected}
                  device={device}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>⌨️</Text>
              <Text style={styles.emptyText}>Henüz kısayol yok</Text>
              <Text style={styles.emptySubtext}>
                Masaüstü uygulamasından kısayol ekleyin
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Shortcut Card Component
const ShortcutCard = ({ shortcut, onPress, disabled, device }) => {
  const handlePress = () => {
    if (!disabled && onPress) {
      onPress(shortcut);
    }
  };

  // İkon emoji mi dosya mı kontrol et
  const icon = shortcut?.icon || '⌨️';
  const isEmoji = icon.length <= 4;

  // Resim URL'ini oluştur
  const iconUrl = device 
    ? `http://${device.host}:${device.port}/icons/${icon}` 
    : `http://localhost:3100/icons/${icon}`;

  return (
    <TouchableOpacity
      style={[
        styles.actionCard,
        disabled && styles.actionCardDisabled
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <View style={[styles.iconCircle, { backgroundColor: shortcut?.color || '#1F6FEB' }]}>
        {isEmoji ? (
          <Text style={styles.cardIcon}>{icon}</Text>
        ) : (
          <Image
            source={{ uri: iconUrl }}
            style={styles.cardIconImage}
            resizeMode="contain"
          />
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {shortcut?.label || 'Kısayol'}
      </Text>
      <Text style={styles.cardSubtitle} numberOfLines={1}>
        {shortcut?.keys?.join(' + ') || 'Action'}
      </Text>
    </TouchableOpacity>
  );
};
const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#0A0E27'
  },
  headerLeft: {
    width: 40,
    alignItems: 'flex-start'
  },
  wifiIcon: {
    fontSize: 24
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center'
  },
  settingsButton: {
    width: 40,
    alignItems: 'flex-end'
  },
  settingsButtonCollapsed: {
    flex: 1,
    alignItems: 'center'
  },
  settingsIcon: {
    fontSize: 24
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40
  },
  section: {
    marginBottom: 32
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    opacity: 0.9
  },
  devicesContainer: {
    flexDirection: 'row',
    gap: 12
  },
  deviceCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 20,
    minWidth: 140,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A3150'
  },
  deviceIcon: {
    fontSize: 40,
    marginBottom: 12
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center'
  },
  deviceStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  deviceStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  deviceStatus: {
    fontSize: 12,
    fontWeight: '500'
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between'
  },
  actionCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 20,
    width: width / 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A3150',
    minHeight: 140
  },
  actionCardDisabled: {
    opacity: 0.5
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  cardIcon: {
    fontSize: 28
  },
  cardIconImage: {
    width: 32,
    height: 32
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center'
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#8B92B0',
    textAlign: 'center',
    fontWeight: '500'
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center'
  },
  loadingIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center'
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#8B92B0',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center'
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8B92B0',
    textAlign: 'center'
  }
});

