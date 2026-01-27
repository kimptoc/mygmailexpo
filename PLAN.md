# MyGmail Expo - Feature Parity Plan

This document outlines the work needed to achieve feature parity between the Expo/React Native app and the native Android app.

## Current State

The Expo app currently supports:
- Google Sign-In (Android, iOS, Web)
- Viewing emails by folder/label
- Basic email list display (sender, subject, snippet, date)
- Basic email detail view (plain text only)
- Folder navigation with recent folders
- Folder search

## Missing Features

### Phase 1: Email List Enhancements

#### 1.1 Sender Avatar
- Display circular avatar with first letter of sender name
- Use themed background color
- **Files to modify:** `components/EmailItem.tsx`

#### 1.2 Unread Indicator
- Bold styling for unread emails (sender name, subject)
- Track `UNREAD` label in email labelIds
- **Files to modify:** `components/EmailItem.tsx`, `types/gmail.ts`

#### 1.3 Smart Date Formatting
- "Today" for today's emails
- "Yesterday" for yesterday's emails
- Day name (Mon, Tue, etc.) for this week
- "MMM d" for older emails
- **Files to modify:** Create `utils/dateFormatter.ts`, update `components/EmailItem.tsx`

#### 1.4 Label Chips
- Display label chips on email items (max 3, with "+N" overflow)
- Use label colors from Gmail API
- Exclude current folder label and system labels (UNREAD, INBOX)
- **Files to modify:** `components/EmailItem.tsx`, create `components/LabelChip.tsx`

#### 1.5 Pagination (Load More)
- Add "Load More" button when nextPageToken exists
- Show loading indicator while fetching
- Append new emails to existing list
- **Files to modify:** `components/InboxScreen.tsx`, `services/gmailApi.ts`

---

### Phase 2: Email Detail Enhancements

#### 2.1 HTML Email Rendering
- Render HTML emails using WebView (native) or iframe (web)
- Fall back to plain text if no HTML
- Wrap content with responsive CSS
- Handle external link clicks
- **Files to modify:** `app/email/[id].tsx`, `services/gmailApi.ts`

#### 2.2 Full Email Metadata
- Display To field
- Display CC field (if present)
- Better date formatting (full date and time)
- **Files to modify:** `app/email/[id].tsx`, update email detail type

#### 2.3 Label Display in Detail View
- Show label chips at top of email detail
- Use horizontal scrollable row
- **Files to modify:** `app/email/[id].tsx`

---

### Phase 3: Email Selection & Actions

#### 3.1 Multi-Select Mode
- Long press to enter selection mode
- Checkbox/selected state on email items
- Selection count in header
- "Select All" action
- "Clear Selection" action
- **Files to modify:** `components/InboxScreen.tsx`, `components/EmailItem.tsx`, create `hooks/useEmailSelection.ts`

#### 3.2 Remove Label from Emails
- Action button in selection mode header
- Action button in email detail view
- Call Gmail API to remove label
- Refresh email list after action
- **Files to modify:** `services/gmailApi.ts`, `components/InboxScreen.tsx`, `app/email/[id].tsx`

#### 3.3 Move Emails to Folder
- Action button in selection mode header
- Action button in email detail view
- Show folder selection modal
- Call Gmail API to add new label and remove current
- Track recent move destinations
- **Files to modify:** `services/gmailApi.ts`, `components/InboxScreen.tsx`, `app/email/[id].tsx`, `components/FolderSelectionModal.tsx`

#### 3.4 Mark as Read
- Automatic mark as read when viewing email detail
- Call Gmail API to remove UNREAD label
- Update local state
- **Files to modify:** `services/gmailApi.ts`, `app/email/[id].tsx`

---

### Phase 4: Polish & UX

#### 4.1 Pull to Refresh
- Add pull-to-refresh to email list
- Already partially implemented, verify working
- **Files to modify:** `components/InboxScreen.tsx`

#### 4.2 Loading States
- Skeleton loaders for email list
- Better loading indicators
- **Files to modify:** Create `components/EmailItemSkeleton.tsx`

#### 4.3 Error Handling
- Consistent error display
- Retry buttons
- Toast notifications for actions
- **Files to modify:** Various

#### 4.4 Dark Mode Support
- Verify all components work in dark mode
- HTML email rendering respects dark mode
- **Files to modify:** Various

---

## API Methods Needed

The following Gmail API methods need to be added to `services/gmailApi.ts`:

```typescript
// Mark email as read (remove UNREAD label)
markAsRead(emailId: string): Promise<void>

// Remove label from emails
removeLabelFromEmails(emailIds: string[], labelId: string): Promise<void>

// Move emails to folder (add label, remove current)
moveEmailsToLabel(
  emailIds: string[],
  targetLabelId: string,
  currentLabelId: string
): Promise<void>
```

---

## Type Definitions Needed

Update `types/gmail.ts` or create new types:

```typescript
interface EmailDetail {
  id: string;
  threadId: string;
  labelIds: string[];
  subject: string;
  from: string;
  to: string;
  cc?: string;
  date: string;
  receivedDate: number; // timestamp
  snippet: string;
  plainTextBody?: string;
  htmlBody?: string;
}

interface Email {
  id: string;
  threadId: string;
  labelIds: string[];
  subject: string;
  from: string;
  date: string;
  snippet: string;
  isUnread: boolean;
}
```

---

## Priority Order

1. **High Priority** (Core functionality)
   - 1.5 Pagination
   - 2.1 HTML Email Rendering
   - 3.4 Mark as Read

2. **Medium Priority** (Feature parity)
   - 1.2 Unread Indicator
   - 1.4 Label Chips
   - 2.2 Full Email Metadata
   - 3.1 Multi-Select Mode
   - 3.2 Remove Label
   - 3.3 Move to Folder

3. **Lower Priority** (Polish)
   - 1.1 Sender Avatar
   - 1.3 Smart Date Formatting
   - 2.3 Label Display in Detail
   - 4.x Polish items

---

## Estimated Effort

| Phase | Description | Complexity |
|-------|-------------|------------|
| Phase 1 | Email List Enhancements | Medium |
| Phase 2 | Email Detail Enhancements | Medium-High |
| Phase 3 | Email Selection & Actions | High |
| Phase 4 | Polish & UX | Low-Medium |

---

## Notes

- The Android app uses Jetpack Compose with Material 3
- The Expo app should maintain cross-platform compatibility (Android, iOS, Web)
- Web platform may need different implementations for some features (e.g., WebView vs iframe)
- Consider using react-native-webview for HTML rendering on native platforms
