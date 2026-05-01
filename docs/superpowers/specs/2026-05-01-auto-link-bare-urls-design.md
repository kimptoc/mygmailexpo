# Auto-Link Bare URLs in Email Bodies

**Date:** 2026-05-01
**Status:** Draft
**Scope:** Single-file UI change in `app/email/[id].tsx` plus one shared utility.

## Problem

Emails sometimes ship URLs as bare text rather than wrapping them in `<a>` tags. The script we inject into the email-body WebView/iframe in `app/email/[id].tsx` only adds `target="_blank"`/`rel="noopener noreferrer"` to *existing* anchors — bare URLs in text nodes (inside `<p>`, `<div>`, `<code>`, etc.) stay unclickable.

Concrete example reported by the user — an unsubscribe footer:

```html
<p><code>https://ml.athenachat.ai/unsubscribe/...</code></p>
<p><a href="https://1qnsdy45.r.eu-west-2.awstrack.me/L0/..." ></a></p>
```

The visible URL sits inside `<code>` (plain text). The adjacent real `<a>` is empty, so there is nothing to tap on. Most desktop mail clients (Gmail, Apple Mail, Outlook) auto-link URL-shaped text in HTML bodies and inline taps in plain-text bodies; we don't.

A second, related case: when an email has no `htmlBody`, the renderer falls back to `<ThemedText>{plainTextBody || snippet}</ThemedText>`. URLs in there are pure inert text. Same root cause (no auto-linking), separate code path.

## Goal

Make URL-shaped text tappable in both render paths in `app/email/[id].tsx`:

1. **HTML path** (`<NativeWebView>` on mobile, `<iframe srcDoc>` on web): the injected script wraps bare `https?://…` matches in text nodes with new `<a href>` elements before the existing `normalizeContrast()` pass runs. The new anchors then get the existing `target="_blank"` / `rel="noopener noreferrer"` / colour treatment for free.
2. **Plain-text fallback path**: render the body via a small `LinkifiedText`-style component that splits the text on URL matches and renders URL segments as inline `<ThemedText onPress={() => Linking.openURL(url)}>` spans, styled with the link colour and underline.

## Non-goals

- Don't auto-link bare hostnames (`example.com` without scheme) or `mailto:`/`tel:` URIs. Modern mail clients are conservative — schemed `http(s)` only — to avoid false-positive auto-links.
- Don't change the existing handling of *real* `<a href>` elements; their target/rel/colour treatment is already correct.
- Don't change `services/gmailApi.ts`, label rendering, the email list, or any selection-mode behaviour.
- No special handling for very long URLs (line-wrapping is a CSS concern, not an auto-link concern).

## Design

### Shared URL matcher

New utility: `utils/auto-link-urls.ts` exporting:

```ts
export type LinkSegment = { type: 'text' | 'url'; value: string };
export const URL_PATTERN_SOURCE = "https?:\\/\\/[^\\s<>\"')\\]]+";
export function splitTextOnUrls(text: string): LinkSegment[];
```

`splitTextOnUrls` returns the input split into alternating text and URL segments. Trailing punctuation (`.,;:!?`) on a matched URL is trimmed from the URL segment and pushed back into the following text segment (so `"see https://x.com."` becomes `["see ", url("https://x.com"), "."]`). The function is pure and unit-tested.

`URL_PATTERN_SOURCE` is the regex source string. Both consumers (the JS-side splitter and the WebView script) construct their own `RegExp` from this constant so there is one place to change the pattern. The injected script reads it via template substitution: `var URL_PATTERN = new RegExp(${JSON.stringify(URL_PATTERN_SOURCE)}, 'g');`.

### HTML path

In the `htmlContent` template in `app/email/[id].tsx`, add a new IIFE function `autoLinkUrls()` that runs immediately before `normalizeContrast()`:

