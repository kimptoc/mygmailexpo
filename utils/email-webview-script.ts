// Injected into the native WebView that renders an email's HTML body.
// Reports content height back to React Native so the surrounding
// ScrollView can be sized to fit the whole email. Height is re-reported
// as async content (images, fonts, late reflows) settles, so long or
// slow-loading emails don't get clipped before the user can scroll to
// the bottom.
export function getEmailWebViewInjectedJavaScript(): string {
  return `
    (function() {
      var lastHeight = 0;
      function reportHeight() {
        var h = document.documentElement.scrollHeight;
        var w = document.documentElement.scrollWidth;
        if (h > 0 && h !== lastHeight) {
          lastHeight = h;
          window.ReactNativeWebView.postMessage(String(h));
        }
        if (w > window.innerWidth) {
          document.body.style.overflowX = 'hidden';
          document.body.style.width = window.innerWidth + 'px';
        }
      }
      reportHeight();
      setTimeout(reportHeight, 300);
      setTimeout(reportHeight, 1000);
      setTimeout(reportHeight, 2000);
      setTimeout(reportHeight, 4000);
      window.addEventListener('load', reportHeight);
      Array.prototype.forEach.call(document.images, function (img) {
        if (!img.complete) {
          img.addEventListener('load', reportHeight);
          img.addEventListener('error', reportHeight);
        }
      });
      if (typeof ResizeObserver !== 'undefined') {
        var ro = new ResizeObserver(reportHeight);
        ro.observe(document.documentElement);
        window.addEventListener('unload', function () { ro.disconnect(); });
      }
    })();
    true;
  `;
}
