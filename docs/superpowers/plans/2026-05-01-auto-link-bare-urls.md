# Auto-Link Bare URLs in Email Bodies — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make URL-shaped text tappable in both render paths in `app/email/[id].tsx` (the WebView/iframe HTML body and the plain-text fallback), so users can tap unsubscribe links and similar that the sender shipped as bare text rather than wrapping in `<a>`.

**Architecture:** A pure utility `splitTextOnUrls` in `utils/auto-link-urls.ts` returns `{ type: 'text' | 'url', value }` segments and is unit-tested. The plain-text fallback consumes it directly to render inline `Linking.openURL`-tappable spans. The WebView/iframe injected script gets a new `autoLinkUrls()` IIFE that walks text nodes, applies the same splitting logic via a regex constructed from a shared `URL_PATTERN_SOURCE` constant, and wraps URL matches in new `<a href>` elements before the existing `normalizeContrast()` pass runs.

**Tech Stack:** TypeScript, React Native, Expo, Jest + ts-jest (Node test env), `expo-router`, `react-native` `Linking`.

**Spec:** `docs/superpowers/specs/2026-05-01-auto-link-bare-urls-design.md`

---

## File structure

- **Create:** `utils/auto-link-urls.ts` — exports `URL_PATTERN_SOURCE` (regex source string), `LinkSegment` type, `splitTextOnUrls(text)`.
- **Create:** `utils/auto-link-urls.test.ts` — Jest unit tests for `splitTextOnUrls`.
- **Modify:** `app/email/[id].tsx` — import the new utility, replace the plain-text fallback render block, and inject the new `autoLinkUrls()` IIFE into the existing `htmlContent` template just before `normalizeContrast()`.

No other files touched.

---

## Task 1: Build the `splitTextOnUrls` utility

**Files:**
- Create: `utils/auto-link-urls.ts`
- Test: `utils/auto-link-urls.test.ts`

**Background:** A pure splitter for plain-text strings. Used directly by the plain-text fallback path; its regex source is also reused by the WebView injected script (Task 3) so both paths agree on what counts as a URL. Trailing punctuation (`.,;:!?`) is trimmed from a matched URL and pushed into the following text segment so a sentence like `"see https://x.com."` renders as `"see "` + a URL anchor for `https://x.com` + `"."`.

- [ ] **Step 1: Write the failing tests**

Create `utils/auto-link-urls.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- utils/auto-link-urls.test.ts`
Expected: FAIL with module-not-found error for `./auto-link-urls`.

- [ ] **Step 3: Write the implementation**

Create `utils/auto-link-urls.ts`:

```ts
export type LinkSegment = { type: 'text' | 'url'; value: string };

export const URL_PATTERN_SOURCE = "https?:\\/\\/[^\\s<>\"')\\]]+";

const TRAILING_PUNCT = /[.,;:!?]+$/;

export function splitTextOnUrls(text: string): LinkSegment[] {
  if (text.length === 0) return [];

  const re = new RegExp(URL_PATTERN_SOURCE, 'g');
  const segments: LinkSegment[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const matched = match[0];
    const trail = matched.match(TRAILING_PUNCT);
    const url = trail ? matched.slice(0, -trail[0].length) : matched;

    if (match.index > cursor) {
      segments.push({ type: 'text', value: text.slice(cursor, match.index) });
    }
    segments.push({ type: 'url', value: url });
    cursor = match.index + url.length;
  }

  if (cursor < text.length) {
    segments.push({ type: 'text', value: text.slice(cursor) });
  }

  return segments;
}
```

