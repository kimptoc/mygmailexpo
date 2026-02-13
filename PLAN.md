# MyGmail Expo - Feature Parity Plan

This document outlines the work needed to achieve feature parity between the Expo/React Native app and the native Android app.

**Last Updated:** February 13, 2026 (batch action progress bar + tests)

---

## Implementation Status

### Phase 1: Email List Enhancements - COMPLETE

| Feature | Status | Notes |
|---------|--------|-------|
| 1.1 Sender Avatar | ✅ Done | Color-coded based on sender name |
| 1.2 Unread Indicator | ✅ Done | Bold text + dot indicator |
| 1.3 Smart Date Formatting | ✅ Done | Today shows time, this year shows "Mon d", older shows full date |
| 1.4 Label Chips | ✅ Done | Max 3 with "+N" overflow, excludes UNREAD/INBOX/current folder |
| 1.5 Pagination | ✅ Done | Load More button + infinite scroll |

**Files:** `components/EmailItem.tsx`, `components/LabelChip.tsx`, `types/gmail.ts`

---

### Phase 2: Email Detail Enhancements - COMPLETE

| Feature | Status | Notes |
|---------|--------|-------|
| 2.1 HTML Email Rendering | ✅ Done | WebView (native) / iframe (web) |
| 2.2 Full Email Metadata | ✅ Done | To, CC fields displayed |
| 2.3 Label Display | ✅ Done | Horizontal scroll of label chips |

**Files:** `app/email/[id].tsx`, `components/NativeWebView.tsx`

---

### Phase 3: Email Selection & Actions - COMPLETE

| Feature | Status | Notes |
|---------|--------|-------|
| 3.1 Multi-Select Mode | ✅ Done | Long press or avatar click to select |
| 3.2 Remove Label | ✅ Done | Works in list and detail view |
| 3.3 Move to Folder | ✅ Done | Folder selection modal |
| 3.4 Mark as Read | ✅ Done | Automatic when viewing email |
| 3.5 Archive | ✅ Removed | Simplified UI per plan |
| 3.6 Delete/Trash | ✅ Removed | Simplified UI per plan |
| 3.7 Mark as Unread | ✅ Removed | Simplified UI per plan |
| 3.8 Select All | ✅ Done | Added in selection mode header |

**Files:** `components/InboxScreen.tsx`, `hooks/useEmailSelection.ts`, `services/gmailApi.ts`

---

### Phase 4: Polish & UX - MOSTLY COMPLETE

| Feature | Status | Notes |
|---------|--------|-------|
| 4.1 Pull to Refresh | ✅ Done | RefreshControl implemented |
| 4.2 Skeleton Loaders | ✅ Done | EmailItemSkeleton component |
| 4.3 Error Handling | ✅ Improved | Alert.alert() for user-facing errors |
| 4.4 Dark Mode | ✅ Done | Theme colors used, including separators and errors |
| 4.5 Dark Mode Contrast | ✅ Improved | Fixed white-tint button text/background contrast in error/selection states |
| 4.6 Batch Action Progress | ✅ Done | Animated progress bar + `Processing X/Y` during remove/move actions |

**Files:** `components/EmailItemSkeleton.tsx`

---

## Authentication Resilience (Feb 2026)

- Added token refresh on app resume (native) and retry-on-401 for all Gmail API calls.
- Clear “Session expired. Please sign in again.” messaging when refresh fails.
- Error messages are now selectable and include quick actions (Retry + Sign in again) across inbox, folders, folder detail, and email detail screens.
- Tests added for token refresh helper (web) and auth retry logic.
- Gmail label actions now use low-concurrency per-email updates with exponential backoff to avoid Gmail's "too many concurrent requests" errors while retaining per-email failure details. Tests updated.
- Batch remove/move actions now show per-item progress in selection mode with a smooth animated progress bar; unit tests added for progress callback success/failure counting.

---

## Recent Commits Summary

| Commit | Description | Plan Item |
|--------|-------------|-----------|
| `53019f0` | Avatar click to select (web UX) | Enhancement |
| `557c6fa` | Gmail API scope to gmail.modify | Bug fix |
| `417d9f8` | Label removal reliability | Bug fix |
| `8f75aad` | Remove Archive/Delete buttons | ✅ Plan item 1 |
| `a76b8dc` | Fix Rules of Hooks violations | Bug fix |
| `ddb6fa1` | Session validation on app load | Bug fix |
| `1bf7d11` | Select All + WebView height | ✅ Plan items 2 & 3 |

