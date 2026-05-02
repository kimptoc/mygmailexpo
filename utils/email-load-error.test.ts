import { emailLoadErrorMessage } from './email-load-error';

describe('emailLoadErrorMessage', () => {
  it('returns the not-found message when err.status is 404', () => {
    expect(emailLoadErrorMessage({ status: 404, message: 'whatever' })).toBe(
      'Email not found — it may have been deleted'
    );
  });

  it('returns err.message for non-404 errors', () => {
    expect(emailLoadErrorMessage({ status: 500, message: 'Server exploded' })).toBe(
      'Server exploded'
    );
  });

  it('returns the default message when err has no message', () => {
    expect(emailLoadErrorMessage({ status: 500 })).toBe('Failed to load email');
  });

  it('returns the default message when err is null', () => {
    expect(emailLoadErrorMessage(null)).toBe('Failed to load email');
  });

  it('returns the default message when err is undefined', () => {
    expect(emailLoadErrorMessage(undefined)).toBe('Failed to load email');
  });

  it('returns the default message when err is a non-object', () => {
    expect(emailLoadErrorMessage('boom')).toBe('Failed to load email');
  });

  it('does not mistake a stringified "404" status for a 404', () => {
    expect(emailLoadErrorMessage({ status: '404', message: 'fallback' })).toBe(
      'fallback'
    );
  });
});
