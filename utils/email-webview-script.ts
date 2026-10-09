// Reports the rendered height of an email's HTML body back to the host so the
// surrounding scroll container can be sized to fit the whole email. Used both
// by the native WebView (channel: 'native') and the web iframe (channel:
// 'parent').
//
// Height is re-reported as async content (images, fonts, late reflows) settles,
// so long or slow-loading emails don't get clipped before the user can scroll to
// the bottom. The image load/error listeners are essential: a large image that
// finishes loading after the last timeout otherwise leaves the container too
// short, hiding everything below it.
export type EmailHeightChannel = 'native' | 'parent';

export function getEmailWebViewInjectedJavaScript(
  channel: EmailHeightChannel = 'native'
): string {
  const postMessage =
    channel === 'native'
      ? `if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'iframeHeight', height: h }));
            }`
      : `window.parent.postMessage({ type: 'iframeHeight', height: h }, '*');`;

  return `
    (function() {
      var lastHeight = 0;
      function reportHeight() {
        var h = document.documentElement.scrollHeight;
        var w = document.documentElement.scrollWidth;
        if (h > 0 && h !== lastHeight) {
          lastHeight = h;
          ${postMessage}
        }
        if (w > window.innerWidth) {
          document.body.style.overflowX = 'hidden';
          document.body.style.width = window.innerWidth + 'px';
        }
      }
      function watchImages() {
        Array.prototype.forEach.call(document.images, function (img) {
          if (!img.complete) {
            img.addEventListener('load', reportHeight);
            img.addEventListener('error', reportHeight);
          }
        });
      }
      reportHeight();
      setTimeout(reportHeight, 300);
      setTimeout(reportHeight, 1000);
      setTimeout(reportHeight, 2000);
      setTimeout(reportHeight, 4000);
      window.addEventListener('load', function () { watchImages(); reportHeight(); });
      window.addEventListener('resize', reportHeight);
      watchImages();
      if (typeof ResizeObserver !== 'undefined') {
        var ro = new ResizeObserver(reportHeight);
        ro.observe(document.documentElement);
        if (document.body) ro.observe(document.body);
        window.addEventListener('unload', function () { ro.disconnect(); });
      }
    })();
    true;
  `;
}
