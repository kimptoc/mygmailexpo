# MyGmail Expo - Feature Parity Plan

This document outlines the work needed to achieve feature parity between the Expo/React Native app and the native Android app.

**Last Updated:** After commit `53019f0` (feat: allow selecting emails by clicking sender avatar)

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
| 4.4 Dark Mode | ⚠️ Partial | Theme colors used, WebView may need work |

**Files:** `components/EmailItemSkeleton.tsx`

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

### Cleanup (Low Priority)

0. **user defined fixes/todos
   - ✅ local web version does not start, issues with google auth
     - **Fixed:** Changed redirect URI in `contexts/AuthContext.web.tsx` to use `origin` directly instead of `AuthSession.makeRedirectUri()`
   - ✅ remote/gh deployed web version does not show action icons
     - **Root Cause:** `.gitignore` contains `node_modules/` which causes `dist/assets/node_modules/` (containing MaterialIcons font) to be excluded from gh-pages deployment
     - **Fix:** Add `!dist/assets/node_modules/` negation pattern to `.gitignore`
   - deployed web version secret issue
   - how to get non-dev build
   - ios build still not working - issues immediately on startup.

1. **Remove dead code: `trashEmail` and `archiveEmail` API methods**
   - These methods are still in `services/gmailApi.ts` but no longer used
   - Can be removed to clean up codebase
   - **File:** `services/gmailApi.ts:299-330, 402-418`

### Nice to Have (Optional)

2. **Web iframe height is still hardcoded**
   - Native WebView uses dynamic height via `injectedJavaScript`
   - Web iframe still uses `height: '600px'`
   - **File:** `app/email/[id].tsx:276`

3. **Add "Yesterday" to smart date formatting**
   - Current: jumps from time (today) to "Mon d" (older)
   - Could add "Yesterday" for better UX
   - **File:** `types/gmail.ts` - `getSmartFormattedDate()`

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

## Conclusion

**Feature parity is essentially complete.** The main planned work items have been implemented:

1. ✅ Archive/Delete/Mark Unread buttons removed
2. ✅ Select All added
3. ✅ WebView dynamic height (native)

**Remaining work is cleanup and polish:**
- Remove dead code (`trashEmail`, `archiveEmail`)
- Fix web iframe height (optional)
- Add "Yesterday" date format (optional)
