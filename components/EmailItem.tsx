import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Email, getFromName, getSmartFormattedDate } from '@/types/gmail';
import { useThemeColor } from '@/hooks/use-theme-color';
import { LabelChip } from './LabelChip';
import { GmailLabel } from '@/types/folder';

import { IconSymbol } from './ui/icon-symbol';

interface EmailItemProps {
  email: Email;
  onPress: () => void;
  onLongPress?: () => void;
  onAvatarPress?: () => void;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  labels?: Record<string, GmailLabel>;
  currentFolderId?: string;
}

const AVATAR_COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
  '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
  '#8BC34A', '#CDDC39', '#FFC107', '#FF9800', '#FF5722',
];

export function EmailItem({ 
  email, 
  onPress, 
  onLongPress,
  onAvatarPress,
  isSelected,
  isSelectionMode,
  labels, 
  currentFolderId 
}: EmailItemProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const senderName = getFromName(email.from);
  const firstLetter = senderName.charAt(0).toUpperCase() || '?';
  const formattedDate = getSmartFormattedDate(email.receivedDate);

  // Generate color based on sender name
  const colorIndex = Math.abs(
    senderName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % AVATAR_COLORS.length;
  const avatarColor = AVATAR_COLORS[colorIndex];

  const displayLabels = email.labelIds
    .filter(id => {
      if (id === 'UNREAD' || id === 'INBOX' || id === currentFolderId) return false;
      if (id.startsWith('CATEGORY_')) return false;
      return true;
    })
    .map(id => labels?.[id])
    .filter((label): label is GmailLabel => !!label)
    .slice(0, 3);

  const remainingLabelsCount = email.labelIds.filter(id => {
    if (id === 'UNREAD' || id === 'INBOX' || id === currentFolderId) return false;
    if (id.startsWith('CATEGORY_')) return false;
    return true;
  }).length - displayLabels.length;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: isSelected ? tintColor + '20' : pressed ? backgroundColor + '80' : backgroundColor },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {/* Avatar or Checkmark */}
      <Pressable 
        onPress={(e) => {
          if (onAvatarPress) {
            e.stopPropagation();
            onAvatarPress();
          }
        }}
        style={[
          styles.avatar, 
          { backgroundColor: isSelected ? tintColor : avatarColor }
        ]}
      >
        {isSelected ? (
          <IconSymbol name="checkmark" size={24} color="#FFFFFF" />
        ) : (
          <Text style={styles.avatarText}>{firstLetter}</Text>
        )}
      </Pressable>

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
          <Text style={[styles.date, { color: textColor + '99' }, email.isUnread && { color: tintColor, fontWeight: '600' }]}>
            {formattedDate}
          </Text>
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
          numberOfLines={1}
        >
          {email.snippet}
        </Text>

        {/* Label Chips */}
        {displayLabels.length > 0 && (
          <View style={styles.labelsRow}>
            {displayLabels.map(label => (
              <LabelChip
                key={label.id}
                name={label.name}
                backgroundColor={label.backgroundColor}
                textColor={label.textColor}
              />
            ))}
            {remainingLabelsCount > 0 && (
              <LabelChip name={`+${remainingLabelsCount}`} />
            )}
          </View>
        )}
      </View>

      {/* Unread indicator */}
      {email.isUnread && !isSelected && (
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    gap: 2,
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
    fontWeight: '700',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 6,
  },
  labelsRow: {
    flexDirection: 'row',
    marginTop: 6,
    flexWrap: 'wrap',
  },
});
