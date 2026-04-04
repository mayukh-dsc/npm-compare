import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../src/logger.js';

describe('logger', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs info without throwing', () => {
    logger.info('hello');
    expect(logSpy).toHaveBeenCalled();
  });

  it('logs success', () => {
    logger.success('done');
    expect(logSpy).toHaveBeenCalled();
  });

  it('logs warn to console.warn', () => {
    logger.warn('careful');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('logs error to console.error', () => {
    logger.error('oops');
    expect(errSpy).toHaveBeenCalled();
  });

  it('logs critical to console.error', () => {
    logger.critical('bad');
    expect(errSpy).toHaveBeenCalled();
  });

  it('section and newline call console.log', () => {
    logger.section('test');
    logger.newline();
    expect(logSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