---

## What's Left To Do

### Folder Picker Rework (Complete)

1. ✅ Recent folders capped at 10 in list rendering (UI list builder; data layer unchanged).
2. ✅ Single scrollable list with Recent then All, responsive 2-column layout.
3. ✅ Headers align to left column with spacer insertion when in 2-column mode.
4. ✅ Shared list builder to reduce duplication: `utils/folder-list.ts`
5. ✅ Tests added for list construction: `utils/folder-list.test.ts`

### Action Buttons Consistency - COMPLETE

- Removed the unused "Mark as Unread" action from email detail.
- Reordered actions consistently (Remove Label, Move to Folder) on list and detail screens.
- Added a prominent "Select All" pill below the selection header; kept selection header actions focused on remove/move.
- Scaled action icon sizes for tablet/web (`>600px` → 28px) with 44px touch targets.
- Files: `components/InboxScreen.tsx`, `app/email/[id].tsx`

### Send Email Feature (Planned)

Add ability to send simple plain text emails with To, Subject, and Body fields. From address auto-filled from authenticated user's Gmail.

**Files to Create:**
1. `/utils/emailEncoder.ts` - RFC 2822 message formatting and base64url encoding
2. `/components/ComposeEmailModal.tsx` - Modal with form fields (follows `FolderSelectionModal.tsx` patterns)

**Files to Modify:**
3. `/services/gmailApi.ts` - Add `sendEmail` method (POST to `/messages/send` with base64url raw message)
4. `/components/InboxScreen.tsx` - Add FAB button and compose modal integration

**Implementation Steps:**
1. Create `/utils/emailEncoder.ts`:
   - `buildRfc2822Message({ to, cc?, bcc?, from, subject, body })` - RFC 2822 with CRLF line endings, `MIME-Version: 1.0`, `Content-Type: text/plain; charset=UTF-8`
   - Support multiple recipients (comma-separated), trim inputs, allow optional cc/bcc
   - `base64UrlEncode(str)` - UTF-8 bytes → base64url without padding

2. Add `sendEmail` to `/services/gmailApi.ts`:
   - Add method to `GmailApiService` class following existing patterns
   - Add to `useGmailApi` hook return with `withAuthRetry` wrapper
   - Endpoint: POST `/messages/send` with `{ raw: encodedMessage }`
   - Apply exponential backoff on 429/503 (reuse fetchWithBackoff)

3. Create `/components/ComposeEmailModal.tsx`:
   - Props: `visible`, `onClose`, `fromEmail`
   - Form: From (read-only), To (required, email format), Subject (required), Body (multiline)
   - Disable Send while submitting; show spinner; keep values on error, clear on success
   - Toast success/error messaging; guard against missing auth

4. Update `/components/InboxScreen.tsx`:
   - Add `showComposeModal` state
   - Add FAB (56x56, bottom-right, `paperplane.fill` icon, hidden in selection mode)
   - Render `<ComposeEmailModal fromEmail={userEmail} />`

**Verification:**
- [ ] Existing tests pass (`npm test`)
- [ ] FAB visible on inbox, hidden during selection
- [ ] Modal opens with From pre-filled
- [ ] Validation errors show toast
- [ ] Email sends and arrives at recipient
- [ ] Encoder tests cover ASCII + non-ASCII, multiple recipients, empty optional fields
- [ ] sendEmail mock test validates payload shape/base64url and backoff

### Cleanup (Low Priority)

