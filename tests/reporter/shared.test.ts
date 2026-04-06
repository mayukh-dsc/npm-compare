import { describe, it, expect, vi, afterEach } from 'vitest';
import { escapeHtml, truncate, formatDate, sortScript, commonStyles } from '../../src/reporter/shared.js';

describe('shared reporter helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('escapeHtml escapes special characters', () => {
    expect(escapeHtml('<a & b>')).toBe('&lt;a &amp; b&gt;');
  });

  it('truncate leaves short strings unchanged', () => {
    expect(truncate('hi', 10)).toBe('hi');
  });

  it('truncate adds ellipsis when longer than max', () => {
    expect(truncate('hello world', 5)).toBe('hello…');
  });

  it('formatDate returns ISO string when toLocaleString throws', () => {
    const spy = vi.spyOn(Date.prototype, 'toLocaleString').mockImplementation(() => {
      throw new Error('locale');
    });
    const iso = '2020-01-15T12:00:00.000Z';
    expect(formatDate(iso)).toBe(iso);
    spy.mockRestore();
  });

  it('sortScript and commonStyles return non-empty strings for HTML injection', () => {
    expect(sortScript().length).toBeGreaterThan(100);
    expect(commonStyles().length).toBeGreaterThan(100);
    expect(sortScript()).toContain('initSort');
  });
});
