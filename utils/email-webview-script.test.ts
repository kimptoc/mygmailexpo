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
});
