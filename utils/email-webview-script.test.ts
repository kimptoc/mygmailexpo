import { getEmailWebViewInjectedJavaScript } from './email-webview-script';

describe('getEmailWebViewInjectedJavaScript', () => {
  it('ends with `true;` as required by react-native-webview injectedJavaScript', () => {
    expect(getEmailWebViewInjectedJavaScript().trim().endsWith('true;')).toBe(true);
  });

  it('only posts a height update when the height actually changes', () => {
    expect(getEmailWebViewInjectedJavaScript()).toContain('h !== lastHeight');
  });

  it('schedules a longer-delay fallback report for slow-loading content', () => {
    expect(getEmailWebViewInjectedJavaScript()).toContain('setTimeout(reportHeight, 4000)');
  });

  it('disconnects the ResizeObserver on unload to avoid leaking it', () => {
    expect(getEmailWebViewInjectedJavaScript()).toContain('ro.disconnect()');
  });

  it('re-reports height as images finish loading or fail (slow/large images)', () => {
    const js = getEmailWebViewInjectedJavaScript();
    expect(js).toContain('document.images');
    expect(js).toContain("addEventListener('load', reportHeight)");
    expect(js).toContain("addEventListener('error', reportHeight)");
  });

  it('observes the body as well as the root element for late layout growth', () => {
    expect(getEmailWebViewInjectedJavaScript()).toContain('ro.observe(document.body)');
  });

  it('posts a typed message to window.parent for the web iframe channel', () => {
    const js = getEmailWebViewInjectedJavaScript('parent');
    expect(js).toContain('window.parent.postMessage');
    expect(js).toContain("{ type: 'iframeHeight', height: h }");
    expect(js).not.toContain('ReactNativeWebView');
  });

  it('posts a typed JSON message via ReactNativeWebView for the native channel', () => {
    const js = getEmailWebViewInjectedJavaScript('native');
    expect(js).toContain('window.ReactNativeWebView.postMessage');
    expect(js).toContain("JSON.stringify({ type: 'iframeHeight', height: h })");
  });
});
