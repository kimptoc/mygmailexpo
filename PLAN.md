# MyGmail Expo - Feature Parity Plan

This document outlines the work needed to achieve feature parity between the Expo/React Native app and the native Android app.

**Last Updated:** After commit `8751b91` (fix: add missing icon mappings)

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

### Phase 3: Email Selection & Actions - MOSTLY COMPLETE

| Feature | Status | Notes |
|---------|--------|-------|
| 3.1 Multi-Select Mode | ✅ Done | Long press to select, checkmarks |
| 3.2 Remove Label | ✅ Done | Works in list and detail view |
| 3.3 Move to Folder | ✅ Done | Folder selection modal |
| 3.4 Mark as Read | ✅ Done | Automatic when viewing email |
| 3.5 Archive | 🗑️ To Remove | Simplify UI - remove button |
| 3.6 Delete/Trash | 🗑️ To Remove | Simplify UI - remove button |
| 3.7 Mark as Unread | 🗑️ To Remove | Button has no handler - remove |
| 3.8 Select All | ❌ Missing | Android has this in selection mode |

**Files:** `components/InboxScreen.tsx`, `hooks/useEmailSelection.ts`, `services/gmailApi.ts`

---

### Phase 4: Polish & UX - PARTIAL

| Feature | Status | Notes |
|---------|--------|-------|
| 4.1 Pull to Refresh | ✅ Done | RefreshControl implemented |
| 4.2 Skeleton Loaders | ✅ Done | EmailItemSkeleton component |
| 4.3 Error Handling | ⚠️ Basic | Console errors only, no toasts |
| 4.4 Dark Mode | ⚠️ Partial | Theme colors used, WebView may need work |

**Files:** `components/EmailItemSkeleton.tsx`

---

## Concerns & Issues

### High Priority

1. **Remove Archive, Delete, Mark Unread buttons** *(NEW)*
   - Mark as Unread button has no handler - remove instead of implementing
   - Archive and Delete buttons add complexity - remove for simpler UX
   - **Files:** `app/email/[id].tsx`, `components/InboxScreen.tsx`

2. **WebView height hardcoded**
   - `containerStyle={{ height: 1000 }}` in email detail
   - Should dynamically resize based on content
   - **File:** `app/email/[id].tsx:330`

### Medium Priority

4. **No Select All in multi-select mode**
   - Android app has "Select All" button in selection header
   - Need to add to `InboxScreen.tsx` header actions

5. **Error handling is basic**
   - Actions fail silently (console.error only)
   - Should show toast/alert to user
   - Consider adding react-native-toast-message or similar

6. **Session persistence**
   - Recent commits mention session/recent folders issues
   - Need to verify login persists across app restarts

7. **BCC field not displayed**
   - Type includes `bcc` but not shown in email detail UI
   - Minor - BCC is rarely visible to recipients anyway

### Low Priority

8. **Navigation drawer vs modal**
   - Android uses drawer for folder navigation
   - Expo uses modal - acceptable but different UX

9. **Smart date missing "Yesterday"**
   - Android shows "Yesterday" for yesterday's emails
   - Current implementation jumps from time to "Mon d"

10. **No offline support**
    - Android app may cache emails
    - Expo app requires network for all operations

---

## Remaining Work

### Must Have (Before Feature Parity)

1. **Remove Archive, Delete, and Mark Unread buttons**
   - Remove from email detail header (`app/email/[id].tsx`)
   - Remove from selection mode header (`components/InboxScreen.tsx`)
   - Remove unused API methods if no longer needed (`services/gmailApi.ts`)
   - Simplifies UI and removes non-functional Mark Unread button

2. **Add Select All to selection mode**
   - Add button to selection header
   - Add `selectAll(emailIds: string[])` to `useEmailSelection` hook

3. **Fix WebView dynamic height**
   - Use `onContentSizeChange` or message passing
   - Or use `useAutoHeight` pattern

### Nice to Have

4. **Add toast notifications**
   - "Email moved to X", etc.

5. **Add "Yesterday" to smart date**
   - Update `getSmartFormattedDate()` in `types/gmail.ts`

---

## API Methods Status

| Method | Status | Notes |
|--------|--------|-------|
| `getLabels` | ✅ Done | |
| `getEmailsByLabel` | ✅ Done | With pagination |
| `getEmailDetail` | ✅ Done | Full format with HTML |
| `markAsRead` | ✅ Done | Remove UNREAD label |
| `markAsUnread` | ~~❌ Missing~~ | Not needed - removing button |
| `removeLabelFromEmails` | ✅ Done | Batch operation |
| `moveEmailsToLabel` | ✅ Done | Add + remove labels |
| `trashEmail` | 🗑️ May Remove | If delete button removed |
| `archiveEmail` | 🗑️ May Remove | If archive button removed |

---

## Files Changed Since Initial Plan

- `app/email/[id].tsx` - Email detail with actions
- `app/(tabs)/index.tsx` - Main tab updated
- `components/InboxScreen.tsx` - Multi-select, actions
- `components/EmailItem.tsx` - Avatar, labels, selection
- `components/EmailItemSkeleton.tsx` - NEW: Loading skeleton
- `components/LabelChip.tsx` - NEW: Label display
- `components/NativeWebView.tsx` - NEW: WebView wrapper
- `components/ui/icon-symbol.tsx` - Added new icons
- `hooks/useEmailSelection.ts` - NEW: Selection state
- `services/gmailApi.ts` - All new API methods
- `types/gmail.ts` - Full type definitions

---

## Testing Checklist

- [ ] Sign in works on all platforms (Android, iOS, Web)
- [ ] Email list loads and displays correctly
- [ ] Pagination works (Load More)
- [ ] Pull to refresh works
- [ ] Long press enters selection mode
- [ ] Multi-select actions work (archive, delete, move)
- [ ] Email detail loads HTML emails
- [ ] Email detail shows To/CC
- [ ] Mark as read works automatically
- [ ] Remove label works
- [ ] Move to folder works
- [ ] Dark mode looks correct
- [ ] Skeleton loaders display during load
