import {
  Email,
  EmailDetail,
  GmailMessage,
  GmailMessageListResponse,
  GmailHeader,
  GmailMessagePart,
} from '@/types/gmail';

const GMAIL_API_BASE = 'https://www.googleapis.com/gmail/v1';

// Helper to decode base64url encoded content
function decodeBase64Url(data: string): string {
  // Replace URL-safe characters with standard base64
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return atob(base64);
  }
}

// Extract header value by name
function getHeader(headers: GmailHeader[] | undefined, name: string): string {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

// Parse message parts to extract body content
function parseMessageParts(
  parts: GmailMessagePart[] | undefined,
  result: { htmlBody?: string; plainTextBody?: string }
): void {
  if (!parts) return;

  for (const part of parts) {
    if (part.mimeType === 'text/html' && part.body?.data) {
      result.htmlBody = decodeBase64Url(part.body.data);
    } else if (part.mimeType === 'text/plain' && part.body?.data) {
      result.plainTextBody = decodeBase64Url(part.body.data);
    } else if (
      part.mimeType?.startsWith('multipart/') &&
      part.parts
    ) {
      parseMessageParts(part.parts, result);
    }
  }
}

// Convert Gmail API message to Email model
function messageToEmail(message: GmailMessage): Email {
  const headers = message.payload?.headers;
  return {
    id: message.id,
    threadId: message.threadId,
    subject: getHeader(headers, 'Subject') || '(No Subject)',
    from: getHeader(headers, 'From') || 'Unknown',
    snippet: message.snippet || '',
    receivedDate: parseInt(message.internalDate || '0', 10),
    isUnread: message.labelIds?.includes('UNREAD') || false,
    labelIds: message.labelIds || [],
  };
}

// Convert Gmail API message to EmailDetail model
function messageToEmailDetail(message: GmailMessage): EmailDetail {
  const headers = message.payload?.headers;
  const bodyContent: { htmlBody?: string; plainTextBody?: string } = {};

  // Check if body is directly in payload
  if (message.payload?.body?.data) {
    const mimeType = message.payload.mimeType;
    const decoded = decodeBase64Url(message.payload.body.data);
    if (mimeType === 'text/html') {
      bodyContent.htmlBody = decoded;
    } else {
      bodyContent.plainTextBody = decoded;
    }
  }

  // Parse multipart content
  parseMessageParts(message.payload?.parts, bodyContent);

  return {
    id: message.id,
    threadId: message.threadId,
    subject: getHeader(headers, 'Subject') || '(No Subject)',
    from: getHeader(headers, 'From') || 'Unknown',
    to: getHeader(headers, 'To') || '',
    cc: getHeader(headers, 'Cc') || undefined,
    bcc: getHeader(headers, 'Bcc') || undefined,
    snippet: message.snippet || '',
    receivedDate: parseInt(message.internalDate || '0', 10),
    isUnread: message.labelIds?.includes('UNREAD') || false,
    labelIds: message.labelIds || [],
    htmlBody: bodyContent.htmlBody,
    plainTextBody: bodyContent.plainTextBody,
  };
}

export class GmailApiService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${GMAIL_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Gmail API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * List emails from inbox
   */
  async getInboxEmails(maxResults: number = 20, pageToken?: string): Promise<{
    emails: Email[];
    nextPageToken?: string;
  }> {
    // Build query parameters
    const params = new URLSearchParams({
      maxResults: maxResults.toString(),
      q: 'in:inbox',
    });
    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    // List message IDs
    const listResponse = await this.fetch<GmailMessageListResponse>(
      `/users/me/messages?${params.toString()}`
    );

    if (!listResponse.messages || listResponse.messages.length === 0) {
      return { emails: [], nextPageToken: undefined };
    }

    // Fetch full details for each message (metadata only for list view)
    const emails = await Promise.all(
      listResponse.messages.map(async (ref) => {
        const message = await this.fetch<GmailMessage>(
          `/users/me/messages/${ref.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`
        );
        return messageToEmail(message);
      })
    );

    return {
      emails,
      nextPageToken: listResponse.nextPageToken,
    };
  }

  /**
   * Get full email details by ID
   */
  async getEmailDetail(emailId: string): Promise<EmailDetail> {
    const message = await this.fetch<GmailMessage>(
      `/users/me/messages/${emailId}?format=full`
    );
    return messageToEmailDetail(message);
  }

  /**
   * Mark email as read by removing UNREAD label
   */
  async markAsRead(emailId: string): Promise<void> {
    await this.fetch(`/users/me/messages/${emailId}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        removeLabelIds: ['UNREAD'],
      }),
    });
  }
}
