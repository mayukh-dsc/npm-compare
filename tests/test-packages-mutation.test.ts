import { describe, expect, it } from 'vitest';

import { planMockDepMutation } from '../scripts/test-packages-shared.mjs';

describe('planMockDepMutation', () => {
  it('removes smallest index and adds two after max', () => {
    expect(planMockDepMutation([0, 1, 2])).toEqual({
      removeIdx: 0,
      addIndices: [3, 4],
    });
  });

  it('works with a single package', () => {
    expect(planMockDepMutation([5])).toEqual({
      removeIdx: 5,
      addIndices: [6, 7],
    });
  });

  it('works with gaps in indices', () => {
    expect(planMockDepMutation([10, 20, 30])).toEqual({
      removeIdx: 10,
      addIndices: [31, 32],
    });
  });

  it('throws when empty', () => {
    expect(() => planMockDepMutation([])).toThrow(/No mock-dep/);
  });
});
