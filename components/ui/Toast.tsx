import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onHide: () => void;
}

export function Toast({ message, type = 'info', visible, onHide }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onHide();
      });
    }
  }, [visible, onHide, opacity]);

  if (!visible) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return '#323232'; // Dark gray/black like standard Android toast/Snackbar
      case 'error': return '#D32F2F';
      case 'info': return '#323232';
      default: return '#323232';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return 'checkmark.circle';
      case 'error': return 'exclamationmark.triangle.fill';
      default: return 'exclamationmark.triangle'; // Fallback
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity, backgroundColor: getBackgroundColor() },
      ]}
    >
      {type !== 'info' && (
        <IconSymbol 
          name={getIcon()} 
          size={20} 
          color="#FFFFFF" 
          style={styles.icon}
        />
      )}
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    padding: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
    elevation: 5,
    zIndex: 10000,
    justifyContent: 'center', // Center text if no icon, or align with icon
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1, // Allow text to wrap
    textAlign: 'center',
  },
  icon: {
    marginRight: 10,
  },
});
