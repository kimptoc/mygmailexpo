import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onHide: () => void;
  undoAction?: {
    id: string;
    label: string;
  };
  onUndo?: () => void;
}

export function Toast({ message, type = 'info', visible, onHide, undoAction, onUndo }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const hasUndo = Boolean(undoAction && onUndo);

  useEffect(() => {
    if (visible) {
      if (animationRef.current) {
        animationRef.current.stop();
      }
      
      animationRef.current = Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(hasUndo ? 10000 : 3000),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]);
      
      animationRef.current.start(() => {
        onHide();
      });
    }
    
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [visible, message, onHide, opacity, hasUndo]);

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
      <Text style={styles.text} selectable>
        {message}
      </Text>
      {undoAction && onUndo && (
        <TouchableOpacity onPress={onUndo} style={styles.undoButton}>
          <Text style={styles.undoText}>{undoAction.label || 'UNDO'}</Text>
        </TouchableOpacity>
      )}
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
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  icon: {
    marginRight: 10,
  },
  undoButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
  },
  undoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
