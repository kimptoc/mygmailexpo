# Archive Button for INBOX Selection Mode

**Date:** 2026-05-01
**Status:** Draft
**Scope:** Single-file UI change in `components/InboxScreen.tsx`

## Problem

When viewing a user label and entering selection mode, two action buttons are shown:

1. Remove label (`tag.slash` icon) — removes the current label from selected emails.
2. Move (`folder` icon) — opens the folder picker to move selected emails to another label.

When viewing INBOX, only the Move button is shown. There is no equivalent "remove from inbox" action, even though Gmail's archive operation is exactly that — removing the `INBOX` label from a message. Users currently have to move messages to another folder to get them out of the inbox.

## Goal

In INBOX selection mode, present two action buttons: **Archive** and **Move**. Archive removes the `INBOX` label from selected emails (Gmail's archive semantics). Move continues to behave as today.

## Non-goals

- No changes to label-view selection mode behavior.
- No new API surface in `services/gmailApi.ts` — Gmail has no dedicated archive endpoint; archive *is* `removeLabelIds: ['INBOX']`, which the existing `removeLabelFromEmails` handles.
- No changes to the email detail screen.
- No changes to selection-mode entry, multi-select, or the folder selection modal.

## Design

### Visibility

Replace the existing `showRemoveLabel` derived value (currently `InboxScreen.tsx:353-356`) with a single predicate that is true when the source folder is INBOX **or** a user label (i.e., not a Gmail system pseudo-label):

```ts
const sourceFolderId = currentFolder?.id ?? 'INBOX';
const isInbox = sourceFolderId === 'INBOX';
const showRemoveOrArchive =
  isInbox ||
  (!sourceFolderId.startsWith('CATEGORY_') &&
   !['TRASH', 'SENT', 'DRAFTS', 'SPAM', 'STARRED', 'IMPORTANT', 'UNREAD'].includes(sourceFolderId));
```

This keeps the same exclusions for system labels and adds INBOX as a valid source.

### Button render

In the selection-mode header (`InboxScreen.tsx:468-472`), when `showRemoveOrArchive` is true, render one icon button whose icon and accessibility label depend on `isInbox`:

- **INBOX:** icon `archivebox`, `accessibilityLabel="Archive"`.
- **User label:** icon `tag.slash`, `accessibilityLabel="Remove label"` (today's behavior).

Position: unchanged — left of the Move (folder) button. So in INBOX the layout becomes `[Archive] [Move]`; in a label view it stays `[Remove label] [Move]`.

### Action handler

`handleRemoveLabelBatch` (`InboxScreen.tsx:212-266`) currently early-returns when `currentFolder` is null. Change two things:

1. Replace `if (!currentFolder) return;` with `const sourceFolderId = currentFolder?.id ?? 'INBOX';` and proceed.
2. Branch the toast wording: when `sourceFolderId === 'INBOX'`, the success toast reads `${count} email(s) archived`; otherwise the existing `${count} email(s) removed`.

Everything else in the function — the call to `removeLabelFromEmails(ids, sourceFolderId, ...)`, the failure-path `BatchErrorModal` with `action: 'remove'`, the Undo handler that calls `addLabelsToEmails(ids, [sourceFolderId])`, the `clearSelection` + `handleRefresh` calls — stays as-is. Adding INBOX back via `addLabelsToEmails` is the correct unarchive operation.

### Error handling

The existing `BatchErrorModal` flow handles partial failures unchanged. `batchErrorDetails.action: 'remove'` still applies semantically — archive is a remove-label internally, and the retry path (`handleRetryBatch`) calls `handleRemoveLabelBatch(failedIds)`, which now works for INBOX.

## Out of scope / future considerations

- A confirmation prompt before archiving. Not needed: undo is already provided via the toast.
- Bulk-archive of all inbox emails (no selection). Not in scope.
- An "archive" action on the email detail screen. Not in scope; this spec only covers selection-mode.

## Testing

Manual verification:

1. In INBOX, long-press an email to enter selection mode. Confirm two icon buttons render: archive then folder.
2. Tap archive. Confirm:
   - Selected emails disappear from the inbox list.
   - Toast reads "N email(s) archived" with an Undo action.
   - Undo restores the emails to the inbox list.
3. In a user label view, repeat selection mode. Confirm the layout still shows `tag.slash` then folder, and the existing remove-label flow is unchanged.
4. In a system label view (e.g., STARRED, SENT), confirm only the Move button renders (no archive/remove-label button).
5. Trigger a partial-failure batch (e.g., disconnect mid-action). Confirm `BatchErrorModal` appears and Retry re-runs the archive on failed IDs only.

## Files touched

- `components/InboxScreen.tsx` — visibility predicate, button render, handler tweak.

No other files modified.
