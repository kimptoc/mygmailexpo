# Archive Button for INBOX Selection Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Archive action to selection mode when viewing INBOX, alongside the existing Move action. Archive removes the `INBOX` label from selected emails (Gmail's archive semantics).

**Architecture:** Extract folder-action eligibility into a pure utility (`utils/folder-actions.ts`) covered by unit tests. Wire it into `components/InboxScreen.tsx` so the selection-mode header renders an archive icon when the source folder is INBOX, a remove-label icon for user labels, and nothing for system labels. Reuse the existing `removeLabelFromEmails` API call — Gmail's archive *is* `removeLabelIds: ['INBOX']`.

**Tech Stack:** TypeScript, React Native, Expo Router, Jest + ts-jest (Node test env).

**Spec:** `docs/superpowers/specs/2026-05-01-archive-inbox-button-design.md`

---

## File structure

- **Create:** `utils/folder-actions.ts` — pure function `getSelectionAction(folderId)` returning `'archive' | 'remove-label' | 'none'`.
- **Create:** `utils/folder-actions.test.ts` — Jest unit tests for the predicate.
- **Modify:** `components/InboxScreen.tsx` — import the util, replace `showRemoveLabel` derivation, render the right icon, branch toast wording, allow `handleRemoveLabelBatch` to run when source is INBOX.

No other files change.

---

## Task 1: Pure utility for selection-mode action eligibility

**Files:**
- Create: `utils/folder-actions.ts`
- Test: `utils/folder-actions.test.ts`

**Background:** Today, `InboxScreen.tsx:353-356` derives `showRemoveLabel` inline. We need INBOX → archive, user labels → remove-label, system labels (TRASH, SENT, DRAFTS, SPAM, STARRED, IMPORTANT, UNREAD, anything starting `CATEGORY_`) → no action button. Encode this once, test it once.

- [ ] **Step 1: Write the failing tests**

Create `utils/folder-actions.test.ts`:

```ts
import { getSelectionAction } from './folder-actions';

describe('getSelectionAction', () => {
  it('returns "archive" for INBOX', () => {
    expect(getSelectionAction('INBOX')).toBe('archive');
  });

  it('returns "remove-label" for a user label id', () => {
    expect(getSelectionAction('Label_123')).toBe('remove-label');
    expect(getSelectionAction('Label_abc')).toBe('remove-label');
  });

  it('returns "none" for Gmail system pseudo-labels', () => {
    for (const id of ['TRASH', 'SENT', 'DRAFTS', 'SPAM', 'STARRED', 'IMPORTANT', 'UNREAD']) {
      expect(getSelectionAction(id)).toBe('none');
    }
  });

  it('returns "none" for CATEGORY_* labels', () => {
    expect(getSelectionAction('CATEGORY_PROMOTIONS')).toBe('none');
    expect(getSelectionAction('CATEGORY_SOCIAL')).toBe('none');
    expect(getSelectionAction('CATEGORY_UPDATES')).toBe('none');
    expect(getSelectionAction('CATEGORY_FORUMS')).toBe('none');
    expect(getSelectionAction('CATEGORY_PERSONAL')).toBe('none');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- utils/folder-actions.test.ts`
Expected: FAIL with module-not-found error for `./folder-actions`.

- [ ] **Step 3: Write the minimal implementation**

Create `utils/folder-actions.ts`:

```ts
export type SelectionAction = 'archive' | 'remove-label' | 'none';

const SYSTEM_LABEL_IDS = new Set([
  'TRASH',
  'SENT',
  'DRAFTS',
  'SPAM',
  'STARRED',
  'IMPORTANT',
  'UNREAD',
]);

export function getSelectionAction(folderId: string): SelectionAction {
  if (folderId === 'INBOX') return 'archive';
  if (folderId.startsWith('CATEGORY_')) return 'none';
  if (SYSTEM_LABEL_IDS.has(folderId)) return 'none';
  return 'remove-label';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- utils/folder-actions.test.ts`
Expected: PASS — all four `it` blocks green.

