# SPA Deep-Link Routing Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Direct loads of dynamic-route URLs on the deployed GitHub Pages site (e.g. `/mygmailexpo/email/{id}`) currently 404 because GH Pages can't find a static file at that path. Add a `404.html` SPA fallback so GH Pages serves the SPA shell for any unmatched route, and tighten the in-app error message when the Gmail API returns 404 for an email ID that no longer exists.

**Architecture:** Two independent one-line-ish changes:
1. `scripts/deploy-web.js` — after the existing `index.html` path-fixing, write the same fixed HTML to `404.html`. GH Pages serves this whenever the requested path has no file, the SPA boots, and Expo Router resolves `window.location.pathname` to the right screen.
2. `app/email/[id].tsx` — in the `loadData` catch block, branch on `err?.status === 404` to show "Email not found — it may have been deleted" instead of the generic Gmail API error string.

**Tech Stack:** Node.js (deploy script), TypeScript / React Native, Gmail API.

---

## File structure

- **Modify:** `scripts/deploy-web.js` — add one `fs.writeFileSync` call after the existing index.html path-fix block.
- **Modify:** `app/email/[id].tsx` — refine the `setError(...)` call inside `loadData`'s catch to branch on the API error status.

No new files.

---

## Task 1: 404.html SPA fallback in deploy script

**Files:**
- Modify: `scripts/deploy-web.js` (add a single `writeFileSync` after the existing index.html path-fixing block)

**Background:** Today the deploy script:

1. Copies `dist/*` into a temp clone of `gh-pages`.
2. Reads `<tempDir>/index.html`, rewrites root-relative `_expo` paths to subdirectory-prefixed paths for the `kimptoc.github.io/mygmailexpo/` deployment, and writes it back.
3. Adds `.nojekyll`.
4. Commits and pushes.

We need a `404.html` whose content is identical to the *fixed* `index.html`. GH Pages serves `404.html` for any unmatched path; once the SPA loads, Expo Router reads `window.location.pathname` and renders the matching dynamic route.

- [ ] **Step 1: Locate the existing index.html path-fixing block**

In `scripts/deploy-web.js`, find this block (the only place that writes `index.html`):

```js
// Fix paths in index.html for GitHub Pages subdirectory deployment
const indexPath = path.join(tempDir, 'index.html');
if (fs.existsSync(indexPath)) {
  console.log('Fixing paths in index.html...');
  let html = fs.readFileSync(indexPath, 'utf8');
  // Replace root-absolute paths with subdirectory paths
  html = html.replace(/"\/_expo\//g, '"/mygmailexpo/_expo/');
  html = html.replace(/src="\/_expo\//g, 'src="/mygmailexpo/_expo/');
  html = html.replace(/href="\/_expo\//g, 'href="/mygmailexpo/_expo/');
  fs.writeFileSync(indexPath, html);
}
```

- [ ] **Step 2: Add the 404.html write inside the same `if (fs.existsSync(indexPath))` block**

Replace the block above with:

```js
// Fix paths in index.html for GitHub Pages subdirectory deployment
const indexPath = path.join(tempDir, 'index.html');
if (fs.existsSync(indexPath)) {
  console.log('Fixing paths in index.html...');
  let html = fs.readFileSync(indexPath, 'utf8');
  // Replace root-absolute paths with subdirectory paths
  html = html.replace(/"\/_expo\//g, '"/mygmailexpo/_expo/');
  html = html.replace(/src="\/_expo\//g, 'src="/mygmailexpo/_expo/');
  html = html.replace(/href="\/_expo\//g, 'href="/mygmailexpo/_expo/');
  fs.writeFileSync(indexPath, html);

  // SPA fallback: GitHub Pages serves 404.html for any unmatched path,
  // so writing the fixed index.html content to 404.html lets the SPA
  // boot and client-side router resolve dynamic routes (e.g. /email/{id}).
  const notFoundPath = path.join(tempDir, '404.html');
  fs.writeFileSync(notFoundPath, html);
  console.log('Wrote SPA fallback 404.html');
}
```

The two-line addition (plus the explanatory comment) writes the already-fixed `html` to `404.html` and logs it.

- [ ] **Step 3: Static check the modified script**

Run: `node --check scripts/deploy-web.js`
Expected: no output (syntax OK).

- [ ] **Step 4: Run the test suite to confirm nothing else broke**

