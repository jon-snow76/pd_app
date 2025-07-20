import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffline } from '../hooks/useOffline';

interface OfflineIndicatorProps {
  onSyncPress?: () => void;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ onSyncPress }) => {
  const { isOnline, hasPendingOperations, syncQueue } = useOffline();
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (!isOnline || hasPendingOperations) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOnline, hasPendingOperations, fadeAnim]);

  if (isOnline && !hasPendingOperations) {
    return null;
  }

  const getIndicatorContent = () => {
    if (!isOnline) {
      return {
        icon: 'wifi-off',
        text: 'You\'re offline',
        subtext: 'Changes will sync when connection is restored',
        backgroundColor: '#ff6b6b',
        color: '#ffffff',
      };
    } else if (hasPendingOperations) {
      return {
        icon: 'sync',
        text: `${syncQueue.length} changes pending`,
        subtext: 'Tap to sync now',
        backgroundColor: '#ffa726',
        color: '#ffffff',
      };
    }
    
    return null;
  };

  const content = getIndicatorContent();
  if (!content) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: content.backgroundColor },
        { opacity: fadeAnim },
      ]}>
      <TouchableOpacity
        style={styles.touchable}
        onPress={onSyncPress}
        disabled={!isOnline || !hasPendingOperations}>
        <View style={styles.content}>
          <Ionicons
            name={content.icon as any}
            size={20}
            color={content.color}
            style={styles.icon}
          />
          <View style={styles.textContainer}>
            <Text style={[styles.text, { color: content.color }]}>
              {content.text}
            </Text>
            <Text style={[styles.subtext, { color: content.color }]}>
              {content.subtext}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  touchable: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtext: {
    fontSize: 12,
    opacity: 0.9,
  },
});

export default OfflineIndicator;