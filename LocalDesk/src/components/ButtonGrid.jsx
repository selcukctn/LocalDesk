import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView
} from 'react-native';

const { width } = Dimensions.get('window');
const BUTTON_SIZE = (width - 48) / 3; // 3 sütun, padding hariç

export const ButtonGrid = ({ shortcuts, onPress, disabled }) => {
  if (!shortcuts || shortcuts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>⌨️</Text>
        <Text style={styles.emptyText}>Henüz kısayol yok</Text>
        <Text style={styles.emptySubtext}>
          Masaüstü uygulamasından kısayol ekleyin
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.grid}
      showsVerticalScrollIndicator={false}
    >
      {shortcuts.map((shortcut) => (
        <ShortcutButton
          key={shortcut.id}
          shortcut={shortcut}
          onPress={onPress}
          disabled={disabled}
        />
      ))}
    </ScrollView>
  );
};

const ShortcutButton = ({ shortcut, onPress, disabled }) => {
  const handlePress = () => {
    if (!disabled && onPress) {
      onPress(shortcut);
    }
  };

  // Güvenli keys kontrolü
  const keys = shortcut?.keys || [];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { borderLeftColor: shortcut?.color || '#1F6FEB' },
        disabled && styles.buttonDisabled
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <View style={styles.buttonContent}>
        <Text style={styles.icon}>{shortcut?.icon || '⌨️'}</Text>
        <Text style={styles.label} numberOfLines={2}>
          {shortcut?.label || 'Kısayol'}
        </Text>
        {keys.length > 0 && (
          <View style={styles.keysContainer}>
            {keys.map((key, index) => (
              <React.Fragment key={index}>
                <Text style={styles.key}>{key}</Text>
                {index < keys.length - 1 && (
                  <Text style={styles.keySeparator}>+</Text>
                )}
              </React.Fragment>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    backgroundColor: '#252526',
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 12,
    marginBottom: 12,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  icon: {
    fontSize: 36,
    marginBottom: 8
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 6
  },
  keysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4
  },
  key: {
    fontSize: 9,
    color: '#808080',
    fontFamily: 'monospace',
    paddingHorizontal: 3
  },
  keySeparator: {
    fontSize: 8,
    color: '#808080',
    paddingHorizontal: 2
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
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

