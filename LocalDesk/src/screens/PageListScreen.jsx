import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export const PageListScreen = ({
  device,
  pages,
  isConnected,
  isPairing,
  onPageSelect,
  onDisconnect
}) => {
  const handlePagePress = (page) => {
    if (isConnected && onPageSelect) {
      onPageSelect(page);
    }
  };

  const getStatusText = () => {
    if (isPairing) return 'Eşleşiyor...';
    if (isConnected) return 'Bağlı';
    return 'Bağlanıyor...';
  };

  const getStatusColor = () => {
    if (isConnected) return '#4CAF50';
    if (isPairing) return '#FF9800';
    return '#808080';
  };

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
              <Text style={styles.appTitle}>Local Desk</Text>
              <Text style={styles.appSubtitle}>Desktop Controller</Text>
            </View>

            {/* Durum */}
            <View style={styles.statusSection}>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                <Text style={styles.statusLabel}>{getStatusText()}</Text>
              </View>
            </View>

            {/* Bağlı Cihaz Bilgisi */}
            {device && (
              <View style={styles.deviceSection}>
                <Text style={styles.sectionLabel}>Bağlı Cihaz</Text>
                <View style={styles.deviceInfoBox}>
                  <Text style={styles.deviceInfoName}>{device.name}</Text>
                  <Text style={styles.deviceInfoHost}>{device.host}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Alt Butonlar - Scroll dışında sabit */}
          <View style={styles.menuActions}>
            <TouchableOpacity
              style={styles.disconnectBtn}
              onPress={onDisconnect}
            >
              <Text style={styles.disconnectBtnIcon}>🔌</Text>
              <Text style={styles.disconnectBtnText}>Bağlantıyı Kes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sağ Panel - Sayfa Listesi */}
        <View style={styles.rightPanel}>
          {isPairing ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingIcon}>🔐</Text>
              <Text style={styles.loadingText}>Eşleşme onayı bekleniyor...</Text>
              <Text style={styles.loadingSubtext}>
                Masaüstü uygulamasından bağlantı isteğini onaylayın
              </Text>
            </View>
          ) : isConnected ? (
            <>
              <View style={styles.rightHeader}>
                <Text style={styles.rightTitle}>Sayfalar</Text>
                <Text style={styles.rightSubtitle}>
                  Kısayolları görüntülemek için bir sayfa seçin
                </Text>
              </View>
              
              <ScrollView 
                style={styles.pageScrollView}
                contentContainerStyle={styles.pageList}
                showsVerticalScrollIndicator={false}
              >
                {pages && pages.length > 0 ? (
                  pages.map((page) => (
                    <TouchableOpacity
                      key={page.id}
                      style={styles.pageCard}
                      onPress={() => handlePagePress(page)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.pageCardContent}>
                        {page.icon ? (
                          page.icon.length <= 4 ? (
                            <View style={styles.pageIconCircle}>
                              <Text style={styles.pageIcon}>{page.icon}</Text>
                            </View>
                          ) : (
                            <View style={styles.pageIconCircle}>
                              <Image
                                source={{ uri: `http://${device.host}:${device.port}/icons/${page.icon}` }}
                                style={styles.pageIconImage}
                                resizeMode="contain"
                              />
                            </View>
                          )
                        ) : (
                          <View style={styles.pageIconCircle}>
                            <Text style={styles.pageIcon}>📄</Text>
                          </View>
                        )}
                        <View style={styles.pageInfo}>
                          <Text style={styles.pageName}>{page.name}</Text>
                          <Text style={styles.pageShortcutCount}>
                            {page.shortcuts?.length || 0} kısayol
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.pageArrow}>›</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📄</Text>
                    <Text style={styles.emptyText}>Henüz sayfa yok</Text>
                    <Text style={styles.emptySubtext}>
                      Masaüstü uygulamasından sayfa ekleyin
                    </Text>
                  </View>
                )}
              </ScrollView>
            </>
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingIcon}>⏳</Text>
              <Text style={styles.loadingText}>Bağlanıyor...</Text>
            </View>
          )}
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d30',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 10
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  deviceSection: {
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
  deviceInfoBox: {
    backgroundColor: '#2d2d30',
    padding: 16,
    borderRadius: 8
  },
  deviceInfoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6
  },
  deviceInfoHost: {
    fontSize: 13,
    color: '#808080',
    fontFamily: 'monospace'
  },
  menuActions: {
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#3e3e42'
  },
  disconnectBtn: {
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
  disconnectBtnIcon: {
    fontSize: 20
  },
  disconnectBtnText: {
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
  pageScrollView: {
    flex: 1
  },
  pageList: {
    padding: 24
  },
  pageCard: {
    backgroundColor: '#252526',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3e3e42'
  },
  pageCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16
  },
  pageIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2d2d30',
    justifyContent: 'center',
    alignItems: 'center'
  },
  pageIcon: {
    fontSize: 28
  },
  pageIconImage: {
    width: 32,
    height: 32
  },
  pageInfo: {
    flex: 1
  },
  pageName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4
  },
  pageShortcutCount: {
    fontSize: 14,
    color: '#808080'
  },
  pageArrow: {
    fontSize: 28,
    color: '#808080',
    fontWeight: '300'
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
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center'
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#808080',
    textAlign: 'center',
    lineHeight: 20
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60
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
    color: '#808080',
    textAlign: 'center'
  }
});