0. **user defined fixes/todos**
   - **Remove Debug Start Gate page**
     - ✅ **Fixed:** Removed the `appStarted` state and the conditional rendering of the "Debug Start Gate" screen in `app/_layout.tsx`, allowing the app to initialize directly.
   - **Unused Imports in app/_layout.tsx**
     - ✅ **Fixed:** Removed genuinely unused `Button`, `SafeAreaView`, and `useState` imports. Re-added `ThemeProvider`, `DarkTheme`, and `DefaultTheme` as they are actively used.   - ios gives error when trying to remove lablel, it was a lot of emails
   - **deployed web not loading, fails to find entry.js**
     - ✅ **Fixed:** Added path post-processing to `index.html` in `scripts/deploy-web.js` to correctly reference `/_expo/` assets within the `/mygmailexpo/` subdirectory.

     - ✅ **Fixed:** Created `app.config.js` to conditionally set `experiments.baseUrl` only for web builds (`WEB_BUILD=1`), resolving the "Unmatched Route" error on GitHub Pages while keeping native builds working. Updated `package.json` scripts.


   - ✅ local web version does not start, issues with google auth
     - **Fixed:** Changed redirect URI in `contexts/AuthContext.web.tsx` to use `origin` directly instead of `AuthSession.makeRedirectUri()`
   - ✅ remote/gh deployed web version does not show action icons
     - **Root Cause:** `.gitignore` contains `node_modules/` which causes `dist/assets/node_modules/` (containing MaterialIcons font) to be excluded from gh-pages deployment
     - **Fix:** Add `!dist/assets/node_modules/` negation pattern to `.gitignore`
   - deployed web version secret issue
   - **Move action not removing old label**
     - ✅ **Fixed:** Updated `handleMoveToFolder` in `app/email/[id].tsx` to use `folderId` from route params.
   - **Dark mode: white backgrounds with unreadable text**
     - ✅ **Fixed:** Added theme-aware `separator`, `error`, and `errorBackground` colors to `constants/theme.ts`. Updated components (`FolderSelectionModal`, `FolderScreen`, `LabelChip`, `EmailItem`, `EmailDetailScreen`, `InfoScreen`) to use these colors.
   - **Google auth error not copyable on mobile**
     - ✅ **Fixed:** Added `selectable={true}` to the error `Text` component in `components/LoginScreen.tsx`.

   - **Production Android build: DEVELOPER_ERROR on Google sign-in**
     - **Problem:** Production builds use a different signing certificate (SHA-1) than debug builds
     - **Root Cause:** Google OAuth requires ALL certificate fingerprints registered in Google Cloud Console
     - **Fix steps:**
       1. Get production SHA-1: `eas credentials --platform android`
       2. Go to Google Cloud Console → APIs & Services → Credentials
       3. Find Android OAuth 2.0 Client ID
       4. Add the production SHA-1 fingerprint
       5. Save and rebuild the app
   - **Batch label removal shows error but actually works (20+ items)**
     - ✅ **Fixed:** 
       1. Updated `removeLabelFromEmails` and `moveEmailsToLabel` in `services/gmailApi.ts` to use `Promise.allSettled`, returning detailed success/failure results.
       2. Created `components/BatchErrorModal.tsx` to display a summary of batch operations.
       3. Updated `components/InboxScreen.tsx` to use the new modal and handle partial failures gracefully, including a "Retry Failed" option.


1. **Remove dead code: `trashEmail` and `archiveEmail` API methods**
   - ✅ **Done:** These methods have been removed from `services/gmailApi.ts`.

### Nice to Have (Optional)

2. **Web iframe height is still hardcoded**
   - Native WebView uses dynamic height via `injectedJavaScript`
   - Web iframe still uses `height: '600px'`
   - **File:** `app/email/[id].tsx:276`

3. **Add "Yesterday" to smart date formatting**
   - ✅ **Done:** Implemented in `types/gmail.ts`


4. **Toast notifications for actions**
   - Currently shows Alert on error only
   - Could add success toasts: "Email moved to X"

---

## Concerns With Current Implementation

### Minor Issues

1. **Dead code in gmailApi.ts**
   - `trashEmail()` and `archiveEmail()` methods are exported but never called
   - Should be removed or will cause confusion

2. **Inconsistent error handling**
   - Some errors show `Alert.alert()`, others only `console.error()`
   - Move to folder in InboxScreen only logs errors (line 169)

3. **Web iframe fixed height**
   - Long emails may be cut off or require scrolling within iframe
   - Native uses dynamic height, web doesn't

### Non-Issues (Working as Expected)

- ✅ Session persistence now validates on load
- ✅ Gmail API scope updated to allow modifications
- ✅ Label removal works reliably with auto-refresh
- ✅ Selection mode works via long press AND avatar click (web-friendly)
- ✅ WebView height is now dynamic on native platforms

---

## API Methods Status

| Method | Status | Notes |
|--------|--------|-------|
| `getLabels` | ✅ Used | |
| `getEmailsByLabel` | ✅ Used | With pagination |
| `getEmailDetail` | ✅ Used | Full format with HTML |
| `markAsRead` | ✅ Used | Auto on view |
| `removeLabelFromEmails` | ✅ Used | Batch operation |
| `moveEmailsToLabel` | ✅ Used | Add + remove labels |
| `trashEmail` | ⚠️ Dead Code | Remove - no longer used |
| `archiveEmail` | ⚠️ Dead Code | Remove - no longer used |