- [ ] **Step 5: Commit**

```bash
git add utils/folder-actions.ts utils/folder-actions.test.ts
git commit -m "Add getSelectionAction utility for folder action eligibility"
```

---

## Task 2: Wire archive action into InboxScreen

**Files:**
- Modify: `components/InboxScreen.tsx` (import, derived value, button render, handler tweak)

**Background:** `handleRemoveLabelBatch` (`InboxScreen.tsx:212-266`) currently early-returns when `currentFolder` is null. The button visibility at `InboxScreen.tsx:353-356` requires `currentFolder` to be set. Both need to allow INBOX as a source. The button render at `InboxScreen.tsx:468-472` needs to switch icon/label based on the action.

- [ ] **Step 1: Add the import**

Add this import near the other `@/` imports at the top of `components/InboxScreen.tsx` (alphabetical fits after the `useEmailSelection` import block):

```ts
import { getSelectionAction } from '@/utils/folder-actions';
```

- [ ] **Step 2: Replace the visibility derivation**

In `components/InboxScreen.tsx`, locate this block (around line 353-356):

```ts
const showRemoveLabel = !!currentFolder && 
  currentFolder.id !== 'INBOX' && 
  !currentFolder.id.startsWith('CATEGORY_') && 
  !['TRASH', 'SENT', 'DRAFTS', 'SPAM', 'STARRED', 'IMPORTANT', 'UNREAD'].includes(currentFolder.id);
```

Replace with:

```ts
const sourceFolderId = currentFolder?.id ?? 'INBOX';
const selectionAction = getSelectionAction(sourceFolderId);
```

- [ ] **Step 3: Update `handleRemoveLabelBatch` to allow INBOX**

In `components/InboxScreen.tsx`, locate `handleRemoveLabelBatch` (starts around line 212). Replace the body up to the `try` block. The current code starts:

```ts
const handleRemoveLabelBatch = useCallback(async (idsToProcess?: string[]) => {
  if (!currentFolder) return;
  setActionLoading(true);
  const ids = Array.isArray(idsToProcess) ? idsToProcess : Array.from(selectedIds);
  const sourceFolderId = currentFolder.id;
```

Change to:

```ts
const handleRemoveLabelBatch = useCallback(async (idsToProcess?: string[]) => {
  setActionLoading(true);
  const ids = Array.isArray(idsToProcess) ? idsToProcess : Array.from(selectedIds);
  const sourceFolderId = currentFolder?.id ?? 'INBOX';
```

(Remove the `if (!currentFolder) return;` line; change the const initializer from `currentFolder.id` to `currentFolder?.id ?? 'INBOX'`.)

- [ ] **Step 4: Branch the success-toast wording**

Still in `handleRemoveLabelBatch`, locate the success branch (around line 238-254 in the pre-edit file):

```ts
} else {
  const count = result.succeeded.length;
  showUndoToast(
    `${count} email(s) removed`,
    {
      id: `remove-label-batch-${Date.now()}`,
```

Replace with:

```ts
} else {
  const count = result.succeeded.length;
  const message = sourceFolderId === 'INBOX'
    ? `${count} email(s) archived`
    : `${count} email(s) removed`;
  showUndoToast(
    message,
    {
      id: `remove-label-batch-${Date.now()}`,
```

The rest of the success branch (the `undo` callback that calls `addLabelsToEmails(ids, [sourceFolderId])`) is unchanged — re-adding INBOX is exactly unarchive.

- [ ] **Step 5: Update the button render**

In `components/InboxScreen.tsx`, locate the selection-mode header render block (around line 467-475):

```tsx
<>
  {showRemoveLabel && (
    <TouchableOpacity onPress={handleRemoveLabelBatch} style={styles.selectionActionButton}>
      <IconSymbol name="tag.slash" size={iconSize} color={selectionHeaderText} />
    </TouchableOpacity>
  )}
  <TouchableOpacity onPress={() => setShowFolderModal(true)} style={styles.selectionActionButton}>
    <IconSymbol name="folder" size={iconSize} color={selectionHeaderText} />
  </TouchableOpacity>
</>
```

