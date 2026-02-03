// Gmail API Types - ported from KMP app

export interface Email {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  receivedDate: number; // timestamp in milliseconds
  isUnread: boolean;
  labelIds: string[];
}

export interface EmailDetail extends Email {
  to: string;
  cc?: string;
  bcc?: string;
  htmlBody?: string;
  plainTextBody?: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  type: LabelType;
  backgroundColor?: string;
  textColor?: string;
}

export enum LabelType {
  SYSTEM = 'system',
  USER = 'user',
}

// Gmail API Response Types
export interface GmailMessageListResponse {
  messages?: GmailMessageRef[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export interface GmailMessageRef {
  id: string;
  threadId: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePayload;
}

export interface GmailMessagePayload {
  headers?: GmailHeader[];
  body?: GmailMessageBody;
  parts?: GmailMessagePart[];
  mimeType?: string;
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessageBody {
  size: number;
  data?: string;
}

export interface GmailMessagePart {
  partId: string;
  mimeType: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: GmailMessageBody;
  parts?: GmailMessagePart[];
}

export interface GmailLabelsResponse {
  labels?: GmailLabelResponse[];
}

export interface GmailLabelResponse {
  id: string;
  name: string;
  type: string;
  color?: {
    backgroundColor?: string;
    textColor?: string;
  };
}

// Auth State Types
export type AuthState =
  | { status: 'unauthenticated' }
  | { status: 'loading' }
  | { status: 'authenticated'; userEmail: string; accessToken: string }
  | { status: 'error'; message: string };

// Email List State
export interface EmailListState {
  emails: Email[];
  isLoading: boolean;
  error?: string;
  nextPageToken?: string;
}

// Helper functions ported from KMP app
export function getFromName(from: string): string {
  // Extract name from "Name <email@example.com>" format
  const nameMatch = from.match(/^([^<]+)</);
  if (nameMatch) {
    return nameMatch[1].trim();
  }
  // Extract email from "<email@example.com>" format
  const emailMatch = from.match(/<([^>]+)>/);
  if (emailMatch) {
    return emailMatch[1].split('@')[0];
  }
  // If no angle brackets, check if it's just an email
  if (from.includes('@')) {
    return from.split('@')[0];
  }
  return from;
}

export function getFromEmail(from: string): string {
  // Extract email from "Name <email@example.com>" format
  const match = from.match(/<([^>]+)>/);
  if (match) {
    return match[1];
  }
  return from;
}

export function getSmartFormattedDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return 'Yesterday';
  }

  const isThisYear = date.getFullYear() === now.getFullYear();
  if (isThisYear) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// System labels
export const SYSTEM_LABELS: Record<string, GmailLabel> = {
  INBOX: {
    id: 'INBOX',
    name: 'Inbox',
    type: LabelType.SYSTEM,
    backgroundColor: '#E8F0FE',
    textColor: '#1A73E8',
  },
  SENT: {
    id: 'SENT',
    name: 'Sent',
    type: LabelType.SYSTEM,
    backgroundColor: '#E8F5E9',
    textColor: '#1E8E3E',
  },
  DRAFT: {
    id: 'DRAFT',
    name: 'Drafts',
    type: LabelType.SYSTEM,
    backgroundColor: '#FFF4E5',
    textColor: '#E37400',
  },
  TRASH: {
    id: 'TRASH',
    name: 'Trash',
    type: LabelType.SYSTEM,
    backgroundColor: '#FBE8E6',
    textColor: '#C5221F',
  },
  SPAM: {
    id: 'SPAM',
    name: 'Spam',
    type: LabelType.SYSTEM,
    backgroundColor: '#FBE8E6',
    textColor: '#C5221F',
  },
  STARRED: {
    id: 'STARRED',
    name: 'Starred',
    type: LabelType.SYSTEM,
    backgroundColor: '#FEF7E0',
    textColor: '#F9AB00',
  },
};
