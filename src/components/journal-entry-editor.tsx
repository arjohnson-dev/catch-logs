/*
 * File:        src/components/journal-entry-editor.tsx
 * Description: <brief description of the purpose of this file>
 *
 * Author:      Andrew Johnson
 * Company:     CatchLogs LLC
 *
 * Copyright (c) 2026 CatchLogs LLC. All rights reserved.
 *
 * This source code and all associated files are the property of CatchLogs LLC.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without explicit written permission
 * from CatchLogs LLC.
 */
import JournalEntryForm from "@/components/journal-entry-form";
import type { JournalEntry } from "@/types/domain";

interface JournalEntryEditorProps {
  entry: JournalEntry;
  onClose: () => void;
  onComplete: () => void;
}

export default function JournalEntryEditor({
  entry,
  onClose,
  onComplete,
}: JournalEntryEditorProps) {
  return (
    <JournalEntryForm
      entry={entry}
      onClose={onClose}
      onComplete={onComplete}
    />
  );
}
