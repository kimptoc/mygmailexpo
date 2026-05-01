import { splitTextOnUrls, URL_PATTERN_SOURCE } from './auto-link-urls';

describe('URL_PATTERN_SOURCE', () => {
  it('is a non-empty string usable as a RegExp source', () => {
    expect(typeof URL_PATTERN_SOURCE).toBe('string');
    expect(URL_PATTERN_SOURCE.length).toBeGreaterThan(0);
    expect(() => new RegExp(URL_PATTERN_SOURCE, 'g')).not.toThrow();
  });
});

describe('splitTextOnUrls', () => {
  it('returns no segments for an empty string', () => {
    expect(splitTextOnUrls('')).toEqual([]);
  });

  it('returns a single text segment when there is no URL', () => {
    expect(splitTextOnUrls('hello world')).toEqual([
      { type: 'text', value: 'hello world' },
    ]);
  });

  it('returns a single URL segment when the input is just a URL', () => {
    expect(splitTextOnUrls('https://example.com/a')).toEqual([
      { type: 'url', value: 'https://example.com/a' },
    ]);
  });

  it('splits text-url-text', () => {
    expect(splitTextOnUrls('see https://example.com here')).toEqual([
      { type: 'text', value: 'see ' },
      { type: 'url', value: 'https://example.com' },
      { type: 'text', value: ' here' },
    ]);
  });

  it('splits two URLs separated by text', () => {
    expect(splitTextOnUrls('a https://x.com b https://y.com c')).toEqual([
      { type: 'text', value: 'a ' },
      { type: 'url', value: 'https://x.com' },
      { type: 'text', value: ' b ' },
      { type: 'url', value: 'https://y.com' },
      { type: 'text', value: ' c' },
    ]);
  });

  it('trims trailing punctuation from a URL match', () => {
    expect(splitTextOnUrls('see https://x.com.')).toEqual([
      { type: 'text', value: 'see ' },
      { type: 'url', value: 'https://x.com' },
      { type: 'text', value: '.' },
    ]);
    expect(splitTextOnUrls('really? https://x.com?')).toEqual([
      { type: 'text', value: 'really? ' },
      { type: 'url', value: 'https://x.com' },
      { type: 'text', value: '?' },
    ]);
  });

  it('preserves query strings and fragments inside the URL', () => {
    expect(splitTextOnUrls('go https://x.com/p?a=1&b=2#sec then')).toEqual([
      { type: 'text', value: 'go ' },
      { type: 'url', value: 'https://x.com/p?a=1&b=2#sec' },
      { type: 'text', value: ' then' },
    ]);
  });

  it('does not include surrounding parentheses in the URL', () => {
    expect(splitTextOnUrls('see (https://x.com/y) ok')).toEqual([
      { type: 'text', value: 'see (' },
      { type: 'url', value: 'https://x.com/y' },
      { type: 'text', value: ') ok' },
    ]);
  });

  it('does not include surrounding angle brackets in the URL', () => {
    expect(splitTextOnUrls('try <https://x.com> now')).toEqual([
      { type: 'text', value: 'try <' },
      { type: 'url', value: 'https://x.com' },
      { type: 'text', value: '> now' },
    ]);
  });

  it('matches both http and https schemes', () => {
    expect(splitTextOnUrls('a http://x.com b')).toEqual([
      { type: 'text', value: 'a ' },
      { type: 'url', value: 'http://x.com' },
      { type: 'text', value: ' b' },
    ]);
  });

  it('does not match a bare hostname without a scheme', () => {
    expect(splitTextOnUrls('visit example.com please')).toEqual([
      { type: 'text', value: 'visit example.com please' },
    ]);
  });
});
