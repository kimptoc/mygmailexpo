import { useAuth } from '@/contexts/AuthContext';
import { GmailLabel } from '@/types/folder';

interface Email {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{
      name: string;
      value: string;
    }>;
    body?: {
      data?: string;
      size?: number;
    };
  };
  sizeEstimate: number;
  historyId: string;
}

interface ListResponse {
  messages?: Email[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export class GmailApiService {
  private static instance: GmailApiService;
  private baseUrl = 'https://www.googleapis.com/gmail/v1/users/me';

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
        throw new Error(`Failed to fetch labels: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.labels || [];
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
  ): Promise<{ emails: any[]; nextPageToken?: string }> {
    try {
      // Special handling for INBOX - use the inbox-specific endpoint
      let url;
      if (labelId === 'INBOX') {
        url = `${this.baseUrl}/messages?labelIds=INBOX&maxResults=${maxResults}`;
      } else {
        url = `${this.baseUrl}/messages?labelIds=${encodeURIComponent(labelId)}&maxResults=${maxResults}`;
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
        throw new Error(`Failed to fetch emails: ${response.status} ${response.statusText}`);
      }

      const data: ListResponse = await response.json();

      // If there are messages, fetch their details
      if (data.messages && data.messages.length > 0) {
        const emailDetails = await Promise.all(
          data.messages.map(message => this.getEmailDetail(accessToken, message.id))
        );

        return {
          emails: emailDetails,
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

  async getEmailDetail(accessToken: string, emailId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/messages/${emailId}?format=full`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch email: ${response.status} ${response.statusText}`);
      }

      const emailData = await response.json();

      // Extract relevant information from the email payload
      const headers = emailData.payload.headers || [];
      const subjectHeader = headers.find((header: any) => header.name.toLowerCase() === 'subject');
      const fromHeader = headers.find((header: any) => header.name.toLowerCase() === 'from');
      const dateHeader = headers.find((header: any) => header.name.toLowerCase() === 'date');

      // Decode the body if it exists
      let body = '';
      if (emailData.payload.parts && emailData.payload.parts.length > 0) {
        // Look for the text/plain part
        const textPart = emailData.payload.parts.find((part: any) =>
          part.mimeType === 'text/plain' && part.body && part.body.data
        );

        if (textPart) {
          body = this.decodeBase64(textPart.body.data);
        } else {
          // Look for HTML part if plain text is not available
          const htmlPart = emailData.payload.parts.find((part: any) =>
            part.mimeType === 'text/html' && part.body && part.body.data
          );

          if (htmlPart) {
            body = this.decodeBase64(htmlPart.body.data);
          } else {
            // Fallback to looking for any text part
            const fallbackPart = emailData.payload.parts.find((part: any) =>
              part.mimeType && part.mimeType.startsWith('text/') && part.body && part.body.data
            );

            if (fallbackPart) {
              body = this.decodeBase64(fallbackPart.body.data);
            }
          }
        }
      } else if (emailData.payload.body && emailData.payload.body.data) {
        // For emails with a single body part
        body = this.decodeBase64(emailData.payload.body.data);
      }

      return {
        id: emailData.id,
        threadId: emailData.threadId,
        labelIds: emailData.labelIds,
        subject: subjectHeader ? subjectHeader.value : 'No Subject',
        from: fromHeader ? fromHeader.value : 'Unknown Sender',
        date: dateHeader ? dateHeader.value : '',
        snippet: emailData.snippet || '',
        body: body,
        sizeEstimate: emailData.sizeEstimate,
      };
    } catch (error) {
      console.error('Error fetching email detail:', error);
      throw error;
    }
  }

  private decodeBase64(base64Str: string): string {
    // Replace URL-safe base64 chars
    let base64 = base64Str.replace(/-/g, '+').replace(/_/g, '/');

    // Pad with '=' if needed
    const pad = base64.length % 4;
    if (pad) {
      if (pad === 1) {
        throw new Error('Invalid base64 string');
      }
      base64 += new Array(5 - pad).join('=');
    }

    try {
      // Decode base64 to bytes
      const raw = atob(base64);
      // Convert bytes to string
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

// Hook to use the Gmail API service
export const useGmailApi = () => {
  const { getAccessToken } = useAuth();

  const getLabels = async (): Promise<GmailLabel[]> => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('No access token available');
    }

    const apiService = GmailApiService.getInstance();
    return apiService.getLabels(accessToken);
  };

  const getEmailsByLabel = async (
    labelId: string,
    maxResults: number = 20,
    pageToken?: string
  ): Promise<{ emails: any[]; nextPageToken?: string }> => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('No access token available');
    }

    const apiService = GmailApiService.getInstance();
    return apiService.getEmailsByLabel(accessToken, labelId, maxResults, pageToken);
  };

  const getEmailDetail = async (emailId: string): Promise<any> => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('No access token available');
    }

    const apiService = GmailApiService.getInstance();
    return apiService.getEmailDetail(accessToken, emailId);
  };

  return {
    getLabels,
    getEmailsByLabel,
    getEmailDetail,
  };
};