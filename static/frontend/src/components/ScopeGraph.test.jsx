/**
 * Tests for ScopeGraph component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScopeGraph from './ScopeGraph';

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children, data }) => <div data-testid="area-chart" data-count={data?.length}>{children}</div>,
  Area: ({ dataKey }) => <div data-testid={`area-${dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: ({ onClick }) => <div data-testid="legend" onClick={onClick} />
}));

describe('ScopeGraph', () => {
  const createMockScopeTimeline = () => [
    { date: '2024-01-15', displayDate: 'Jan 15', originalScope: 100, currentScope: 90, completedScope: 10 },
    { date: '2024-01-16', displayDate: 'Jan 16', originalScope: 100, currentScope: 80, completedScope: 20 },
    { date: '2024-01-17', displayDate: 'Jan 17', originalScope: 110, currentScope: 85, completedScope: 25 },
    { date: '2024-01-18', displayDate: 'Jan 18', originalScope: 110, currentScope: 75, completedScope: 35 },
    { date: '2024-01-19', displayDate: 'Jan 19', originalScope: 120, currentScope: 70, completedScope: 50 }
  ];

  const createMockTotals = () => ({
    originalScope: 120,
    remainingScope: 70,
    completedScope: 50
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

  test('renders all area traces', () => {
    render(
      <ScopeGraph
        scopeTimeline={createMockScopeTimeline()}
        totals={createMockTotals()}
      />
    );

    expect(screen.getByTestId('area-originalScope')).toBeInTheDocument();
    expect(screen.getByTestId('area-currentScope')).toBeInTheDocument();
    expect(screen.getByTestId('area-completedScope')).toBeInTheDocument();
  });

  test('displays totals summary', () => {
    render(
      <ScopeGraph
        scopeTimeline={createMockScopeTimeline()}
        totals={createMockTotals()}
      />
    );

    expect(screen.getByText(/original.*120/i)).toBeInTheDocument();
    expect(screen.getByText(/remaining.*70/i)).toBeInTheDocument();
    expect(screen.getByText(/completed.*50/i)).toBeInTheDocument();
  });

  test('handles empty timeline', () => {
    render(
      <ScopeGraph
        scopeTimeline={[]}
        totals={{ originalScope: 0, remainingScope: 0, completedScope: 0 }}
      />
    );

    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  test('handles null props gracefully', () => {
    render(
      <ScopeGraph
        scopeTimeline={null}
        totals={null}
      />
    );

    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  test('chart receives correct data count', () => {
    render(
      <ScopeGraph
        scopeTimeline={createMockScopeTimeline()}
        totals={createMockTotals()}
      />
    );

    const chart = screen.getByTestId('area-chart');
    expect(chart).toHaveAttribute('data-count', '5');
  });

  test('renders axis components', () => {
    render(
      <ScopeGraph
        scopeTimeline={createMockScopeTimeline()}
        totals={createMockTotals()}
      />
    );

    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });
});
