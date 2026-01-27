import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

export function EmailItemSkeleton() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  const skeletonColor = textColor + '20';

  return (
    <View style={[styles.container, { borderBottomColor: textColor + '10' }]}>
      {/* Avatar skeleton */}
      <Animated.View 
        style={[
          styles.avatar, 
          { backgroundColor: skeletonColor, opacity }
        ]} 
      />

      {/* Content skeleton */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Animated.View 
            style={[
              styles.senderName, 
              { backgroundColor: skeletonColor, opacity }
            ]} 
          />
          <Animated.View 
            style={[
              styles.date, 
              { backgroundColor: skeletonColor, opacity }
            ]} 
          />
        </View>

        <Animated.View 
          style={[
            styles.subject, 
            { backgroundColor: skeletonColor, opacity }
          ]} 
        />
        
        <Animated.View 
          style={[
            styles.snippet, 
            { backgroundColor: skeletonColor, opacity }
          ]} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  content: {
    flex: 1,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  senderName: {
    height: 14,
    width: '40%',
    borderRadius: 4,
  },
  date: {
    height: 12,
    width: '15%',
    borderRadius: 4,
  },
  subject: {
    height: 14,
    width: '70%',
    borderRadius: 4,
  },
  snippet: {
    height: 13,
    width: '90%',
    borderRadius: 4,
  },
});
