import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  Dimensions,
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  HEADER_EXPANDED: '@localdesk_header_expanded',
  VIEW_MODE: '@localdesk_view_mode',
  GRID_SIZE: '@localdesk_grid_size'
};

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState('both'); // 'both', 'iconOnly', 'textOnly'
  const [gridSize, setGridSize] = useState(4); // 4 veya 8
  const [isLoading, setIsLoading] = useState(true);

  // Ayarları AsyncStorage'dan yükle
  useEffect(() => {
    loadSettings();
  }, []);

  // Ayarları yükle
  const loadSettings = async () => {
    try {
      const [savedHeaderExpanded, savedViewMode, savedGridSize] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.HEADER_EXPANDED),
        AsyncStorage.getItem(STORAGE_KEYS.VIEW_MODE),
        AsyncStorage.getItem(STORAGE_KEYS.GRID_SIZE)
      ]);

      if (savedHeaderExpanded !== null) {
        setHeaderExpanded(savedHeaderExpanded === 'true');
      }
      if (savedViewMode !== null) {
        setViewMode(savedViewMode);
      }
      if (savedGridSize !== null) {
        setGridSize(parseInt(savedGridSize, 10));
      }
    } catch (error) {
      console.error('Ayarlar yüklenirken hata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Header expanded ayarını kaydet
  const handleHeaderExpandedChange = async (value) => {
    setHeaderExpanded(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HEADER_EXPANDED, value.toString());
    } catch (error) {
      console.error('Ayar kaydedilirken hata:', error);
    }
  };

  // View mode ayarını kaydet
  const handleViewModeChange = async (mode) => {
    setViewMode(mode);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
    } catch (error) {
      console.error('Ayar kaydedilirken hata:', error);
    }
  };

  // Grid size ayarını kaydet
  const handleGridSizeChange = async (size) => {
    setGridSize(size);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.GRID_SIZE, size.toString());
    } catch (error) {
      console.error('Ayar kaydedilirken hata:', error);
    }
  };


  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E27" />
      
      {/* Menu dışına tıklandığında kapat */}
      {menuOpen && (
        <TouchableWithoutFeedback onPress={() => setMenuOpen(false)}>
          <View style={styles.menuOverlay} />
        </TouchableWithoutFeedback>
      )}

      {/* Header */}
      <View style={styles.header}>
        {headerExpanded ? (
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
        ) : (
          <View style={styles.headerLeft} />
        )}
        
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuOpen(!menuOpen)}
          >
            <Text style={styles.menuIcon}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Dropdown */}
      {menuOpen && (
        <View style={styles.menuDropdown}>
          <ScrollView 
            style={styles.menuScrollView}
            showsVerticalScrollIndicator={true}
            persistentScrollbar={true}
          >
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                handleHeaderExpandedChange(!headerExpanded);
                setMenuOpen(false);
              }}
            >
              <Text style={styles.menuItemText}>
                {headerExpanded ? 'Header\'ı Gizle' : 'Header\'ı Göster'}
              </Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <View style={styles.menuSection}>
              <Text style={styles.menuSectionTitle}>Kart Görünümü</Text>
              
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  viewMode === 'both' && styles.menuItemActive
                ]}
                onPress={() => {
                  handleViewModeChange('both');
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuItemText}>İkon + Yazı</Text>
                {viewMode === 'both' && (
                  <Text style={styles.menuItemCheck}>✓</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.menuItem,
                  viewMode === 'iconOnly' && styles.menuItemActive
                ]}
                onPress={() => {
                  handleViewModeChange('iconOnly');
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuItemText}>Sadece İkon</Text>
                {viewMode === 'iconOnly' && (
                  <Text style={styles.menuItemCheck}>✓</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.menuItem,
                  viewMode === 'textOnly' && styles.menuItemActive
                ]}
                onPress={() => {
                  handleViewModeChange('textOnly');
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuItemText}>Sadece Yazı</Text>
                {viewMode === 'textOnly' && (
                  <Text style={styles.menuItemCheck}>✓</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.menuDivider} />

            <View style={styles.menuSection}>
              <Text style={styles.menuSectionTitle}>Grid Boyutu</Text>
              
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  gridSize === 4 && styles.menuItemActive
                ]}
                onPress={() => {
                  handleGridSizeChange(4);
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuItemText}>4x4 Grid</Text>
                {gridSize === 4 && (
                  <Text style={styles.menuItemCheck}>✓</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.menuItem,
                  gridSize === 5 && styles.menuItemActive
                ]}
                onPress={() => {
                  handleGridSizeChange(5);
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuItemText}>5x5 Grid</Text>
                {gridSize === 5 && (
                  <Text style={styles.menuItemCheck}>✓</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.menuItem,
                  gridSize === 6 && styles.menuItemActive
                ]}
                onPress={() => {
                  handleGridSizeChange(6);
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuItemText}>6x6 Grid</Text>
                {gridSize === 6 && (
                  <Text style={styles.menuItemCheck}>✓</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.menuItem,
                  gridSize === 7 && styles.menuItemActive
                ]}
                onPress={() => {
                  handleGridSizeChange(7);
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuItemText}>7x7 Grid</Text>
                {gridSize === 7 && (
                  <Text style={styles.menuItemCheck}>✓</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.menuItem,
                  gridSize === 8 && styles.menuItemActive
                ]}
                onPress={() => {
                  handleGridSizeChange(8);
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuItemText}>8x8 Grid</Text>
                {gridSize === 8 && (
                  <Text style={styles.menuItemCheck}>✓</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

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
                  viewMode={viewMode}
                  gridSize={gridSize}
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
const ShortcutCard = ({ shortcut, onPress, disabled, device, viewMode = 'both', gridSize = 4 }) => {
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

  const showIcon = viewMode === 'both' || viewMode === 'iconOnly';
  const showText = viewMode === 'both' || viewMode === 'textOnly';

  // Grid size'a göre kart boyutunu hesapla
  const { width } = Dimensions.get('window');
  const padding = 16; // scrollContent padding (küçültüldü)
  const gap = 8; // actionsGrid gap (küçültüldü)
  const totalGaps = (gridSize - 1) * gap;
  const cardWidth = (width - (padding * 16) - totalGaps) / gridSize;
  const cardHeight = viewMode === 'textOnly' ? cardWidth * 0.6 : cardWidth*0.8;
  
  // İkon boyutunu gridSize'a göre ayarla
  const iconSize = cardWidth * 0.7;
  const iconFontSize = gridSize === 8 ? 16 : width/17;

  return (
    <TouchableOpacity
      style={[
        styles.actionCard,
        { 
          backgroundColor: shortcut?.color || '#1A1F3A',
          width: cardWidth,
          minHeight: cardHeight,
        },
        disabled && styles.actionCardDisabled,
        viewMode === 'iconOnly' && styles.actionCardIconOnly,
        viewMode === 'textOnly' && styles.actionCardTextOnly
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      {showIcon && (
        <View style={[styles.iconCircle]}>
          {isEmoji ? (
            <Text style={[styles.cardIcon, { fontSize: iconFontSize }]}>{icon}</Text>
          ) : (
            <Image
              source={{ uri: iconUrl }}
              style={[styles.cardIconImage, { width: iconSize, height: iconSize }]}
              resizeMode="contain"
            />
          )}
        </View>
      )}
      {showText && (
        <>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {shortcut?.label || 'Kısayol'}
          </Text>
          {viewMode === 'both' && (
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {shortcut?.keys?.join(' + ') || 'Action'}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};
const { width, height } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e'
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    width:width,
    height:width/18,
    backgroundColor: '#1e1e1e',
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
  headerRight: {
    width: 40,
    alignItems: 'flex-end'
  },
  menuButton: {
    padding: 8
  },
  menuIcon: {
    fontSize: 24,
    color: '#FFFFFF'
  },
  menuDropdown: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3150',
    minWidth: 220,
    maxHeight: height - 80,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10
  },
  menuScrollView: {
    maxHeight: height - 80
  },
  menuSection: {
    paddingVertical: 4
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B92B0',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    gap: 12
  },
  menuItemActive: {
    backgroundColor: '#2A3150'
  },
  menuItemIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center'
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500'
  },
  menuItemCheck: {
    fontSize: 16,
    color: '#1F6FEB',
    fontWeight: 'bold'
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#2A3150',
    marginVertical: 4
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
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
    gap: 8,
    rowGap: 20,
    justifyContent: 'space-around',
    alignContent: 'space-around',
    width: '100%'
  },
  actionCard: {
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionCardIconOnly: {
    padding: 10
  },
  actionCardTextOnly: {
    padding: 10,
    justifyContent: 'center'
  },
  actionCardDisabled: {
    opacity: 0.5
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    // fontSize dinamik olarak inline style ile ayarlanıyor
  },
  cardIconImage: {
    // width ve height dinamik olarak inline style ile ayarlanıyor
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

