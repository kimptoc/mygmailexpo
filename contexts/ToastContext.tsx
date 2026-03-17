import React, { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from 'react';
import { Toast, ToastType } from '@/components/ui/Toast';

export interface UndoAction {
  id: string;
  undo: () => Promise<void>;
  label: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  showUndoToast: (message: string, undoAction: UndoAction, duration?: number) => void;
  cancelUndo: (id: string) => void;
  triggerRefresh: () => void;
  onRefresh: (callback: () => void) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const UNDO_TIMEOUT = 10000; // 10 seconds

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ 
    message: string; 
    type: ToastType; 
    visible: boolean;
    undoAction?: UndoAction;
  }>({
    message: '',
    type: 'info',
    visible: false,
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoCallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUndoIdRef = useRef<string | null>(null);
  const refreshCallbackRef = useRef<(() => void) | null>(null);

  const triggerRefresh = useCallback(() => {
    if (refreshCallbackRef.current) {
      refreshCallbackRef.current();
    }
  }, []);

  const onRefresh = useCallback((callback: () => void) => {
    refreshCallbackRef.current = callback;
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    if (undoCallbackTimeoutRef.current) {
      clearTimeout(undoCallbackTimeoutRef.current);
      undoCallbackTimeoutRef.current = null;
    }
    currentUndoIdRef.current = null;
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type, visible: true, undoAction: undefined });
    currentUndoIdRef.current = null;
  }, []);

  const showUndoToast = useCallback((message: string, undoAction: UndoAction, duration: number = UNDO_TIMEOUT) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const undoId = undoAction.id;
    currentUndoIdRef.current = undoId;

    setToast({ 
      message, 
      type: 'info', 
      visible: true, 
      undoAction 
    });

    timeoutRef.current = setTimeout(() => {
      if (currentUndoIdRef.current === undoId) {
        hideToast();
      }
    }, duration);
  }, [hideToast]);

  const cancelUndo = useCallback((id: string) => {
    if (currentUndoIdRef.current === id) {
      hideToast();
    }
  }, [hideToast]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      if (undoCallbackTimeoutRef.current) {
        clearTimeout(undoCallbackTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showUndoToast, cancelUndo, triggerRefresh, onRefresh }}>
      {children}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
        undoAction={toast.undoAction}
        onUndo={toast.undoAction ? () => {
          const undoId = currentUndoIdRef.current;
          if (undoId && toast.undoAction) {
            toast.undoAction.undo()
              .then(() => {
                setToast({ message: 'Undone', type: 'success', visible: true, undoAction: undefined });
                triggerRefresh();
                undoCallbackTimeoutRef.current = setTimeout(() => {
                  hideToast();
                }, 3000);
              })
              .catch((err) => {
                setToast({ message: err.message || 'Failed to undo', type: 'error', visible: true, undoAction: undefined });
                undoCallbackTimeoutRef.current = setTimeout(() => {
                  hideToast();
                }, 3000);
              });
          }
        } : undefined}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
