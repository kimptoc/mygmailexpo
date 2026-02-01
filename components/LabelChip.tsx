import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

interface LabelChipProps {
  name: string;
  backgroundColor?: string;
  textColor?: string;
}

export function LabelChip({ name, backgroundColor, textColor }: LabelChipProps) {
  const defaultBg = useThemeColor({}, 'separator');
  const defaultText = useThemeColor({}, 'text');

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: backgroundColor || defaultBg },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: textColor || defaultText },
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    maxWidth: 100,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
  },
});
