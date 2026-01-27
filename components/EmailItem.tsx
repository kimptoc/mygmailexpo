import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Email, getFromName, getSmartFormattedDate } from '@/types/gmail';
import { useThemeColor } from '@/hooks/use-theme-color';

interface EmailItemProps {
  email: Email;
  onPress: () => void;
}

export function EmailItem({ email, onPress }: EmailItemProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const senderName = getFromName(email.from);
  const firstLetter = senderName.charAt(0).toUpperCase() || '?';
  const formattedDate = getSmartFormattedDate(email.receivedDate);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: pressed ? backgroundColor + '80' : backgroundColor },
      ]}
      onPress={onPress}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: tintColor + '30' }]}>
        <Text style={[styles.avatarText, { color: tintColor }]}>{firstLetter}</Text>
      </View>

      {/* Email content */}
      <View style={styles.content}>
        {/* Header row: sender name and date */}
        <View style={styles.headerRow}>
          <Text
            style={[
              styles.senderName,
              { color: textColor },
              email.isUnread && styles.unreadText,
            ]}
            numberOfLines={1}
          >
            {senderName}
          </Text>
          <Text style={[styles.date, { color: textColor + '99' }]}>{formattedDate}</Text>
        </View>

        {/* Subject */}
        <Text
          style={[
            styles.subject,
            { color: textColor },
            email.isUnread && styles.unreadText,
          ]}
          numberOfLines={1}
        >
          {email.subject}
        </Text>

        {/* Snippet */}
        <Text
          style={[styles.snippet, { color: textColor + '80' }]}
          numberOfLines={2}
        >
          {email.snippet}
        </Text>
      </View>

      {/* Unread indicator */}
      {email.isUnread && (
        <View style={[styles.unreadIndicator, { backgroundColor: tintColor }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  senderName: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  date: {
    fontSize: 12,
  },
  subject: {
    fontSize: 14,
  },
  snippet: {
    fontSize: 13,
    lineHeight: 18,
  },
  unreadText: {
    fontWeight: '600',
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
    marginTop: 4,
  },
});
