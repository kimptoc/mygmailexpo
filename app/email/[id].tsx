import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Dimensions,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import NativeWebView from '@/components/NativeWebView';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGmailApi } from '@/services/gmailApi';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { EmailDetail, getFromName } from '@/types/gmail';
import { LabelChip } from '@/components/LabelChip';
import FolderSelectionModal from '@/components/FolderSelectionModal';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActionButtonColors } from '@/hooks/use-tint-contrast';

const EmailDetailScreen = () => {
  const { id, folderId } = useLocalSearchParams<{ id: string; folderId?: string }>();
  const { showToast, showUndoToast } = useToast();
  const { width, height: windowHeight } = useWindowDimensions();
  const isLargeScreen = width > 600;
  const { signIn } = useAuth();
  const { 
    getEmailDetail, 
    markAsRead, 
    getLabels, 
    moveEmailsToLabel,
    removeLabelFromEmails,
    addLabelsToEmails
  } = useGmailApi();
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [labelsMap, setLabelsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [webViewHeight, setWebViewHeight] = useState(windowHeight - 250);
  const [iframeHeight, setIframeHeight] = useState(300);
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const separatorColor = useThemeColor({}, 'separator');
  const errorColor = useThemeColor({}, 'error');
  const { tintColor, actionButtonBackground, actionButtonText } = useActionButtonColors();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  useEffect(() => {
    setWebViewHeight(windowHeight - 250);
  }, [windowHeight]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const updateIframeHeight = () => {
        const newHeight = Math.max(300, windowHeight - 250);
        setIframeHeight(newHeight);
      };
      
      updateIframeHeight();
      
      window.addEventListener('resize', updateIframeHeight);
      return () => window.removeEventListener('resize', updateIframeHeight);
    }
  }, [windowHeight]);

  // Listen for iframe height messages on web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'iframeHeight' && typeof event.data.height === 'number') {
        setIframeHeight(event.data.height);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

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
    setActionLoading(true);
    const removedLabelId = folderId;
    try {
      await removeLabelFromEmails([id], removedLabelId);
      showUndoToast(
        '1 email removed',
        {
          id: `remove-label-${id}-${Date.now()}`,
          label: 'Undo',
          undo: async () => {
            await addLabelsToEmails([id], [removedLabelId]);
          }
        }
      );
      router.back();
    } catch (err: any) {
      console.error('Error removing label:', err);
      showToast(err.message || 'Failed to remove label', 'error');
      setActionLoading(false);
    }
  };

  const handleMoveToFolder = async (folder: any) => {
    setActionLoading(true);
    const currentLabelId = folderId || 'INBOX';
    const targetLabelId = folder.id;
    try {
      await moveEmailsToLabel([id], targetLabelId, currentLabelId);
      showUndoToast(
        '1 email moved',
        {
          id: `move-email-${id}-${Date.now()}`,
          label: 'Undo',
          undo: async () => {
            await moveEmailsToLabel([id], currentLabelId, targetLabelId);
          }
        }
      );
      setShowFolderModal(false);
      router.back();
    } catch (err: any) {
      console.error('Error moving:', err);
      showToast(err.message || 'Failed to move email', 'error');
      setActionLoading(false);
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
    const readableTextColor = isDark ? '#E8EAED' : textColor;
    const readableBgColor = isDark ? '#111418' : 'transparent';
    const fallbackDarkText = '#E8EAED';
    const fallbackLightText = '#202124';

    // Basic responsive wrapper for HTML content
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, shrink-to-fit=no">
          <base target="_blank">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              font-size: 16px;
              line-height: 1.5;
              color: ${readableTextColor};
              background-color: ${readableBgColor};
              margin: 0;
              padding: 0;
              word-wrap: break-word;
              overflow: hidden;
              width: 100%;
              max-width: 100vw;
            }
            html {
              background-color: ${readableBgColor};
              width: 100%;
              max-width: 100vw;
              overflow-x: hidden;
            }
            table, img, div {
              max-width: 100%;
              width: auto;
              height: auto;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            a {
              color: ${tintColor};
            }
            :root {
              color-scheme: light dark;
            }
          </style>
        </head>
        <body>
          ${email.htmlBody}
          <script>
            (function () {
              var isDarkMode = ${isDark ? 'true' : 'false'};
              var minContrast = 3;
              var linkColor = ${JSON.stringify(tintColor)};
              var darkText = ${JSON.stringify(fallbackDarkText)};
              var lightText = ${JSON.stringify(fallbackLightText)};

              function parseRgb(value) {
                if (!value) return null;
                var match = value.match(/rgba?\\(([^)]+)\\)/i);
                if (!match) return null;
                var parts = match[1].split(',').map(function (p) { return parseFloat(p.trim()); });
                if (parts.length < 3 || parts.some(function (n) { return Number.isNaN(n); })) return null;
                return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
              }

              function srgbToLinear(c) {
                var x = c / 255;
                return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
              }

              function luminance(rgb) {
                return 0.2126 * srgbToLinear(rgb[0]) + 0.7152 * srgbToLinear(rgb[1]) + 0.0722 * srgbToLinear(rgb[2]);
              }

              function contrastRatio(fg, bg) {
                var l1 = luminance(fg);
                var l2 = luminance(bg);
                var lighter = Math.max(l1, l2);
                var darker = Math.min(l1, l2);
                return (lighter + 0.05) / (darker + 0.05);
              }

              function getEffectiveBackground(element) {
                var current = element;
                while (current && current !== document.documentElement) {
                  var bg = parseRgb(window.getComputedStyle(current).backgroundColor);
                  if (bg && bg[3] > 0.01) return bg;
                  current = current.parentElement;
                }
                return isDarkMode ? [17, 20, 24, 1] : [255, 255, 255, 1];
              }

              function shouldSkipElement(element) {
                if (!element || !element.tagName) return true;
                var tag = element.tagName.toUpperCase();
                return ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IMG', 'SVG', 'PATH', 'CANVAS', 'VIDEO', 'IFRAME'].indexOf(tag) !== -1;
              }

              function normalizeContrast() {
                try {
                  document.querySelectorAll('a[href]').forEach(function (anchor) {
                    anchor.setAttribute('target', '_blank');
                    anchor.setAttribute('rel', 'noopener noreferrer');
                  });

                  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
                  var seen = new Set();
                  while (walker.nextNode()) {
                    var node = walker.currentNode;
                    if (!node || !node.nodeValue || !node.nodeValue.trim()) continue;
                    var element = node.parentElement;
                    if (!element || seen.has(element) || shouldSkipElement(element)) continue;
                    seen.add(element);

                    var fg = parseRgb(window.getComputedStyle(element).color);
                    if (!fg) continue;
                    var bg = getEffectiveBackground(element);
                    var ratio = contrastRatio(fg, bg);
                    if (ratio >= minContrast) continue;

                    var bgLum = luminance(bg);
                    if (element.tagName.toUpperCase() === 'A') {
                      element.style.setProperty('color', linkColor, 'important');
                      element.style.setProperty('text-decoration', 'underline', 'important');
                    } else {
                      element.style.setProperty('color', bgLum > 0.45 ? lightText : darkText, 'important');
                    }
                  }
                } catch (e) {
                  // best-effort readability pass
                }
              }

              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', normalizeContrast, { once: true });
              } else {
                normalizeContrast();
              }
              setTimeout(normalizeContrast, 80);
            })();
          </script>
          <script>
            (function () {
              var lastHeight = 0;
              function reportHeight() {
                var h = document.documentElement.scrollHeight;
                if (h > 0 && h !== lastHeight) {
                  lastHeight = h;
                  window.parent.postMessage({ type: 'iframeHeight', height: h }, '*');
                }
              }
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', reportHeight, { once: true });
              } else {
                reportHeight();
              }
              setTimeout(reportHeight, 200);
              setTimeout(reportHeight, 1000);
              setTimeout(reportHeight, 3000);
              // Use ResizeObserver to catch late-loading content (images, fonts, etc.)
              if (typeof ResizeObserver !== 'undefined') {
                new ResizeObserver(reportHeight).observe(document.documentElement);
              }
            })();
          </script>
        </body>
      </html>
    `;
  }, [email, textColor, tintColor, isDark]);

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
        <IconSymbol name="exclamationmark.triangle" size={48} color={errorColor} />
        <ThemedText style={styles.errorText} selectable>
          {error}
        </ThemedText>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: actionButtonBackground }]}
          onPress={loadData}
        >
          <ThemedText style={[styles.retryButtonText, { color: actionButtonText }]}>
            Retry
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: tintColor }]}
          onPress={signIn}
        >
          <ThemedText style={[styles.secondaryButtonText, { color: tintColor }]}>
            Sign in again
          </ThemedText>
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
          {actionLoading ? (
            <ActivityIndicator color={textColor} style={{ marginRight: 16 }} />
          ) : (
            <>
              {showRemoveLabel && (
                <TouchableOpacity 
                  onPress={handleRemoveLabel} 
                  style={[styles.actionButton, styles.actionHitSlop]}
                  accessibilityLabel="Remove label"
                  {...{ title: "Remove label" } as any}
                >
                  <IconSymbol name="tag.slash" size={isLargeScreen ? 28 : 22} color={textColor} />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                onPress={() => setShowFolderModal(true)} 
                style={[styles.actionButton, styles.actionHitSlop]}
                accessibilityLabel="Move to folder"
                {...{ title: "Move to folder" } as any}
              >
                <IconSymbol name="folder" size={isLargeScreen ? 28 : 22} color={textColor} />
              </TouchableOpacity>
            </>
          )}
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
          
          <View style={[styles.divider, { backgroundColor: separatorColor }]} />
          
          <View style={styles.bodyContainer}>
            {email.htmlBody ? (
              Platform.OS === 'web' ? (
                <iframe
                  srcDoc={htmlContent || ''}
                  style={{
                    width: '100%',
                    height: iframeHeight,
                    border: 'none',
                    backgroundColor: 'transparent',
                    overflow: 'hidden',
                  }}
                  scrolling="no"
                  title="Email Content"
                />
              ) : (
                <NativeWebView
                  originWhitelist={['*']}
                  source={{ html: htmlContent || '' }}
                  style={{ height: webViewHeight, backgroundColor: 'transparent' }}
                  scrollEnabled={false}
                  injectedJavaScript={`
                    (function() {
                      function reportHeight() {
                        var h = document.documentElement.scrollHeight;
                        var w = document.documentElement.scrollWidth;
                        if (h > 0) window.ReactNativeWebView.postMessage(String(h));
                        if (w > window.innerWidth) {
                          document.body.style.overflowX = 'hidden';
                          document.body.style.width = window.innerWidth + 'px';
                        }
                      }
                      reportHeight();
                      setTimeout(reportHeight, 300);
                      setTimeout(reportHeight, 1000);
                      setTimeout(reportHeight, 2000);
                    })();
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
  actionHitSlop: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginHorizontal: 16,
  },
  bodyContainer: {
    padding: 16,
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
  secondaryButton: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  secondaryButtonText: {
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
