/**
 * Tests for ScopeGraph component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScopeGraph from './ScopeGraph';

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />
}));

describe('ScopeGraph', () => {
  const createMockScopeTimeline = () => [
    { date: '2024-01-15', displayDate: 'Jan 15', originalScope: 100, currentScope: 90, completedScope: 10, remainingScope: 80 },
    { date: '2024-01-16', displayDate: 'Jan 16', originalScope: 100, currentScope: 80, completedScope: 20, remainingScope: 60 }
  ];

  const createMockTotals = () => ({
    originalScope: 120,
    currentScope: 70,
    completedScope: 50,
    remainingScope: 70
  });

  test('renders scope chart', () => {
    render(
      <ScopeGraph
        scopeTimeline={createMockScopeTimeline()}
        totals={createMockTotals()}
      />
    );
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  test('handles empty timeline', () => {
    render(
      <ScopeGraph
        scopeTimeline={[]}
        totals={createMockTotals()}
      />
    );
    expect(screen.getByText(/no scope data/i)).toBeInTheDocument();
  });

  test('handles null props gracefully', () => {
    render(
      <ScopeGraph
        scopeTimeline={null}
        totals={null}
      />
    );
    expect(screen.getByText(/no scope data/i)).toBeInTheDocument();
  });
});
