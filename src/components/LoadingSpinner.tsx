import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';

interface LoadingSpinnerProps {
  visible: boolean;
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  overlay?: boolean;
  transparent?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  visible,
  message,
  size = 'large',
  color = '#007bff',
  overlay = true,
  transparent = false,
}) => {
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  if (!visible) {
    return null;
  }

  const content = (
    <Animated.View
      style={[
        styles.container,
        overlay && styles.overlay,
        transparent && styles.transparent,
        { opacity: fadeAnim },
      ]}>
      <View style={styles.content}>
        <ActivityIndicator size={size} color={color} />
        {message && (
          <Text style={[styles.message, { color }]}>
            {message}
          </Text>
        )}
      </View>
    </Animated.View>
  );

  if (overlay) {
    return (
      <Modal
        transparent
        visible={visible}
        animationType="none"
        statusBarTranslucent>
        {content}
      </Modal>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  content: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 200,
  },
});

export default LoadingSpinner;