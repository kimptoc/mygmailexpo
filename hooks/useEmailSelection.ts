import { useState, useCallback } from 'react';

export function useEmailSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (next.size === 0) {
          setIsSelectionMode(false);
        }
      } else {
        next.add(id);
        setIsSelectionMode(true);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
    setIsSelectionMode(true);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, []);

  const enterSelectionMode = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
    setIsSelectionMode(true);
  }, []);

  return {
    selectedIds,
    isSelectionMode,
    toggleSelection,
    selectAll,
    clearSelection,
    enterSelectionMode,
    selectionCount: selectedIds.size,
  };
}
