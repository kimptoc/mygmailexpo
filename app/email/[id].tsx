import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import NativeWebView from '@/components/NativeWebView';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useGmailApi } from '@/services/gmailApi';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { EmailDetail, getFromName } from '@/types/gmail';
import { LabelChip } from '@/components/LabelChip';
import FolderSelectionModal from '@/components/FolderSelectionModal';

const EmailDetailScreen = () => {
  const { id, folderId } = useLocalSearchParams<{ id: string; folderId?: string }>();
  const { 
    getEmailDetail, 
    markAsRead, 
    getLabels, 
    moveEmailsToLabel,
    removeLabelFromEmails
  } = useGmailApi();
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [labelsMap, setLabelsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [webViewHeight, setWebViewHeight] = useState(200);
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [detail, labels] = await Promise.all([
        getEmailDetail(id),
        getLabels()
      ]);

      const map: Record<string, any> = {};
      labels.forEach(l => map[l.id] = l);
      setLabelsMap(map);
      setEmail(detail);

      // Mark as read if it's unread
      if (detail.isUnread) {
        await markAsRead(id);
      }
    } catch (err: any) {
      console.error('Error loading email:', err);
      setError(err.message || 'Failed to load email');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLabel = async () => {
    if (!folderId) return;
    try {
      await removeLabelFromEmails([id], folderId);
      router.back();
    } catch (err) {
      console.error('Error removing label:', err);
    }
  };

  const handleMoveToFolder = async (folder: any) => {
    try {
      // Find current primary label (usually INBOX or the one we navigated from)
      const currentLabelId = email?.labelIds.includes('INBOX') ? 'INBOX' : email?.labelIds[0] || 'INBOX';
      await moveEmailsToLabel([id], folder.id, currentLabelId);
      setShowFolderModal(false);
      router.back();
    } catch (err) {
      console.error('Error moving:', err);
    }
  };

  // Check if we should show Remove Label button
  // Show if we are in a custom user label (not INBOX/System/Category)
  const showRemoveLabel = useMemo(() => {
    if (!folderId) return false;
    if (folderId === 'INBOX') return false;
    if (folderId.startsWith('CATEGORY_')) return false;
    if (['TRASH', 'SENT', 'DRAFTS', 'SPAM', 'STARRED', 'IMPORTANT', 'UNREAD'].includes(folderId)) return false;
    return true;
  }, [folderId]);

  const folderName = useMemo(() => {
    if (!folderId) return '';
    if (folderId === 'INBOX') return 'Inbox';
    return labelsMap[folderId]?.name || ''; // Don't show ID if name not found yet, just empty
  }, [folderId, labelsMap]);

  const formattedDate = useMemo(() => {
    if (!email) return '';
    const date = new Date(email.receivedDate);
    return date.toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [email]);

  const htmlContent = useMemo(() => {
    if (!email?.htmlBody) return null;

    // Basic responsive wrapper for HTML content
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              font-size: 16px;
              line-height: 1.5;
              color: ${textColor};
              background-color: transparent;
              margin: 0;
              padding: 0;
              word-wrap: break-word;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            a {
              color: ${tintColor};
            }
          </style>
        </head>
        <body>
          ${email.htmlBody}
        </body>
      </html>
    `;
  }, [email, textColor, tintColor]);

  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
        <IconSymbol name="arrow.clockwise" size={32} color={tintColor} />
        <ThemedText style={{ marginTop: 16 }}>Loading email...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={[styles.container, { backgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
        <IconSymbol name="exclamationmark.triangle" size={48} color="#f44336" />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: tintColor }]}
          onPress={loadData}
        >
          <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <FolderSelectionModal
        visible={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        onSelectFolder={handleMoveToFolder}
        currentFolderId={email?.labelIds[0]}
      />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={textColor} />
          </TouchableOpacity>
          <ThemedText style={styles.folderBadge} numberOfLines={1}>{folderName}</ThemedText>
        </View>
        <View style={styles.headerActions}>
          {showRemoveLabel && (
            <TouchableOpacity 
              onPress={handleRemoveLabel} 
              style={styles.actionButton}
              accessibilityLabel="Remove label"
              {...{ title: "Remove label" } as any}
            >
              <IconSymbol name="tag.slash" size={22} color={textColor} />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={() => setShowFolderModal(true)} 
            style={styles.actionButton}
            accessibilityLabel="Move to folder"
            {...{ title: "Move to folder" } as any}
          >
            <IconSymbol name="folder" size={22} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>

      {email && (
        <ScrollView style={styles.content}>
          <View style={styles.emailHeader}>
            <ThemedText type="title" style={styles.subject}>{email.subject}</ThemedText>
            
            {/* Labels */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.labelsContainer}>
              {email.labelIds
                .filter(id => !['UNREAD', 'INBOX'].includes(id) && !id.startsWith('CATEGORY_'))
                .map(id => {
                  const label = labelsMap[id];
                  if (!label) return null;
                  return (
                    <LabelChip
                      key={id}
                      name={label.name}
                      backgroundColor={label.backgroundColor}
                      textColor={label.textColor}
                    />
                  );
                })}
            </ScrollView>

            <View style={styles.senderRow}>
              <View style={[styles.avatar, { backgroundColor: tintColor + '20' }]}>
                <ThemedText style={[styles.avatarText, { color: tintColor }]}>
                  {getFromName(email.from).charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <View style={styles.senderInfo}>
                <View style={styles.nameRow}>
                  <ThemedText style={styles.fromName}>{getFromName(email.from)}</ThemedText>
                  <ThemedText style={styles.dateText}>{formattedDate}</ThemedText>
                </View>
                <ThemedText style={styles.fromEmail}>{email.from}</ThemedText>
                <ThemedText style={styles.toText}>to {email.to}</ThemedText>
                {email.cc && <ThemedText style={styles.toText}>cc {email.cc}</ThemedText>}
              </View>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.bodyContainer}>
            {email.htmlBody ? (
              Platform.OS === 'web' ? (
                <iframe
                  srcDoc={htmlContent || ''}
                  style={{
                    width: '100%',
                    height: '600px',
                    border: 'none',
                    backgroundColor: 'transparent',
                  }}
                  title="Email Content"
                />
              ) : (
                <NativeWebView
                  originWhitelist={['*']}
                  source={{ html: htmlContent || '' }}
                  style={{ height: webViewHeight, backgroundColor: 'transparent' }}
                  scrollEnabled={false}
                  injectedJavaScript={`
                    setTimeout(function() {
                      window.ReactNativeWebView.postMessage(document.body.scrollHeight);
                    }, 500);
                    true;
                  `}
                  onMessage={(event: any) => {
                    if (event.nativeEvent.data) {
                      setWebViewHeight(Number(event.nativeEvent.data));
                    }
                  }}
                  onShouldStartLoadWithRequest={(request: any) => {
                    if (request.url !== 'about:blank') {
                      Linking.openURL(request.url);
                      return false;
                    }
                    return true;
                  }}
                />
              )
            ) : (
              <ThemedText style={styles.bodyText}>{email.plainTextBody || email.snippet}</ThemedText>
            )}
          </View>
        </ScrollView>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 12,
  },
  content: {
    flex: 1,
  },
  emailHeader: {
    padding: 16,
  },
  subject: {
    fontSize: 22,
    marginBottom: 12,
    lineHeight: 28,
  },
  labelsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    fontWeight: 'bold',
  },
  senderInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fromName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fromEmail: {
    fontSize: 13,
    opacity: 0.7,
  },
  dateText: {
    fontSize: 12,
    opacity: 0.6,
  },
  toText: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  bodyContainer: {
    padding: 16,
    minHeight: 400,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 32,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  folderBadge: {
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.7,
  },
});

export default EmailDetailScreen;