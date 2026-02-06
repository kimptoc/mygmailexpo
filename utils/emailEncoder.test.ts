import { base64UrlEncode, buildRfc2822Message } from './emailEncoder';

describe('emailEncoder', () => {
  it('builds a minimal message with required fields', () => {
    const msg = buildRfc2822Message({
      from: 'me@example.com',
      to: 'you@example.com',
      subject: 'Hello',
      body: 'Test body',
    });

    expect(msg).toContain('From: me@example.com');
    expect(msg).toContain('To: you@example.com');
    expect(msg).toContain('Subject: Hello');
    expect(msg).toContain('Content-Type: text/plain; charset=UTF-8');
    expect(msg).toMatch(/\r\n\r\nTest body$/);
  });

  it('throws when required fields are missing', () => {
    expect(() =>
      buildRfc2822Message({ from: '', to: 'x', subject: 's', body: 'b' })
    ).toThrow();
    expect(() =>
      buildRfc2822Message({ from: 'f', to: '', subject: 's', body: 'b' })
    ).toThrow();
    expect(() =>
      buildRfc2822Message({ from: 'f', to: 'x', subject: '', body: 'b' })
    ).toThrow();
  });

  it('normalizes multiple recipients from comma-separated list and arrays', () => {
    const fromString = buildRfc2822Message({
      from: 'me@example.com',
      to: 'a@example.com,  b@example.com ,',
      subject: 'Hello',
      body: 'Body',
    });

    expect(fromString).toContain('To: a@example.com, b@example.com');

    const fromArray = buildRfc2822Message({
      from: 'me@example.com',
      to: ['c@example.com ', ' d@example.com'],
      subject: 'Hello',
      body: 'Body',
    });

    expect(fromArray).toContain('To: c@example.com, d@example.com');
  });

  it('encodes base64url without padding', () => {
    const out = base64UrlEncode('test');
    expect(out).toBe('dGVzdA');
    expect(out.includes('=')).toBe(false);
  });

  it('encodes non-ascii correctly', () => {
    const out = base64UrlEncode('Привет');
    expect(out).toBe(Buffer.from('Привет').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
  });
});