- Use a `TreeWalker` over `SHOW_TEXT` rooted at `document.body`.
- For each text node, skip if any ancestor is `<a>`, `<script>`, `<style>`, `<noscript>`, or `<textarea>`.
- For nodes containing a URL match, build a `DocumentFragment` of alternating `Text` nodes and `<a href>` elements (mirroring the `splitTextOnUrls` algorithm), trim trailing punctuation, and replace the original text node with the fragment.

The existing `normalizeContrast()` already iterates `a[href]` to set `target`/`rel` and applies link colouring, so the new anchors slot in cleanly. The IIFE order becomes: `autoLinkUrls()` → `normalizeContrast()`.

No change to the WebView's `onShouldStartLoadWithRequest` handler — taps continue to flow to `Linking.openURL` on native; web `target="_blank"` continues to open new tabs.

### Plain-text path

Replace this in `app/email/[id].tsx`:

```tsx
<ThemedText style={styles.bodyText}>{email.plainTextBody || email.snippet}</ThemedText>
```

with a render that calls `splitTextOnUrls()` on the body string and emits inline-tappable URL segments:

```tsx
<ThemedText style={styles.bodyText}>
  {splitTextOnUrls(email.plainTextBody || email.snippet).map((seg, i) =>
    seg.type === 'url' ? (
      <ThemedText
        key={i}
        style={{ color: tintColor, textDecorationLine: 'underline' }}
        onPress={() => Linking.openURL(seg.value)}
        accessibilityRole="link"
      >
        {seg.value}
      </ThemedText>
    ) : (
      <ThemedText key={i}>{seg.value}</ThemedText>
    )
  )}
</ThemedText>
```

`Linking.openURL` and `ThemedText` are already imported in the file. `tintColor` is already in scope from `useActionButtonColors`.

### Error handling

Both paths are best-effort. If `splitTextOnUrls` is given an empty or whitespace string, it returns a single empty/whitespace text segment — render is a no-op. If `Linking.openURL` rejects (e.g., malformed URL), we don't catch — same behaviour as the existing `<a>` flow on native, where `Linking.openURL` is called from `onShouldStartLoadWithRequest`.

## Out of scope / future considerations

- Auto-linking email addresses (`mailto:`) or phone numbers — separate change if needed.
- Auto-linking bare hostnames without a scheme.
- Detecting and preserving Markdown-style `[label](url)` patterns in plain-text emails (very rare in practice).

## Testing

Unit tests for `splitTextOnUrls` in `utils/auto-link-urls.test.ts` covering:

- Empty string → `[]` (no segments).
- Plain text with no URL → single text segment.
- Single URL alone → single URL segment.
- URL surrounded by text → text, url, text.
- Two URLs with text between → text, url, text, url, text.
- URL followed by trailing punctuation (`.`, `,`, `?`) → URL trimmed, punct in following text.
- URL with query string and fragment (`?a=1&b=2#section`) → entire URL in URL segment.
- URL inside parentheses `(https://x.com/y)` → text `(`, url, text `)`.
- URL inside angle brackets `<https://x.com>` → text `<`, url, text `>`.

Manual on-device verification:

- The user's reported unsubscribe email — the `<code>`-wrapped URL becomes tappable, opens system browser.
- An email with already-clickable `<a href>` links — links continue to work; no double-wrap (the `autoLinkUrls()` walker skips text nodes inside `<a>`).
- A plain-text-only email containing a URL — URL is tappable, opens system browser.
- An email with a URL in body text mid-sentence ending with `.` — URL is tappable, period stays as punctuation.

## Files touched

- Create: `utils/auto-link-urls.ts`, `utils/auto-link-urls.test.ts`.
- Modify: `app/email/[id].tsx` — import `splitTextOnUrls` (and `URL_PATTERN_SOURCE`) and `Linking` (already imported), inject `autoLinkUrls()` IIFE in `htmlContent`, replace the plain-text fallback render block.

No other files modified.
