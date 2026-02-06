import { Buffer } from 'buffer';
const CRLF = '\r\n';

export type BuildMessageInput = {
  from: string;
  to: string | string[];
  subject: string;
  body: string;
};

const normalizeList = (value?: string | string[]) => {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : value.split(',');
  return arr.map(v => v.trim()).filter(Boolean);
};

export const buildRfc2822Message = ({
  from,
  to,
  subject,
  body,
}: BuildMessageInput): string => {
  const toList = normalizeList(to);

  if (!from) throw new Error('From is required');
  if (toList.length === 0) throw new Error('To is required');
  if (!subject) throw new Error('Subject is required');

  const headers = [
    `From: ${from}`,
    `To: ${toList.join(', ')}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
  ];

  return `${headers.join(CRLF)}${CRLF}${CRLF}${body}`;
};

export const base64UrlEncode = (input: string): string => {
  const utf8 = new TextEncoder().encode(input);
  let base64 = Buffer.from(utf8).toString('base64');
  base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return base64;
};
