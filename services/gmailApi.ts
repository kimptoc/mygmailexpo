import { useAuth } from '@/contexts/AuthContext';
import { GmailLabel } from '@/types/folder';
import { Email, EmailDetail } from '@/types/gmail';
import { GmailApiError, withAuthRetryFactory } from './gmailApiAuth';
import { fetchWithBackoff } from './fetchWithBackoff';

interface GmailMessageResponse {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    mimeType: string;
    headers: Array<{
      name: string;
      value: string;
    }>;
    body?: {
      data?: string;
      size?: number;
    };
    parts?: any[];
  };
  sizeEstimate: number;
  historyId: string;
  internalDate: string;
}

interface ListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface BatchResult {
  succeeded: string[];
  failed: { id: string, error: string }[];
}

export interface BatchProgress {
  processed: number;
  total: number;
  succeeded: number;
  failed: number;
}

export class GmailApiService {
  private static instance: GmailApiService;
  private baseUrl = 'https://www.googleapis.com/gmail/v1/users/me';
  private readonly MAX_CONCURRENCY = 4;

  static getInstance(): GmailApiService {
    if (!GmailApiService.instance) {
      GmailApiService.instance = new GmailApiService();
    }
    return GmailApiService.instance;
  }

  async getLabels(accessToken: string): Promise<GmailLabel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/labels`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new GmailApiError(
          response.status,
          `Failed to fetch labels: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.labels.map((label: any) => ({
        id: label.id,
        name: label.name,
        type: label.type.toLowerCase(),
        backgroundColor: label.color?.backgroundColor,
        textColor: label.color?.textColor,
      })) || [];
    } catch (error) {
      console.error('Error fetching labels:', error);
      throw error;
    }
  }

  async getEmailsByLabel(
    accessToken: string,
    labelId: string,
    maxResults: number = 20,
    pageToken?: string
  ): Promise<{ emails: Email[]; nextPageToken?: string }> {
    try {
      let url = `${this.baseUrl}/messages?maxResults=${maxResults}`;
      if (labelId !== 'ALL') {
        url += `&labelIds=${encodeURIComponent(labelId)}`;
      }

      if (pageToken) {
        url += `&pageToken=${encodeURIComponent(pageToken)}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new GmailApiError(
          response.status,
          `Failed to fetch emails: ${response.status} ${response.statusText}`
        );
      }

      const data: ListResponse = await response.json();

      if (data.messages && data.messages.length > 0) {
        const emailDetails = await Promise.all(
          data.messages.map(message => this.getEmailMinimal(accessToken, message.id))
        );

        return {
          emails: emailDetails.filter(email => email !== null) as Email[],
          nextPageToken: data.nextPageToken,
        };
      }

      return {
        emails: [],
        nextPageToken: data.nextPageToken,
      };
    } catch (error) {
      console.error('Error fetching emails by label:', error);
      throw error;
    }
  }

  async getEmailMinimal(accessToken: string, emailId: string): Promise<Email | null> {
    try {
      const response = await fetch(`${this.baseUrl}/messages/${emailId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new GmailApiError(
            response.status,
            `Failed to fetch email: ${response.status} ${response.statusText}`
          );
        }
        return null;
      }

      const data: GmailMessageResponse = await response.json();
      const headers = data.payload.headers || [];
      const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
      const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '(Unknown)';
      
      return {
        id: data.id,
        threadId: data.threadId,
        labelIds: data.labelIds || [],
        subject,
        from,
        snippet: data.snippet || '',
        receivedDate: parseInt(data.internalDate),
        isUnread: data.labelIds?.includes('UNREAD') || false,
      };
    } catch (error) {
      console.error(`Error fetching minimal email ${emailId}:`, error);
      return null;
    }
  }

  async getEmailDetail(accessToken: string, emailId: string): Promise<EmailDetail> {
    try {
      const response = await fetch(`${this.baseUrl}/messages/${emailId}?format=full`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new GmailApiError(
          response.status,
          `Failed to fetch email: ${response.status} ${response.statusText}`
        );
      }

      const data: GmailMessageResponse = await response.json();
      const headers = data.payload.headers || [];
      
      const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const email: EmailDetail = {
        id: data.id,
        threadId: data.threadId,
        labelIds: data.labelIds || [],
        subject: getHeader('subject') || '(No Subject)',
        from: getHeader('from'),
        to: getHeader('to'),
        cc: getHeader('cc'),
        bcc: getHeader('bcc'),
        snippet: data.snippet || '',
        receivedDate: parseInt(data.internalDate),
        isUnread: data.labelIds?.includes('UNREAD') || false,
      };

      const parts = this.flattenParts(data.payload);
      
      const htmlPart = parts.find(p => p.mimeType === 'text/html');
      if (htmlPart?.body?.data) {
        email.htmlBody = this.decodeBase64(htmlPart.body.data);
      }

      const plainTextPart = parts.find(p => p.mimeType === 'text/plain');
      if (plainTextPart?.body?.data) {
        email.plainTextBody = this.decodeBase64(plainTextPart.body.data);
      }

      // If no parts (simple message)
      if (!email.htmlBody && !email.plainTextBody && data.payload.body?.data) {
        const body = this.decodeBase64(data.payload.body.data);
        if (data.payload.mimeType === 'text/html') {
          email.htmlBody = body;
        } else {
          email.plainTextBody = body;
        }
      }

      return email;
    } catch (error) {
      console.error('Error fetching email detail:', error);
      throw error;
    }
  }

  private flattenParts(payload: any): any[] {
    let parts: any[] = [];
    if (payload.parts) {
      for (const part of payload.parts) {
        parts.push(part);
        if (part.parts) {
          parts = parts.concat(this.flattenParts(part));
        }
      }
    }
    return parts;
  }

  async markAsRead(accessToken: string, emailId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/messages/${emailId}/modify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          removeLabelIds: ['UNREAD'],
        }),
      });

      if (!response.ok) {
        throw new GmailApiError(
          response.status,
          `Failed to mark as read: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error('Error marking email as read:', error);
      throw error;
    }
  }

  async removeLabelFromEmails(
    accessToken: string,
    emailIds: string[],
    labelId: string,
    onProgress?: (progress: BatchProgress) => void
  ): Promise<BatchResult> {
    return this.processEmailModifications(accessToken, emailIds, () => ({
      removeLabelIds: [labelId],
    }), onProgress);
  }

  async moveEmailsToLabel(
    accessToken: string,
    emailIds: string[],
    targetLabelId: string,
    currentLabelId: string,
    onProgress?: (progress: BatchProgress) => void
  ): Promise<BatchResult> {
    return this.processEmailModifications(accessToken, emailIds, () => ({
      addLabelIds: [targetLabelId],
      removeLabelIds: [currentLabelId],
    }), onProgress);
  }

  async sendEmail(accessToken: string, raw: string): Promise<void> {
    const response = await fetchWithBackoff(`${this.baseUrl}/messages/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `Failed with status ${response.status}`;
      throw new GmailApiError(response.status, errorMessage);
    }
  }

  private async processEmailModifications(
    accessToken: string,
    emailIds: string[],
    buildBody: (id: string) => Record<string, any>,
    onProgress?: (progress: BatchProgress) => void
  ): Promise<BatchResult> {
    const succeeded: string[] = [];
    const failed: { id: string; error: string }[] = [];
    const workers: Promise<void>[] = [];
    const total = emailIds.length;
    let processed = 0;

    for (let i = 0; i < emailIds.length; i += this.MAX_CONCURRENCY) {
      workers.length = 0;
      const end = Math.min(i + this.MAX_CONCURRENCY, emailIds.length);

      for (let j = i; j < end; j++) {
        const id = emailIds[j];
        workers.push(
          (async () => {
            const response = await fetchWithBackoff(`${this.baseUrl}/messages/${id}/modify`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(buildBody(id)),
            });

            if (!response.ok) {
              if (response.status === 401) {
                throw new GmailApiError(response.status, 'Unauthorized');
              }
              const errorData = await response.json().catch(() => ({}));
              const errorMessage = errorData.error?.message || `Failed with status ${response.status}`;
              failed.push({ id, error: errorMessage });
            } else {
              succeeded.push(id);
            }
            processed += 1;
            onProgress?.({
              processed,
              total,
              succeeded: succeeded.length,
              failed: failed.length,
            });
          })()
        );
      }

      await Promise.all(workers);
    }

    return { succeeded, failed };
  }

  private decodeBase64(base64Str: string): string {
    let base64 = base64Str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) {
      if (pad === 1) throw new Error('Invalid base64 string');
      base64 += new Array(5 - pad).join('=');
    }

    try {
      const raw = atob(base64);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        bytes[i] = raw.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    } catch (error) {
      console.error('Error decoding base64:', error);
      return '';
    }
  }
}