---

## Testing Checklist

- [x] Sign in works on all platforms (Android, iOS, Web)
- [x] Email list loads and displays correctly
- [x] Pagination works (Load More)
- [x] Pull to refresh works
- [x] Long press enters selection mode
- [x] Avatar click enters selection mode (web-friendly)
- [x] Select All works in selection mode
- [x] Move to folder works (selection + detail view)
- [x] Remove label works (selection + detail view)
- [x] Email detail loads HTML emails
- [x] Email detail shows To/CC
- [x] Mark as read works automatically
- [x] WebView height is dynamic (native)
- [ ] Dark mode looks correct (needs verification)
- [x] Skeleton loaders display during load
- [x] Session persists across app restarts

---

## Unit Testing Plan

This project currently has no unit tests. Adding them will improve stability and prevent regressions.

### 1. Setup

1.  **Install dev dependencies:**
    ```bash
    npm install --save-dev jest jest-expo ts-jest @types/jest @testing-library/react-native @testing-library/jest-native
    ```
2.  **Configure Jest:** Create a `jest.config.js` file in the root directory:
    ```javascript
    module.exports = {
      preset: 'jest-expo',
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
      ],
      setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
    };
    ```
3.  **Add test script to `package.json`:**
    ```json
    "scripts": {
      "test": "jest"
    }
    ```

### 2. Missing Unit Tests (Prioritized)

#### Business Logic & Data Transformation (High Priority)

-   **File:** `types/gmail.ts`
    -   [ ] **`getSmartFormattedDate()`**: Test various timestamps (today, yesterday, this year, last year) to ensure they produce the correct "smart" date strings.
    -   [ ] **`getFromName()`**: Test different `From` header formats (e.g., `"Name <email>"`, `"email"`, `"Name"`) to verify correct name extraction.

-   **File:** `hooks/useEmailSelection.ts`
    -   [x] **`toggleSelection`**: Test that it correctly adds/removes IDs and updates `isSelectionMode`.
    -   [x] **`clearSelection`**: Test that it resets the state.
    -   [x] **`selectAll`**: Test that it correctly selects all provided IDs.

-   **File:** `utils/folder-list.ts`
    -   [x] **`buildFolderListItems`**: Tests for recent cap, spacer insertion, and search filtering.

#### API Service Logic (Medium Priority)

-   **File:** `services/gmailApi.ts` (Requires mocking `fetch`)
    -   [ ] **`removeLabelFromEmails` / `moveEmailsToLabel`**: Mock `fetch` and test the `Promise.allSettled` logic. Verify that it correctly separates `succeeded` and `failed` results.
    -   [ ] **`getEmailsByLabel`**: Mock `fetch` to test that the function correctly processes and maps an API response to the `Email` type.

#### Component Rendering (Medium Priority)

-   **File:** `components/LoginScreen.tsx`
    -   [ ] Verify the "Sign in with Google" button is disabled when `authState` is `'loading'`.
    -   [ ] Verify the error message is displayed when `authState` is `'error'`.

-   **File:** `components/EmailItem.tsx`
    -   [ ] Check that the "unread" styles (bold text, indicator) are applied when `email.isUnread` is `true`.
    -   [ ] Verify that `LabelChip` components are rendered correctly based on `email.labelIds`.

-   **File:** `components/BatchErrorModal.tsx`
    -   [ ] Test that the modal correctly displays the number of `succeededCount` and lists all `failedItems`.


---

## Conclusion

**Feature parity is essentially complete.** The main planned work items have been implemented:

1. ✅ Archive/Delete/Mark Unread buttons removed
2. ✅ Select All added
3. ✅ WebView dynamic height (native)

**Remaining work is cleanup and polish:**
- Remove dead code (`trashEmail`, `archiveEmail`)
- Fix web iframe height (optional)
- Add "Yesterday" date format (optional)

**Build Info**
- Build date is generated via `npm run build:info` and wired into `build:web`, `android`, `ios`, and `eas-build-post-install` hooks.
- A tracked `constants/build-info.json` stub exists so dev runs (`expo start`) always resolve the module.
