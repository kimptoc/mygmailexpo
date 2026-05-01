# Archive Button on Email Detail Screen

**Date:** 2026-05-01
**Status:** Draft
**Scope:** Single-file UI change in `app/email/[id].tsx`

## Problem

When viewing a single email opened from a user label, the email-detail header shows a **Remove label** button (`tag.slash`) alongside the **Move** button. When viewing an email opened from INBOX, the Remove-label button is hidden, so the only one-tap option is Move. There is no quick way to archive a single email from the detail screen.

This mirrors the gap that was just closed in selection mode (`components/InboxScreen.tsx`) by adding an Archive action when the source folder is INBOX. The detail screen needs the same treatment so the two surfaces stay consistent.

## Goal

In the email-detail header, when the email was opened from INBOX, render an **Archive** button. When opened from a user label, keep the existing **Remove label** button. Move button is unchanged on every view.

## Non-goals

- No changes to label chips, sender row, body rendering, or the WebView.
- No new API surface in `services/gmailApi.ts` — archive *is* `removeLabelIds: ['INBOX']` and the existing `removeLabelFromEmails` already handles it.
- No changes to selection-mode in `InboxScreen.tsx` (already done in the prior spec).
- No changes to inbox/label list rendering.

## Design

### Reuse the existing utility

`utils/folder-actions.ts` already exports `getSelectionAction(folderId)` returning `'archive' | 'remove-label' | 'none'` and is unit-tested. The detail screen consumes it directly — no new utility is needed.

### Visibility

Replace the current `useMemo`-derived `showRemoveLabel` (`app/email/[id].tsx:173-179`) with:

```ts
const selectionAction = useMemo(
  () => getSelectionAction(folderId ?? 'INBOX'),
  [folderId]
);
```

Same memoization profile, same dependency on `folderId`. The triple result (`'archive' | 'remove-label' | 'none'`) replaces the boolean.

### Handler

`handleRemoveLabel` (`app/email/[id].tsx:122-144`) is renamed to `handleArchiveOrRemove` to reflect its new dual purpose.

Body changes:

1. Drop the `if (!folderId) return;` early-return guard.
2. Replace `const removedLabelId = folderId;` with `const sourceFolderId = folderId ?? 'INBOX';` — the value driving both the API call and the toast wording.
3. Branch the toast text: `sourceFolderId === 'INBOX'` → `"1 email archived"`, otherwise the existing `"1 email removed"`.
4. The `removeLabelFromEmails([id], sourceFolderId)` call uses the new `sourceFolderId`. The undo callback (`addLabelsToEmails([id], [sourceFolderId])`) is unchanged in behaviour — adding INBOX back is exactly unarchive.
5. `router.back()` and error handling stay as-is.

### Button render

In the header action block (`app/email/[id].tsx:422-431`), replace the single conditional Remove-label `<TouchableOpacity>` with two mutually-exclusive blocks:

- `selectionAction === 'archive'` → render `<TouchableOpacity onPress={handleArchiveOrRemove}>` with `IconSymbol name="archivebox"` and `accessibilityLabel="Archive"`.
- `selectionAction === 'remove-label'` → render the same component with `IconSymbol name="tag.slash"` and `accessibilityLabel="Remove label"`.
- `selectionAction === 'none'` → render nothing (today's behavior for system-label-sourced emails is unchanged).

The Move button is always rendered after these, unchanged.

### Error handling

`handleArchiveOrRemove` retains the existing try/catch. Failure paths show the same error toast and reset `actionLoading` — no behavior change for failures.

## Consistency with `InboxScreen.tsx`

The selection-mode wire-up in `components/InboxScreen.tsx` already uses `getSelectionAction` and the same `archivebox` / `tag.slash` icon pair with the same accessibility labels. After this change, the two surfaces present consistent affordances.

## Out of scope / future considerations

- A confirmation prompt before archiving. Not needed: undo is provided via the toast, mirroring the existing remove-label flow.
- Archive from list-item swipe gestures or quick actions. Not in scope.
- Bulk-archive surfaces beyond the existing selection mode. Not in scope.

## Testing

No new unit tests required — `getSelectionAction` is already covered by `utils/folder-actions.test.ts`. The detail screen has no existing component tests to extend.

Manual verification:

1. Open an email from INBOX. Confirm the header shows `[Archive][Move]` (in that order). Tap archive. Confirm: navigation returns to the inbox list, the email is gone from the list, toast reads `"1 email archived"` with Undo.
2. Tap Undo. Confirm: the email returns to the inbox list.
3. Open an email from a user label. Confirm the header still shows `[Remove label][Move]` and the toast on remove still reads `"1 email removed"`.
4. Open an email from a system folder (STARRED, SENT, TRASH, etc.). Confirm only the Move button renders.
5. With network disabled, attempt archive. Confirm the error toast appears and `actionLoading` clears (header buttons re-appear).

## Files touched

- `app/email/[id].tsx` — visibility derivation, handler rename + tweak, button render.

No other files modified.
