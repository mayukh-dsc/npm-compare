import { describe, it, expect } from 'vitest';
import { buildDemoReportData } from '../src/demo-report-data.js';

describe('buildDemoReportData', () => {
  it('produces non-empty introduced and removed diffs', () => {
    const { diff, graph, baselineGraph } = buildDemoReportData();
    expect(diff.introduced.length).toBeGreaterThan(0);
    expect(diff.removed.length).toBeGreaterThan(0);
    expect(graph.nodes.size).toBeGreaterThan(baselineGraph.nodes.size);
    expect(baselineGraph.projectName).toBe('demo-project');
  });
});
