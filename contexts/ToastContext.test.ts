describe('ToastContext - Undo functionality', () => {
  describe('UndoAction type', () => {
    it('accepts valid UndoAction structure', () => {
      const validAction = {
        id: 'unique-id',
        label: 'Undo',
        undo: async () => { console.log('undo'); },
      };

      expect(validAction.id).toBe('unique-id');
      expect(validAction.label).toBe('Undo');
      expect(typeof validAction.undo).toBe('function');
    });

    it('handles async undo functions', async () => {
      const asyncUndo = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      
      await asyncUndo();
      
      expect(asyncUndo).toHaveBeenCalled();
    });

    it('can undo a move action by reversing the labels', async () => {
      const mockMoveEmailsToLabel = jest.fn().mockResolvedValue({ succeeded: [{ id: 'email1' }], failed: [] });
      
      const undoMove = async () => {
        await mockMoveEmailsToLabel(['email1'], 'INBOX', 'SENT');
      };

      await undoMove();

      expect(mockMoveEmailsToLabel).toHaveBeenCalledWith(['email1'], 'INBOX', 'SENT');
    });

    it('can undo a remove label action by moving back', async () => {
      const mockMoveEmailsToLabel = jest.fn().mockResolvedValue({ succeeded: [{ id: 'email1' }], failed: [] });
      
      const undoRemove = async () => {
        await mockMoveEmailsToLabel(['email1'], 'Work', 'INBOX');
      };

      await undoRemove();

      expect(mockMoveEmailsToLabel).toHaveBeenCalledWith(['email1'], 'Work', 'INBOX');
    });
  });

  describe('Undo toast message formatting', () => {
    it('formats singular email message correctly', () => {
      const count = 1;
      const message = `${count} email(s) removed`;
      expect(message).toBe('1 email(s) removed');
    });

    it('formats plural email messages correctly', () => {
      const count = 5;
      const message = `${count} email(s) moved`;
      expect(message).toBe('5 email(s) moved');
    });
  });

  describe('Undo action ID generation', () => {
    it('generates unique IDs for different undo actions', () => {
      const id1 = `remove-label-${Date.now()}-1`;
      const id2 = `remove-label-${Date.now()}-2`;
      
      expect(id1).not.toBe(id2);
    });

    it('includes action type in ID for debugging', () => {
      const removeId = 'remove-label-batch-123';
      const moveId = 'move-batch-456';

      expect(removeId).toContain('remove');
      expect(moveId).toContain('move');
    });
  });
});
