import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface LabelChipProps {
  name: string;
  backgroundColor?: string;
  textColor?: string;
}

export function LabelChip({ name, backgroundColor, textColor }: LabelChipProps) {
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: backgroundColor || '#f1f3f4' },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: textColor || '#3c4043' },
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
