import { getFromName, getSmartFormattedDate } from '../gmail';

describe('gmail helpers', () => {
  describe('getFromName', () => {
    it('should extract name from "Name <email>" format', () => {
      expect(getFromName('John Doe <john.doe@example.com>')).toBe('John Doe');
    });

    it('should handle extra spaces', () => {
      expect(getFromName('  Jane Doe   <jane.doe@example.com>')).toBe('Jane Doe');
    });

    it('should extract username from email if no name is present', () => {
      expect(getFromName('just-an-email@example.com')).toBe('just-an-email');
    });

    it('should handle emails inside angle brackets without a name', () => {
      expect(getFromName('<only.email@example.com>')).toBe('only.email');
    });

    it('should return the full string if no email format is detected', () => {
      expect(getFromName('Plain Name String')).toBe('Plain Name String');
    });
  });

  describe('getSmartFormattedDate', () => {
    const now = new Date();
    
    it('should format todays date as time', () => {
      const today = new Date();
      const result = getSmartFormattedDate(today.getTime());
      // e.g., "1:45 PM" - this is locale-dependent, so we just check for ":"
      expect(result).toContain(':');
    });

    it('should format yesterdays date as "Yesterday"', () => {
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      const result = getSmartFormattedDate(yesterday.getTime());
      expect(result).toBe('Yesterday');
    });

    it('should format a date within the current year as "Mon Day"', () => {
      const thisYear = new Date();
      // Avoid today and yesterday
      thisYear.setDate(now.getDate() - 5); 
      // If it's the beginning of the year, this could still be last year
      if (thisYear.getFullYear() === now.getFullYear()) {
        const result = getSmartFormattedDate(thisYear.getTime());
        const expected = thisYear.toLocaleDateString([], { month: 'short', day: 'numeric' });
        expect(result).toBe(expected);
      }
    });

    it('should format a date from a previous year as "Mon Day, Year"', () => {
      const lastYear = new Date();
      lastYear.setFullYear(now.getFullYear() - 1);
      const result = getSmartFormattedDate(lastYear.getTime());
      const expected = lastYear.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      expect(result).toBe(expected);
    });
  });
});
