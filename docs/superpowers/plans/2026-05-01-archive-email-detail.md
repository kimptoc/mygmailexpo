# Email-Detail Archive Button — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show an Archive button on the email-detail header when the email was opened from INBOX, alongside the existing Move button. Mirrors the selection-mode treatment already shipped in `components/InboxScreen.tsx`.

**Architecture:** Reuse the existing pure utility `getSelectionAction(folderId)` from `utils/folder-actions.ts`. Replace the boolean `showRemoveLabel` `useMemo` in `app/email/[id].tsx` with a `selectionAction` `useMemo` returning `'archive' | 'remove-label' | 'none'`. Rename `handleRemoveLabel` to `handleArchiveOrRemove`, drop its INBOX-blocking guard, and branch the success-toast wording.

**Tech Stack:** TypeScript, React Native, Expo Router, Jest + ts-jest (Node test env).

**Spec:** `docs/superpowers/specs/2026-05-01-archive-email-detail-design.md`

---

## File structure

- **Modify:** `app/email/[id].tsx` — single file, four touch-points (import, `useMemo`, handler, JSX).

No new files, no new tests (the underlying utility is already covered by `utils/folder-actions.test.ts`).

---

## Task 1: Wire archive action into email-detail header

**Files:**
- Modify: `app/email/[id].tsx` (import, derived value, handler rename + tweak, JSX render)

**Background:** Today the file has a `useMemo`-derived boolean `showRemoveLabel` (lines 173-179) with the same exclusion logic that the inbox screen used to have. The handler `handleRemoveLabel` (lines 122-144) early-returns when `folderId` is missing and only knows the "remove label" wording. The header JSX (lines 422-431) renders a single conditional Remove-label button. After this task, the screen handles INBOX as a valid source the same way `InboxScreen.tsx` already does.

- [ ] **Step 1: Add the import**

In `app/email/[id].tsx`, add this import near the other `@/` imports at the top of the file (the existing imports are alphabetically loose; placing it after the `useActionButtonColors` import keeps it near the other utility-style imports):

```ts
import { getSelectionAction } from '@/utils/folder-actions';
```

- [ ] **Step 2: Replace the visibility derivation**

Locate this block (around lines 173-179):

```ts
// Check if we should show Remove Label button
// Show if we are in a custom user label (not INBOX/System/Category)
const showRemoveLabel = useMemo(() => {
  if (!folderId) return false;
  if (folderId === 'INBOX') return false;
  if (folderId.startsWith('CATEGORY_')) return false;
  if (['TRASH', 'SENT', 'DRAFTS', 'SPAM', 'STARRED', 'IMPORTANT', 'UNREAD'].includes(folderId)) return false;
  return true;
}, [folderId]);
```

Replace with:

```ts
const selectionAction = useMemo(
  () => getSelectionAction(folderId ?? 'INBOX'),
  [folderId]
);
```

(Drop the comment block — the function name now says what was being checked.)

- [ ] **Step 3: Rename and update the action handler**

Locate `handleRemoveLabel` (around lines 122-144):

```ts
const handleRemoveLabel = async () => {
  if (!folderId) return;
  setActionLoading(true);
  const removedLabelId = folderId;
  try {
    await removeLabelFromEmails([id], removedLabelId);
    showUndoToast(
      '1 email removed',
      {
        id: `remove-label-${id}-${Date.now()}`,
        label: 'Undo',
        undo: async () => {
          await addLabelsToEmails([id], [removedLabelId]);
        }
      }
    );
    router.back();
  } catch (err: any) {
    console.error('Error removing label:', err);
    showToast(err.message || 'Failed to remove label', 'error');
    setActionLoading(false);
  }
};
```

Replace with:

```ts
const handleArchiveOrRemove = async () => {
  setActionLoading(true);
  const sourceFolderId = folderId ?? 'INBOX';
  const isArchive = sourceFolderId === 'INBOX';
  try {
    await removeLabelFromEmails([id], sourceFolderId);
    showUndoToast(
      isArchive ? '1 email archived' : '1 email removed',
      {
        id: `remove-label-${id}-${Date.now()}`,
        label: 'Undo',
        undo: async () => {
          await addLabelsToEmails([id], [sourceFolderId]);
        }
      }
    );
    router.back();
  } catch (err: any) {
    console.error('Error removing label:', err);
    showToast(err.message || (isArchive ? 'Failed to archive email' : 'Failed to remove label'), 'error');
    setActionLoading(false);
  }
};
```