export const useGmailApi = () => {
  const { getAccessToken, refreshAccessToken } = useAuth();

  const ensureToken = async () => {
    const token = getAccessToken();
    if (!token) throw new Error('No access token available');
    return token;
  };

  const withAuthRetry = withAuthRetryFactory(ensureToken, refreshAccessToken);

  const getLabels = async (): Promise<GmailLabel[]> => {
    return withAuthRetry((token) => GmailApiService.getInstance().getLabels(token));
  };

  const getEmailsByLabel = async (
    labelId: string,
    maxResults: number = 20,
    pageToken?: string
  ): Promise<{ emails: Email[]; nextPageToken?: string }> => {
    return withAuthRetry((token) =>
      GmailApiService.getInstance().getEmailsByLabel(token, labelId, maxResults, pageToken)
    );
  };

  const getEmailDetail = async (emailId: string): Promise<EmailDetail> => {
    return withAuthRetry((token) => GmailApiService.getInstance().getEmailDetail(token, emailId));
  };

  const markAsRead = async (emailId: string): Promise<void> => {
    return withAuthRetry((token) => GmailApiService.getInstance().markAsRead(token, emailId));
  };

  const removeLabelFromEmails = async (
    emailIds: string[],
    labelId: string,
    onProgress?: (progress: BatchProgress) => void
  ): Promise<BatchResult> => {
    return withAuthRetry((token) =>
      GmailApiService.getInstance().removeLabelFromEmails(token, emailIds, labelId, onProgress)
    );
  };

  const moveEmailsToLabel = async (
    emailIds: string[],
    targetLabelId: string,
    currentLabelId: string,
    onProgress?: (progress: BatchProgress) => void
  ): Promise<BatchResult> => {
    return withAuthRetry((token) =>
      GmailApiService.getInstance().moveEmailsToLabel(token, emailIds, targetLabelId, currentLabelId, onProgress)
    );
  };

  const sendEmail = async (raw: string): Promise<void> => {
    return withAuthRetry((token) => GmailApiService.getInstance().sendEmail(token, raw));
  };

  return {
    getLabels,
    getEmailsByLabel,
    getEmailDetail,
    markAsRead,
    removeLabelFromEmails,
    moveEmailsToLabel,
    sendEmail,
  };
};
