import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDiscovery } from '../hooks/useDiscovery';
import { useI18n } from '../contexts/I18nContext';

const { width } = Dimensions.get('window');

export const DiscoveryScreen = ({ onDeviceSelect, onSettingsPress }) => {
  const { devices, isScanning, error, startDiscovery, stopDiscovery } = useDiscovery();
  const { t } = useI18n();

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
        <View style={styles.deviceMeta}>
          <Text style={styles.deviceType}>{item.type}</Text>
        </View>
      </View>
      <View style={styles.deviceArrow}>
        <Text style={styles.arrowText}>›</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyText}>{t('discovery.searching')}</Text>
      <Text style={styles.emptySubtext}>
        {t('discovery.searchingHint')}
      </Text>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1e1e" />
      
      <View style={styles.mainContent}>
        {/* Sol Panel - Menü ve Bilgiler */}
        <View style={styles.leftPanel}>
          <ScrollView 
            style={styles.leftScrollView}
            contentContainerStyle={styles.leftScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Logo ve Başlık */}
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoIcon}>🎮</Text>
                <Text style={styles.logoIcon2}>💻</Text>
              </View>
              <Text style={styles.appTitle}>{t('app.title')}</Text>
              <Text style={styles.appSubtitle}>{t('app.subtitle')}</Text>
            </View>

            {/* Durum */}
            <View style={styles.statusSection}>
              <Text style={styles.sectionLabel}>{t('discovery.status')}</Text>
              <View style={styles.statusBadge}>
                {isScanning && <ActivityIndicator size="small" color="#4CAF50" />}
                <Text style={styles.statusLabel}>
                  {isScanning ? t('discovery.scanning') : t('discovery.stopped')}
                </Text>
              </View>
            </View>

            {/* Bulunan Cihaz Sayısı */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionLabel}>{t('discovery.foundDevices')}</Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoNumber}>{devices.length}</Text>
                <Text style={styles.infoLabel}>{t('discovery.device')}</Text>
              </View>
            </View>

            {/* Bilgi Kartı */}
            <View style={styles.helpSection}>
              <Text style={styles.helpIcon}>💡</Text>
              <Text style={styles.helpText}>
                {t('discovery.helpText')}
              </Text>
            </View>
          </ScrollView>

          {/* Alt Butonlar - Scroll dışında sabit */}
          <View style={styles.menuActions}>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={onSettingsPress}
            >
              <Text style={styles.settingsBtnIcon}>⚙️</Text>
              <Text style={styles.settingsBtnText}>{t('settings.title')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sağ Panel - Cihaz Listesi */}
        <View style={styles.rightPanel}>
          <View style={styles.rightHeader}>
            <Text style={styles.rightTitle}>{t('discovery.devices')}</Text>
            <Text style={styles.rightSubtitle}>
              {t('discovery.searchingHint')}
            </Text>
          </View>

          <FlatList
            data={devices}
            renderItem={renderDevice}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.deviceList}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e'
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row'
  },
  // Sol Panel Stilleri
  leftPanel: {
    width: width * 0.28,
    backgroundColor: '#252526',
    borderRightWidth: 1,
    borderRightColor: '#3e3e42'
  },
  leftScrollView: {
    flex: 1
  },
  leftScrollContent: {
    padding: 24,
    paddingBottom: 16
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20
  },
  logoContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  logoIcon: {
    fontSize: 36
  },
  logoIcon2: {
    fontSize: 36
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4
  },
  appSubtitle: {
    fontSize: 14,
    color: '#808080'
  },
  statusSection: {
    marginBottom: 32
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#808080',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d30',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 10
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  infoSection: {
    marginBottom: 32
  },
  infoBox: {
    backgroundColor: '#2d2d30',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center'
  },
  infoNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 4
  },
  infoLabel: {
    fontSize: 14,
    color: '#808080',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  helpSection: {
    backgroundColor: '#2d2d30',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50'
  },
  helpIcon: {
    fontSize: 24,
    marginBottom: 8
  },
  helpText: {
    fontSize: 13,
    color: '#CCCCCC',
    lineHeight: 18
  },
  menuActions: {
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#3e3e42'
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2d2d30',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#3e3e42'
  },
  settingsBtnIcon: {
    fontSize: 20
  },
  settingsBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  // Sağ Panel Stilleri
  rightPanel: {
    flex: 1,
    backgroundColor: '#1e1e1e'
  },
  rightHeader: {
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3e3e42'
  },
  rightTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6
  },
  rightSubtitle: {
    fontSize: 14,
    color: '#808080'
  },
  deviceList: {
    padding: 24
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252526',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
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
    marginRight: 16
  },
  deviceIconText: {
    fontSize: 24
  },
  deviceInfo: {
    flex: 1
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4
  },
  deviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  deviceType: {
    fontSize: 14,
    color: '#808080',
    textTransform: 'uppercase'
  },
  deviceArrow: {
    marginLeft: 12
  },
  arrowText: {
    fontSize: 28,
    color: '#808080',
    fontWeight: '300'
  },
  emptyState: {
    flex: 1,
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
    color: '#FFFFFF',
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
  }
});