Run: `npm test`
Expected: all 72 tests pass — this change touches no JS that's exercised by tests, but the regression check is cheap and catches any unrelated breakage.

- [ ] **Step 5: Commit**

```bash
git add scripts/deploy-web.js
git commit -m "Write SPA fallback 404.html during GitHub Pages deploy"
```

---

## Task 2: Friendlier error message for not-found email

**Files:**
- Modify: `app/email/[id].tsx` (refine the `setError(...)` call in `loadData`'s catch block)

**Background:** When `getEmailDetail(id)` throws because the Gmail API returned 404 (deleted or never existed), the error UI currently shows whatever string the API returned (e.g. `"Failed to fetch email: 404 Not Found"`). The thrown error is a `GmailApiError` (`services/gmailApiAuth.ts`) with a `status` field. Branch on it.

- [ ] **Step 1: Locate the existing catch block**

In `app/email/[id].tsx`, find `loadData` (around lines 95-126 after the recent merges). The relevant tail of the function looks like:

```ts
} catch (err: any) {
  console.error('Error loading email:', err);
  setError(err.message || 'Failed to load email');
} finally {
  setLoading(false);
}
```

- [ ] **Step 2: Branch the error message on `err.status === 404`**

Replace the catch body with:

```ts
} catch (err: any) {
  console.error('Error loading email:', err);
  if (err?.status === 404) {
    setError('Email not found — it may have been deleted');
  } else {
    setError(err.message || 'Failed to load email');
  }
} finally {
  setLoading(false);
}
```

The optional-chaining `err?.status` guards against non-Gmail errors (e.g. a `TypeError` that happens to be thrown). The retry button on the error screen continues to work for both branches — useful if the 404 was a transient API issue.

- [ ] **Step 3: Run the test suite**

Run: `npm test`
Expected: 72/72 pass.

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: no new errors (pre-existing warnings acceptable).

- [ ] **Step 6: Commit**

```bash
git add 'app/email/[id].tsx'
git commit -m "Show friendlier error when an email ID is no longer found"
```

---

## Task 3: Final review + manual deploy verification

**Files:** none — this is on-deploy testing.

**Background:** The 404.html change can only be fully verified after deploying to GitHub Pages and visiting an unmatched path. Walk through the spec's expected behaviour.

- [ ] **Step 1: Build the web bundle locally**

Run: `npm run build:web`
Expected: `dist/index.html` and the rest of `dist/` are produced. Note: `dist/index.html` won't yet have the path rewrites — those happen in `deploy-web.js` against the gh-pages temp clone, not against `dist/`.

- [ ] **Step 2: Deploy to GitHub Pages**

Run: `npm run deploy:web`

Watch the output. Look for the line:

```
Wrote SPA fallback 404.html
```

That confirms the new code path executed.

- [ ] **Step 3: Verify deep-link works**

Wait for GitHub Pages to update (usually under a minute), then visit:

```
https://kimptoc.github.io/mygmailexpo/email/19de0de58e0aed88?subject=Tired%20of%20applying%20to%20jobs%20and%20not%20hearing%20back%3F&folderId=Label_6
```

Expected: the SPA loads (rather than the bare GH Pages 404 page). Depending on whether the email exists:

- Email exists in Gmail (regardless of folder/labels) → email body renders.
- Email doesn't exist → in-app error UI renders with **"Email not found — it may have been deleted"** and a Retry button.

- [ ] **Step 4: Verify a non-email deep link**

Visit a clearly-bogus path under the same prefix:

```
https://kimptoc.github.io/mygmailexpo/some/random/path
```

Expected: the SPA loads and renders Expo Router's `+not-found` screen. (No bare GH Pages 404.)

- [ ] **Step 5: Verify the home page still loads**

Visit `https://kimptoc.github.io/mygmailexpo/` directly. Expected: site loads as before — no regression.

- [ ] **Step 6: Sign off**

If all the above pass, the fix is complete. If any step fails, file the failure as a follow-up and do not mark the task done.

---

## Self-review notes (already applied)

- **Coverage:** Both promised changes (deploy script `404.html`, in-app friendlier error) have implementer tasks. Manual verification covers both end-to-end.
- **Placeholder scan:** No TBDs, every step has a complete code block or exact command.
- **Type consistency:** `err?.status === 404` uses the `GmailApiError.status` field defined in `services/gmailApiAuth.ts` (`status: number`). The optional chain handles the case where `err` isn't a `GmailApiError`.