Changes summary:
- Function name: `handleRemoveLabel` → `handleArchiveOrRemove`.
- Removed the `if (!folderId) return;` guard.
- Renamed local `removedLabelId` → `sourceFolderId`, with `?? 'INBOX'` fallback.
- Toast wording branches on `isArchive`.
- Error toast wording branches on `isArchive` so the user sees `"Failed to archive email"` instead of `"Failed to remove label"` when archiving (only used when the API didn't supply a message).

- [ ] **Step 4: Update the button render**

Locate the header action block (around lines 421-440 — the inner content of the `<>` fragment that runs when `actionLoading` is false):

```tsx
<>
  {showRemoveLabel && (
    <TouchableOpacity 
      onPress={handleRemoveLabel} 
      style={[styles.actionButton, styles.actionHitSlop]}
      accessibilityLabel="Remove label"
      {...{ title: "Remove label" } as any}
    >
      <IconSymbol name="tag.slash" size={isLargeScreen ? 28 : 22} color={textColor} />
    </TouchableOpacity>
  )}
  <TouchableOpacity 
    onPress={() => setShowFolderModal(true)} 
    style={[styles.actionButton, styles.actionHitSlop]}
    accessibilityLabel="Move to folder"
    {...{ title: "Move to folder" } as any}
  >
    <IconSymbol name="folder" size={isLargeScreen ? 28 : 22} color={textColor} />
  </TouchableOpacity>
</>
```

Replace with:

```tsx
<>
  {selectionAction === 'archive' && (
    <TouchableOpacity 
      onPress={handleArchiveOrRemove} 
      style={[styles.actionButton, styles.actionHitSlop]}
      accessibilityLabel="Archive"
      {...{ title: "Archive" } as any}
    >
      <IconSymbol name="archivebox" size={isLargeScreen ? 28 : 22} color={textColor} />
    </TouchableOpacity>
  )}
  {selectionAction === 'remove-label' && (
    <TouchableOpacity 
      onPress={handleArchiveOrRemove} 
      style={[styles.actionButton, styles.actionHitSlop]}
      accessibilityLabel="Remove label"
      {...{ title: "Remove label" } as any}
    >
      <IconSymbol name="tag.slash" size={isLargeScreen ? 28 : 22} color={textColor} />
    </TouchableOpacity>
  )}
  <TouchableOpacity 
    onPress={() => setShowFolderModal(true)} 
    style={[styles.actionButton, styles.actionHitSlop]}
    accessibilityLabel="Move to folder"
    {...{ title: "Move to folder" } as any}
  >
    <IconSymbol name="folder" size={isLargeScreen ? 28 : 22} color={textColor} />
  </TouchableOpacity>
</>
```

Changes summary:
- The single `showRemoveLabel`-gated button becomes two mutually-exclusive blocks (archive | remove-label).
- Both call the renamed `handleArchiveOrRemove`.
- The Move button is unchanged.
- `selectionAction === 'none'` renders nothing — same as today's `showRemoveLabel = false` behaviour.

- [ ] **Step 5: Run the existing test suite to confirm nothing regressed**

Run: `npm test`
Expected: PASS — all existing tests (60 at last count, including `folder-actions.test.ts`).

- [ ] **Step 6: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Lint**

Run: `npm run lint`
Expected: no new errors introduced by these edits (pre-existing warnings are acceptable).

- [ ] **Step 8: Verify there are no stale references**

Run: `git grep -n 'showRemoveLabel\|handleRemoveLabel' app/email/`
Expected: no output (both old identifiers should be gone from the email-detail directory).

- [ ] **Step 9: Commit**

```bash
git add app/email/\[id\].tsx
git commit -m "Add archive action to email detail when opened from INBOX"
```

(The square brackets in the path must be escaped for the shell; alternatively quote the path: `git add 'app/email/[id].tsx'`.)

---

## Task 2: Manual verification

**Files:** none — this is on-device testing.

**Background:** The email-detail screen has no existing component tests, and adding RN component tests purely for this two-button rendering would be over-investment. Verify per the spec's manual testing checklist.

- [ ] **Step 1: Start the dev server**

Run: `npx expo start`

- [ ] **Step 2: Verify INBOX archive happy path**

In the running app:
1. From the inbox list, tap an email to open the detail screen.
2. Confirm the header shows two action icons: archive (`archivebox`) then folder.
3. Tap archive.
4. Confirm: navigation returns to the inbox list, the archived email is no longer in the list, toast reads `"1 email archived"` with an Undo action.
5. Tap Undo. Confirm: the email returns to the inbox list.

- [ ] **Step 3: Verify user-label flow unchanged**

Switch to a user label, tap an email to open detail. Confirm the header shows `tag.slash` then folder, the toast on tap still reads `"1 email removed"`, and Undo works.

- [ ] **Step 4: Verify system-label views**

Open an email from STARRED (or SENT, TRASH). Confirm only the Move button renders — no archive, no remove-label.

- [ ] **Step 5: Verify Move flow still works in INBOX**

Back in INBOX, open an email, tap the folder button. Confirm the folder selection modal opens and moving works as before.

- [ ] **Step 6: Verify error path**

With network disabled (or a Gmail API failure simulated), open an email from INBOX and tap archive. Confirm: an error toast appears (default text `"Failed to archive email"` if the API didn't supply a specific message), and the header buttons re-appear after the spinner clears.

- [ ] **Step 7: Sign off**

If all the above pass, the feature is complete. If any step fails, file the failure as a follow-up and do not mark the task done.

---

## Self-review notes (already applied)

- **Spec coverage:** Visibility derivation (Task 1.2), handler rename + INBOX guard removal (Task 1.3), toast wording branch (Task 1.3), button render (Task 1.4), error-handling preservation (Task 1.3 — try/catch unchanged), manual checklist (Task 2). All spec sections mapped.
- **Placeholder scan:** No TBDs, every code step has a complete code block.
- **Type consistency:** `getSelectionAction` import path matches the file created in the previous feature (`@/utils/folder-actions`); `selectionAction` value `'archive' | 'remove-label' | 'none'` is checked exhaustively in JSX (the third value renders nothing); `handleArchiveOrRemove` is referenced consistently in the renamed handler and both `onPress` sites.
