import { buildEmailHtml } from './email-html';

// Regression coverage for issue #26: on web, an email whose first element is a
// large, slow-loading image used to leave the iframe too short, hiding the text
// below the image with no way to scroll to it. The fix relies on the injected
// script re-reporting height when images finish loading.
const webHtml = () =>
  buildEmailHtml({
    htmlBody: '<img src="https://example.com/hero.png" width="1000" height="3000"><p>Main text</p>',
    textColor: '#202124',
    backgroundColor: 'transparent',
    tintColor: '#0a7ea4',
    isDark: false,
    heightChannel: 'parent',
  });

describe('Email view scroll fix', () => {
  it('renders a responsive viewport wrapper', () => {
    const html = webHtml();
    expect(html).toContain('shrink-to-fit=no');
    expect(html).toContain('max-width: 100%');
    expect(html).toContain('table, img, div');
  });

  it('re-reports iframe height when images load so late images are not clipped', () => {
    const html = webHtml();
    expect(html).toContain('document.images');
    expect(html).toContain("addEventListener('load', reportHeight)");
    expect(html).toContain("addEventListener('error', reportHeight)");
  });

  it('re-reports iframe height over time and on resize', () => {
    const html = webHtml();
    expect(html).toContain('setTimeout(reportHeight, 4000)');
    expect(html).toContain("window.addEventListener('resize', reportHeight)");
  });

  it('notifies the parent frame of every distinct height', () => {
    const html = webHtml();
    expect(html).toContain('h !== lastHeight');
    expect(html).toContain('window.parent.postMessage');
  });
});