Notes:
- `cursor` advances only past the URL (not the trailing punctuation), so the punctuation reappears in the next text segment.
- `re.lastIndex` is past the trailing punctuation, which is fine — the gap between `cursor` and the next `match.index` covers it.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- utils/auto-link-urls.test.ts`
Expected: PASS — all `it` blocks green.

- [ ] **Step 5: Commit**

```bash
git add utils/auto-link-urls.ts utils/auto-link-urls.test.ts
git commit -m "Add splitTextOnUrls utility for auto-linking bare URLs"
```

---

## Task 2: Auto-link URLs in the plain-text fallback

**Files:**
- Modify: `app/email/[id].tsx` (import; replace the `<ThemedText>{...}</ThemedText>` plain-text fallback render block)

**Background:** When `email.htmlBody` is missing, the email body renders via a single `<ThemedText>{email.plainTextBody || email.snippet}</ThemedText>`. URLs in that string are inert text. After this task, URLs render as inline tappable spans that call `Linking.openURL`.

`Linking` is already imported in this file (`import { ... Linking, ... } from 'react-native';`). `tintColor` is already in scope (from `useActionButtonColors`). `ThemedText` is already imported.

- [ ] **Step 1: Add the import**

In `app/email/[id].tsx`, near the other `@/` imports at the top of the file (place after the `useActionButtonColors` import, alongside other utility-style imports):

```ts
import { splitTextOnUrls } from '@/utils/auto-link-urls';
```

- [ ] **Step 2: Replace the plain-text fallback render block**

Locate this block (around line 539-541, inside the `email.htmlBody ? ... : ...` ternary inner-else):

```tsx
) : (
  <ThemedText style={styles.bodyText}>{email.plainTextBody || email.snippet}</ThemedText>
)}
```

Replace with:

```tsx
) : (
  <ThemedText style={styles.bodyText}>
    {splitTextOnUrls(email.plainTextBody || email.snippet || '').map((seg, i) =>
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
)}
```

The `|| ''` guard makes `splitTextOnUrls` always receive a string (its signature requires `string`, never `undefined`); the existing `email.plainTextBody || email.snippet` already covers the falsy-then-fallback path, but we make `''` explicit for type safety.

- [ ] **Step 3: Run the test suite**

Run: `npm test`
Expected: PASS — all 64+ tests (60 prior + ≥4 new from Task 1).

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: no new errors introduced (pre-existing warnings acceptable).

- [ ] **Step 6: Commit**

```bash
git add 'app/email/[id].tsx'
git commit -m "Auto-link URLs in plain-text email fallback"
```

---

## Task 3: Auto-link URLs in the HTML body (WebView and iframe)

**Files:**
- Modify: `app/email/[id].tsx` (add an `autoLinkUrls()` IIFE in the `htmlContent` template, run before `normalizeContrast()`; import `URL_PATTERN_SOURCE`)

**Background:** The same `htmlContent` string is loaded into the `<NativeWebView>` on mobile and the `<iframe srcDoc>` on web. The injected `<script>` already runs a `normalizeContrast()` pass that iterates `a[href]` to set `target="_blank"` / `rel="noopener noreferrer"` and to colour anchors. After this task, an earlier pass `autoLinkUrls()` walks text nodes, wraps bare `https?://…` matches in new `<a href>` elements, and lets the existing `normalizeContrast()` apply uniform treatment. The script is a string template, so it cannot `import` from JS — instead the regex source is template-substituted from the shared `URL_PATTERN_SOURCE` constant.

- [ ] **Step 1: Update the import to also pull in the regex constant**

Locate the import added in Task 2:

```ts
import { splitTextOnUrls } from '@/utils/auto-link-urls';
```

Replace with:

```ts
import { splitTextOnUrls, URL_PATTERN_SOURCE } from '@/utils/auto-link-urls';
```

- [ ] **Step 2: Add the `autoLinkUrls()` function in the injected script**

In `app/email/[id].tsx`, locate the `htmlContent` template literal (the `useMemo` that builds the email-body HTML). Inside the `<script>` block that defines `normalizeContrast`, add a new `autoLinkUrls` function declaration *before* `normalizeContrast`:

Find this section (the start of the existing IIFE, around lines 254-262):

```ts
<script>
  (function () {
    var isDarkMode = ${isDark ? 'true' : 'false'};
    var minContrast = 3;
    var linkColor = ${JSON.stringify(tintColor)};
    var darkText = ${JSON.stringify(fallbackDarkText)};
    var lightText = ${JSON.stringify(fallbackLightText)};

    function parseRgb(value) {
```

Insert the regex constant after the existing `lightText` declaration:

```ts
    var lightText = ${JSON.stringify(fallbackLightText)};
    var URL_PATTERN_SOURCE = ${JSON.stringify(URL_PATTERN_SOURCE)};
```

Then, before the `function normalizeContrast()` declaration (which exists today), add a new function:

```ts
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
      if (!/https?:\/\//.test(node.nodeValue)) continue;
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
```

The function mirrors `splitTextOnUrls` but builds a `DocumentFragment` of `Text` nodes and `<a>` elements. The skip-list (`A`, `SCRIPT`, `STYLE`, `NOSCRIPT`, `TEXTAREA`) prevents wrapping URLs inside existing anchors and inert content.

- [ ] **Step 3: Call `autoLinkUrls()` before `normalizeContrast()`**

The script currently runs `normalizeContrast()` at the bottom of the IIFE. Find this section (around lines 338-343):

```ts
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', normalizeContrast, { once: true });
} else {
  normalizeContrast();
}
setTimeout(normalizeContrast, 80);
```

Replace with a small helper that runs both passes in order:

```ts
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
```

This guarantees `autoLinkUrls()` runs before `normalizeContrast()` on every invocation (including the timer-driven retry).

- [ ] **Step 4: Run the test suite**

Run: `npm test`
Expected: PASS. Note: the changes in this task are inside a JS template-literal string and are not exercised by Jest tests directly — the regression check here is that nothing else broke.

- [ ] **Step 5: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: no new errors introduced.

- [ ] **Step 7: Verify the new code is present in the template**

Run: `git grep -n 'autoLinkUrls' 'app/email/[id].tsx'`
Expected: at least three lines — the function declaration, the `runEnhancements` call, and the `URL_PATTERN_SOURCE` reference.

- [ ] **Step 8: Commit**

```bash
git add 'app/email/[id].tsx'
git commit -m "Auto-link bare URLs in HTML email bodies"
```

---

## Task 4: Manual verification

**Files:** none — on-device testing.

**Background:** The HTML-path change runs only in the WebView/iframe and cannot be unit-tested without a DOM. Verify per the spec's manual checklist.

- [ ] **Step 1: Start the dev server**

Run: `npx expo start`

- [ ] **Step 2: Verify the original bug is fixed**

Open the user's reported unsubscribe email (the one with `<code>`-wrapped URL and an empty `<a>` afterwards). Confirm: the `<code>`-wrapped URL is now rendered with link styling (coloured / underlined), and tapping it opens the system browser to that URL.

- [ ] **Step 3: Verify already-clickable links still work**

Open an email that contains real `<a href>` links (any normal HTML email). Confirm: the existing links continue to be tappable, retain their existing colour, and aren't visually duplicated. (The walker skips text inside `<a>`, so no double-wrapping occurs.)

- [ ] **Step 4: Verify plain-text emails**

Find or send yourself an email with no HTML body (just plain text containing a URL). Open it. Confirm: the URL appears underlined in the link colour, and tapping it opens the system browser.

- [ ] **Step 5: Verify URLs with trailing punctuation**

Send yourself a plain-text email containing `Visit https://example.com.` (a sentence-ending period). Open it. Confirm: the URL is tappable up to and not including the period; the period stays as the last character of the visible body text.

- [ ] **Step 6: Verify URLs in HTML inside `<code>` and `<pre>`**

Reload the bug email or a similar HTML email with URLs inside `<code>` or `<pre>` tags. Confirm: those URLs are now clickable.

- [ ] **Step 7: Sign off**

If all the above pass, the feature is complete. If any step fails, file the failure as a follow-up and do not mark the task done.

---

## Self-review notes (already applied)

- **Spec coverage:** Shared utility (Task 1), HTML-path auto-link (Task 3 — `autoLinkUrls()` runs before `normalizeContrast()`), plain-text fallback (Task 2), error handling — both paths best-effort with a try/catch in the WebView path and natural no-op on empty input in the JS path, manual verification (Task 4). All spec sections mapped.
- **Placeholder scan:** No TBDs, every code step has a complete code block.
- **Type consistency:** `splitTextOnUrls` and `URL_PATTERN_SOURCE` are referenced consistently across Tasks 1-3 with the exact names defined in Task 1; the `LinkSegment` type uses `'text' | 'url'` literal union end-to-end; the `tintColor` reference in Task 2 matches the existing in-file binding from `useActionButtonColors`.
