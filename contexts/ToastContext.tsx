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
  const currentUndoIdRef = useRef<string | null>(null);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    currentUndoIdRef.current = null;
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
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
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showUndoToast, cancelUndo }}>
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
                showToast('Undone', 'success');
              })
              .catch((err) => {
                showToast(err.message || 'Failed to undo', 'error');
              })
              .finally(() => {
                if (currentUndoIdRef.current === undoId) {
                  hideToast();
                }
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
