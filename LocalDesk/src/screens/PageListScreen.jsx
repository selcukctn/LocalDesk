import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar
} from 'react-native';

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
          style={styles.disconnectButton}
          onPress={onDisconnect}
        >
          <Text style={styles.disconnectIcon}>🔌</Text>
        </TouchableOpacity>
      </View>

      {/* Status Banner */}
      <View style={styles.statusBanner}>
        <Text style={styles.statusText}>{getStatusText()}</Text>
        {device && (
          <Text style={styles.statusSubtext}>
            {device.host}:{device.port}
          </Text>
        )}
      </View>

      {/* Content */}
      {isPairing ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingIcon}>🔐</Text>
          <Text style={styles.loadingText}>Eşleşme onayı bekleniyor...</Text>
          <Text style={styles.loadingSubtext}>
            Masaüstü uygulamasından bağlantı isteğini onaylayın
          </Text>
        </View>
      ) : isConnected ? (
        <ScrollView style={styles.content} contentContainerStyle={styles.pageList}>
          <Text style={styles.sectionTitle}>Sayfalar</Text>
          <Text style={styles.sectionSubtitle}>
            Kısayolları görüntülemek için bir sayfa seçin
          </Text>
          
          {pages && pages.length > 0 ? (
            pages.map((page) => (
              <TouchableOpacity
                key={page.id}
                style={styles.pageCard}
                onPress={() => handlePagePress(page)}
                activeOpacity={0.7}
              >
                <View style={styles.pageCardLeft}>
                  <Text style={styles.pageIcon}>📄</Text>
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
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📄</Text>
              <Text style={styles.emptyText}>Henüz sayfa yok</Text>
              <Text style={styles.emptySubtext}>
                Masaüstü uygulamasından sayfa ekleyin
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingIcon}>⏳</Text>
          <Text style={styles.loadingText}>Bağlanıyor...</Text>
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
  disconnectButton: {
    padding: 8
  },
  disconnectIcon: {
    fontSize: 24
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
  pageList: {
    padding: 20
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#CCCCCC',
    marginBottom: 4
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#808080',
    marginBottom: 20
  },
  pageCard: {
    backgroundColor: '#252526',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3e3e42'
  },
  pageCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12
  },
  pageIcon: {
    fontSize: 32
  },
  pageInfo: {
    flex: 1
  },
  pageName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 4
  },
  pageShortcutCount: {
    fontSize: 14,
    color: '#808080'
  },
  pageArrow: {
    fontSize: 32,
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
  emptyContainer: {
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
    color: '#CCCCCC',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#808080',
    textAlign: 'center'
  }
});

