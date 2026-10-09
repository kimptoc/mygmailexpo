import { buildEmailHtml } from './email-html';

const baseOptions = {
  htmlBody: '<img src="https://example.com/hero.png" width="1000" height="3000"><p>Main text</p>',
  textColor: '#202124',
  backgroundColor: 'transparent',
  tintColor: '#0a7ea4',
  isDark: false,
};

describe('buildEmailHtml', () => {
  it('wraps the email body with a responsive viewport and image constraints', () => {
    const html = buildEmailHtml({ ...baseOptions, heightChannel: 'parent' });
    expect(html).toContain('shrink-to-fit=no');
    expect(html).toContain('table, img, div');
    expect(html).toContain('max-width: 100%');
    expect(html).toContain('<p>Main text</p>');
  });

  it('applies the provided theme colours', () => {
    const html = buildEmailHtml({
      ...baseOptions,
      textColor: '#E8EAED',
      tintColor: '#7fd1f0',
      isDark: true,
      heightChannel: 'parent',
    });
    expect(html).toContain('color: #E8EAED');
    expect(html).toContain('color: #7fd1f0');
    expect(html).toContain('var isDarkMode = true;');
  });

  it('embeds the enhancement script regardless of height channel', () => {
    const html = buildEmailHtml({ ...baseOptions, heightChannel: null });
    expect(html).toContain('runEnhancements');
    expect(html).toContain('autoLinkUrls');
    expect(html).toContain('normalizeContrast');
  });

  it('embeds the height-report script posting to the parent for web iframes', () => {
    const html = buildEmailHtml({ ...baseOptions, heightChannel: 'parent' });
    // Must be wrapped in <script> tags so the iframe actually executes it.
    expect(html).toMatch(/<script>[\s\S]*window\.parent\.postMessage[\s\S]*<\/script>/);
    expect(html).toContain("{ type: 'iframeHeight', height: h }");
  });

  it('omits the height-report script when no channel is given (native injects it)', () => {
    const html = buildEmailHtml({ ...baseOptions, heightChannel: null });
    expect(html).not.toContain('h !== lastHeight');
    expect(html).not.toContain('window.parent.postMessage');
  });
});
