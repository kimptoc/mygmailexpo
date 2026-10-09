import { URL_PATTERN_SOURCE } from './auto-link-urls';
import {
  EmailHeightChannel,
  getEmailWebViewInjectedJavaScript,
} from './email-webview-script';

export interface EmailHtmlOptions {
  htmlBody: string;
  // Already-resolved readable text colour for the current theme.
  textColor: string;
  backgroundColor: string;
  tintColor: string;
  isDark: boolean;
  // Where the height-report script posts to. Web iframes use 'parent'; omit for
  // the native WebView, which injects the script via `injectedJavaScript`.
  heightChannel?: EmailHeightChannel | null;
}

// Wraps an email's HTML body in a responsive document with readability
// enhancements. Pure so it can be unit tested without rendering the screen.
export function buildEmailHtml({
  htmlBody,
  textColor,
  backgroundColor,
  tintColor,
  isDark,
  heightChannel = null,
}: EmailHtmlOptions): string {
  const fallbackDarkText = '#E8EAED';
  const fallbackLightText = '#202124';
  // The native WebView injects this script itself via `injectedJavaScript`
  // (which must not contain <script> tags); the web iframe needs it wrapped.
  const heightScript = heightChannel
    ? `<script>${getEmailWebViewInjectedJavaScript(heightChannel)}</script>`
    : '';

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, shrink-to-fit=no">
          <base target="_blank">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              font-size: 16px;
              line-height: 1.5;
              color: ${textColor};
              background-color: ${backgroundColor};
              margin: 0;
              padding: 0;
              word-wrap: break-word;
              overflow: hidden;
              width: 100%;
              max-width: 100vw;
            }
            html {
              background-color: ${backgroundColor};
              width: 100%;
              max-width: 100vw;
              overflow: hidden;
            }
            table, img, div {
              max-width: 100%;
              width: auto;
              height: auto;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            a {
              color: ${tintColor};
            }
            :root {
              color-scheme: light dark;
            }
          </style>
        </head>
        <body>
          ${htmlBody}
          <script>
            (function () {
              var isDarkMode = ${isDark ? 'true' : 'false'};
              var minContrast = 3;
              var linkColor = ${JSON.stringify(tintColor)};
              var darkText = ${JSON.stringify(fallbackDarkText)};
              var lightText = ${JSON.stringify(fallbackLightText)};
              var URL_PATTERN_SOURCE = ${JSON.stringify(URL_PATTERN_SOURCE)};

              function autoLinkUrls() {
                try {
                  var trailingPunct = /[.,;:!?]+$/;
                  var skipTags = ['A', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'];

                  function isInsideSkippedAncestor(node) {
                    var p = node.parentElement;
                    while (p) {
                      if (p.tagName && skipTags.indexOf(p.tagName.toUpperCase()) !== -1) return true;
                      p = p.parentElement;
                    }
                    return false;
                  }

                  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
                  var candidates = [];
                  while (walker.nextNode()) {
                    var node = walker.currentNode;
                    if (!node.nodeValue) continue;
                    if (isInsideSkippedAncestor(node)) continue;
                    if (!/https?:\\/\\//.test(node.nodeValue)) continue;
                    candidates.push(node);
                  }

                  candidates.forEach(function (textNode) {
                    var text = textNode.nodeValue;
                    var fragment = document.createDocumentFragment();
                    var re = new RegExp(URL_PATTERN_SOURCE, 'g');
                    var cursor = 0;
                    var match;
                    while ((match = re.exec(text)) !== null) {
                      var matched = match[0];
                      var trail = matched.match(trailingPunct);
                      var url = trail ? matched.slice(0, -trail[0].length) : matched;

                      if (match.index > cursor) {
                        fragment.appendChild(document.createTextNode(text.slice(cursor, match.index)));
                      }
                      var a = document.createElement('a');
                      a.href = url;
                      a.textContent = url;
                      fragment.appendChild(a);
                      cursor = match.index + url.length;
                    }
                    if (cursor < text.length) {
                      fragment.appendChild(document.createTextNode(text.slice(cursor)));
                    }
                    if (textNode.parentNode) {
                      textNode.parentNode.replaceChild(fragment, textNode);
                    }
                  });
                } catch (e) {
                  // best-effort auto-link pass
                }
              }

              function parseRgb(value) {
                if (!value) return null;
                var match = value.match(/rgba?\\(([^)]+)\\)/i);
                if (!match) return null;
                var parts = match[1].split(',').map(function (p) { return parseFloat(p.trim()); });
                if (parts.length < 3 || parts.some(function (n) { return Number.isNaN(n); })) return null;
                return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
              }

              function srgbToLinear(c) {
                var x = c / 255;
                return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
              }

              function luminance(rgb) {
                return 0.2126 * srgbToLinear(rgb[0]) + 0.7152 * srgbToLinear(rgb[1]) + 0.0722 * srgbToLinear(rgb[2]);
              }

              function contrastRatio(fg, bg) {
                var l1 = luminance(fg);
                var l2 = luminance(bg);
                var lighter = Math.max(l1, l2);
                var darker = Math.min(l1, l2);
                return (lighter + 0.05) / (darker + 0.05);
              }

              function getEffectiveBackground(element) {
                var current = element;
                while (current && current !== document.documentElement) {
                  var bg = parseRgb(window.getComputedStyle(current).backgroundColor);
                  if (bg && bg[3] > 0.01) return bg;
                  current = current.parentElement;
                }
                return isDarkMode ? [17, 20, 24, 1] : [255, 255, 255, 1];
              }

              function shouldSkipElement(element) {
                if (!element || !element.tagName) return true;
                var tag = element.tagName.toUpperCase();
                return ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IMG', 'SVG', 'PATH', 'CANVAS', 'VIDEO', 'IFRAME'].indexOf(tag) !== -1;
              }

              function normalizeContrast() {
                try {
                  document.querySelectorAll('a[href]').forEach(function (anchor) {
                    anchor.setAttribute('target', '_blank');
                    anchor.setAttribute('rel', 'noopener noreferrer');
                  });

                  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
                  var seen = new Set();
                  while (walker.nextNode()) {
                    var node = walker.currentNode;
                    if (!node || !node.nodeValue || !node.nodeValue.trim()) continue;
                    var element = node.parentElement;
                    if (!element || seen.has(element) || shouldSkipElement(element)) continue;
                    seen.add(element);

                    var fg = parseRgb(window.getComputedStyle(element).color);
                    if (!fg) continue;
                    var bg = getEffectiveBackground(element);
                    var ratio = contrastRatio(fg, bg);
                    if (ratio >= minContrast) continue;

                    var bgLum = luminance(bg);
                    if (element.tagName.toUpperCase() === 'A') {
                      element.style.setProperty('color', linkColor, 'important');
                      element.style.setProperty('text-decoration', 'underline', 'important');
                    } else {
                      element.style.setProperty('color', bgLum > 0.45 ? lightText : darkText, 'important');
                    }
                  }
                } catch (e) {
                  // best-effort readability pass
                }
              }

              function runEnhancements() {
                autoLinkUrls();
                normalizeContrast();
              }

              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', runEnhancements, { once: true });
              } else {
                runEnhancements();
              }
              setTimeout(runEnhancements, 80);
            })();
          </script>
          ${heightScript}
        </body>
      </html>
    `;
}
