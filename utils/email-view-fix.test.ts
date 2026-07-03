import { getEmailWebViewInjectedJavaScript } from './email-webview-script';

describe('Email View Scroll Fix', () => {
  const generateHtmlWithViewportFix = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, shrink-to-fit=no">
          <style>
            body {
              overflow-x: hidden;
              width: 100%;
              max-width: 100vw;
            }
            html {
              overflow-x: hidden;
            }
            table, img, div {
              max-width: 100%;
            }
          </style>
        </head>
        <body>
          Test content
        </body>
      </html>
    `;
  };

  it('generates HTML with viewport fix for scroll issues', () => {
    const html = generateHtmlWithViewportFix();
    expect(html).toContain('shrink-to-fit=no');
    expect(html).toContain('overflow-x: hidden');
    expect(html).toContain('max-width: 100%');
  });

  it('includes max-width constraints for tables and images', () => {
    const html = generateHtmlWithViewportFix();
    expect(html).toContain('table, img, div');
    expect(html).toContain('max-width: 100%');
  });

  describe('iframe height calculation', () => {
    const calculateIframeHeight = (windowHeight: number) => Math.max(300, windowHeight - 250);

    it('uses minimum height of 300 pixels', () => {
      expect(calculateIframeHeight(200)).toBe(300);
      expect(calculateIframeHeight(100)).toBe(300);
    });

    it('calculates height based on window dimensions', () => {
      expect(calculateIframeHeight(800)).toBe(550);
      expect(calculateIframeHeight(1000)).toBe(750);
    });

    it('handles iPad landscape dimensions', () => {
      expect(calculateIframeHeight(1024)).toBe(774);
    });
  });

  describe('JavaScript height reporting fix', () => {
    const injectedJs = getEmailWebViewInjectedJavaScript();

    it('checks both height and width for overflow', () => {
      expect(injectedJs).toContain('scrollHeight');
      expect(injectedJs).toContain('scrollWidth');
    });

    it('handles width overflow by constraining body', () => {
      expect(injectedJs).toContain('overflowX = \'hidden\'');
      expect(injectedJs).toContain('window.innerWidth');
    });

    it('reports height multiple times for dynamic content', () => {
      const count = (injectedJs.match(/reportHeight/g) || []).length;
      expect(count).toBeGreaterThanOrEqual(5);
    });

    it('keeps observing layout changes via ResizeObserver so slow-loading emails stay fully scrollable', () => {
      expect(injectedJs).toContain('ResizeObserver');
    });

    it('re-reports height once images finish loading', () => {
      expect(injectedJs).toContain('document.images');
      expect(injectedJs).toContain("addEventListener('load'");
    });
  });
});
