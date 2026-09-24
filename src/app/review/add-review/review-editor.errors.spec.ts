import { HttpErrorResponse } from '@angular/common/http';
import { reviewSaveError } from './review-editor.errors';

describe('Review save feedback', () => {
  it('shows validation details instead of a connection error', () => {
    expect(reviewSaveError(new HttpErrorResponse({ status: 400, error: { message: 'episode: expected a non-negative number' } }))).toContain('episode: expected a non-negative number');
    expect(reviewSaveError(new HttpErrorResponse({ status: 422, error: { message: ['name: required', 'tier: required'] } }))).toContain('name: required; tier: required');
  });
  it('distinguishes connection, expired session and server failures without exposing server internals', () => {
    expect(reviewSaveError(new HttpErrorResponse({ status: 0 }))).toContain('เชื่อมต่อ Backend');
    expect(reviewSaveError(new HttpErrorResponse({ status: 401 }))).toContain('เซสชันหมดอายุ');
    const result = reviewSaveError(new HttpErrorResponse({ status: 500, error: { message: 'internal configuration' } }));
    expect(result).toContain('HTTP 500');
    expect(result).not.toContain('internal configuration');
  });
  it('retains duplicate and upload errors', () => {
    expect(reviewSaveError(new Error('Duplicate review'))).toBe('Duplicate review');
  });
});