Replace with:

```tsx
<>
  {selectionAction === 'archive' && (
    <TouchableOpacity
      onPress={() => handleRemoveLabelBatch()}
      style={styles.selectionActionButton}
      accessibilityLabel="Archive"
    >
      <IconSymbol name="archivebox" size={iconSize} color={selectionHeaderText} />
    </TouchableOpacity>
  )}
  {selectionAction === 'remove-label' && (
    <TouchableOpacity
      onPress={() => handleRemoveLabelBatch()}
      style={styles.selectionActionButton}
      accessibilityLabel="Remove label"
    >
      <IconSymbol name="tag.slash" size={iconSize} color={selectionHeaderText} />
    </TouchableOpacity>
  )}
  <TouchableOpacity
    onPress={() => setShowFolderModal(true)}
    style={styles.selectionActionButton}
    accessibilityLabel="Move"
  >
    <IconSymbol name="folder" size={iconSize} color={selectionHeaderText} />
  </TouchableOpacity>
</>
```

(Wrap `handleRemoveLabelBatch` in an arrow function so the `TouchableOpacity` `onPress` event object isn't passed as `idsToProcess`. The third button — Move — gains an `accessibilityLabel` for consistency.)

- [ ] **Step 6: Run the existing test suite to confirm nothing regressed**

Run: `npm test`
Expected: PASS — all existing tests plus the new `folder-actions.test.ts` pass.

- [ ] **Step 7: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Lint**

Run: `npm run lint`
Expected: no new errors introduced by these edits.

- [ ] **Step 9: Commit**

```bash
git add components/InboxScreen.tsx
git commit -m "Add archive action to INBOX selection mode"
```

---

## Task 3: Manual verification

**Files:** none — this is on-device testing.

**Background:** The view-layer changes can't be unit-tested without a React Native test renderer, which the project doesn't currently use for screens. Verify per the spec's testing checklist.

- [ ] **Step 1: Start the dev server**

Run: `npx expo start`

- [ ] **Step 2: Verify INBOX archive happy path**

In the running app, in INBOX:
1. Long-press an email to enter selection mode.
2. Confirm two icon buttons render in the header: archive (`archivebox`) then folder.
3. Tap the archive button.
4. Confirm: selected email disappears from the list; toast reads `"1 email(s) archived"` with an Undo action.
5. Tap Undo. Confirm: the email returns to the inbox list.

- [ ] **Step 3: Verify multi-select archive**

In INBOX, select 3 emails, tap archive. Confirm toast reads `"3 email(s) archived"`, all three disappear, Undo restores all three.

- [ ] **Step 4: Verify user-label flow unchanged**

Switch to a user label (e.g., a personal label). Long-press, select. Confirm the layout shows the `tag.slash` icon then folder, the toast on remove still reads `"N email(s) removed"`, and Undo works.

- [ ] **Step 5: Verify system-label views**

Switch to STARRED (or SENT). Enter selection mode. Confirm only the Move (folder) button renders — no archive, no remove-label.

- [ ] **Step 6: Verify Move flow still works in INBOX**

Back in INBOX, select an email, tap the folder button. Confirm the folder selection modal opens and moving works as before.

- [ ] **Step 7: Sign off**

If all the above pass, the feature is complete. If any step fails, file the failure as a follow-up and do not mark the task done.

---

## Self-review notes (already applied)

- **Spec coverage:** Visibility predicate (Task 1), button render (Task 2.5), handler tweak (Task 2.3), toast wording (Task 2.4), error-modal pass-through (no change needed — covered in spec rationale), manual test checklist (Task 3) — all spec sections mapped.
- **Placeholder scan:** No TBDs, no "implement later", every code step has a complete code block.
- **Type consistency:** `getSelectionAction` signature matches both call sites (`utils/folder-actions.ts` definition and `InboxScreen.tsx` import); `selectionAction` value `'archive' | 'remove-label' | 'none'` is checked exhaustively in the render branch.
