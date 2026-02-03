import { act } from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useEmailSelection } from '../useEmailSelection';

describe('useEmailSelection', () => {
  it('should initialize with no selection and not in selection mode', () => {
    const { result } = renderHook(() => useEmailSelection());
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.isSelectionMode).toBe(false);
  });

  it('should enter selection mode and add an ID when toggle is called for the first time', () => {
    const { result } = renderHook(() => useEmailSelection());

    act(() => {
      result.current.toggleSelection('email1');
    });

    expect(result.current.isSelectionMode).toBe(true);
    expect(result.current.selectedIds.has('email1')).toBe(true);
    expect(result.current.selectionCount).toBe(1);
  });

  it('should add multiple IDs when toggle is called multiple times', () => {
    const { result } = renderHook(() => useEmailSelection());

    act(() => {
      result.current.toggleSelection('email1');
      result.current.toggleSelection('email2');
    });

    expect(result.current.isSelectionMode).toBe(true);
    expect(result.current.selectedIds.has('email1')).toBe(true);
    expect(result.current.selectedIds.has('email2')).toBe(true);
    expect(result.current.selectionCount).toBe(2);
  });

  it('should remove an ID if toggle is called on an already selected ID', () => {
    const { result } = renderHook(() => useEmailSelection());

    act(() => {
      result.current.toggleSelection('email1');
      result.current.toggleSelection('email2');
    });
    
    act(() => {
      result.current.toggleSelection('email1');
    });

    expect(result.current.selectedIds.has('email1')).toBe(false);
    expect(result.current.selectedIds.has('email2')).toBe(true);
    expect(result.current.selectionCount).toBe(1);
  });

  it('should exit selection mode when the last item is deselected', () => {
    const { result } = renderHook(() => useEmailSelection());

    act(() => {
      result.current.toggleSelection('email1');
    });
    expect(result.current.isSelectionMode).toBe(true);
    
    act(() => {
      result.current.toggleSelection('email1');
    });

    expect(result.current.isSelectionMode).toBe(false);
    expect(result.current.selectionCount).toBe(0);
  });

  it('should clear the selection and exit selection mode', () => {
    const { result } = renderHook(() => useEmailSelection());

    act(() => {
      result.current.toggleSelection('email1');
      result.current.toggleSelection('email2');
    });

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.isSelectionMode).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.selectionCount).toBe(0);
  });

  it('should select all provided IDs and enter selection mode', () => {
    const { result } = renderHook(() => useEmailSelection());
    const ids = ['email1', 'email2', 'email3'];

    act(() => {
      result.current.selectAll(ids);
    });

    expect(result.current.isSelectionMode).toBe(true);
    expect(result.current.selectedIds.size).toBe(3);
    expect(result.current.selectedIds.has('email2')).toBe(true);
  });
});
