import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useGmailApi } from '@/services/gmailApi';
import { buildRfc2822Message, base64UrlEncode } from '@/utils/emailEncoder';
import { useToast } from '@/contexts/ToastContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  fromEmail: string;
}

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

export function ComposeEmailModal({ visible, onClose, fromEmail }: Props) {
  const { sendEmail } = useGmailApi();
  const { showToast } = useToast();
  const background = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setTo('');
    setSubject('');
    setBody('');
  };

  const handleSend = async () => {
    const toList = to.split(',').map(s => s.trim()).filter(Boolean);
    if (!toList.length || toList.some(addr => !isValidEmail(addr))) {
      showToast('Please enter a valid To address', 'error');
      return;
    }
    if (!subject.trim()) {
      showToast('Subject is required', 'error');
      return;
    }
    if (!fromEmail) {
      showToast('Not signed in', 'error');
      return;
    }

    setLoading(true);
    try {
      const rfcMessage = buildRfc2822Message({
        from: fromEmail,
        to: to,
        subject: subject,
        body: body,
      });
      const raw = base64UrlEncode(rfcMessage);
      await sendEmail(raw);
      showToast('Email sent', 'success');
      reset();
      onClose();
    } catch (err: any) {
      console.error('Send email error', err);
      showToast(err?.message || 'Failed to send email', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={[styles.backdrop]}>
          <View style={[styles.container, { backgroundColor: background }]}>
            <View style={styles.header}>
              <ThemedText type="title" style={styles.title}>Compose</ThemedText>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <ThemedText style={{ color: tint }}>Close</ThemedText>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.form}>
              <ThemedText style={styles.label}>From</ThemedText>
              <TextInput
                style={[styles.input, { color: text, borderColor: text + '30', backgroundColor: text + '0D' }]}
                value={fromEmail}
                editable={false}
              />

              <ThemedText style={styles.label}>To</ThemedText>
              <TextInput
                style={[styles.input, { color: text, borderColor: text + '30' }]}
                placeholder="email@example.com"
                placeholderTextColor={text + '60'}
                value={to}
                onChangeText={setTo}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <ThemedText style={styles.label}>Subject</ThemedText>
              <TextInput
                style={[styles.input, { color: text, borderColor: text + '30' }]}
                value={subject}
                onChangeText={setSubject}
                placeholder="Subject"
                placeholderTextColor={text + '60'}
              />

              <ThemedText style={styles.label}>Body</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  styles.bodyInput,
                  { color: text, borderColor: text + '30', textAlignVertical: 'top' },
                ]}
                value={body}
                onChangeText={setBody}
                placeholder="Write your message..."
                placeholderTextColor={text + '60'}
                multiline
                numberOfLines={6}
              />
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.secondaryButton, { borderColor: tint }]}
                disabled={loading}
              >
                <ThemedText style={[styles.secondaryText, { color: tint }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSend}
                style={[styles.primaryButton, { backgroundColor: loading ? tint + '80' : tint }]}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.primaryText}>Send</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    padding: 16,
  },
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  form: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  label: {
    fontWeight: '600',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  bodyInput: {
    minHeight: 140,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryText: {
    fontWeight: '600',
  },
  primaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default ComposeEmailModal;
