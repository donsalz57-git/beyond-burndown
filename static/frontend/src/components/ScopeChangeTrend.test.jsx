/**
 * Tests for ScopeChangeTrend component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScopeChangeTrend from './ScopeChangeTrend';

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, data }) => <div data-testid="bar-chart" data-count={data?.length}>{children}</div>,
  Bar: ({ dataKey }) => <div data-testid={`bar-${dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ReferenceLine: () => <div data-testid="reference-line" />
}));

describe('ScopeChangeTrend', () => {
  const createMockTrend = () => ({
    trend: [
      { weekLabel: 'Jan 15', added: 30, removed: 10, netChange: 20, totalScope: 100 },
      { weekLabel: 'Jan 22', added: 15, removed: 5, netChange: 10, totalScope: 110 },
      { weekLabel: 'Jan 29', added: 25, removed: 20, netChange: 5, totalScope: 115 },
      { weekLabel: 'Feb 5', added: 10, removed: 0, netChange: 10, totalScope: 125 }
    ],
    alerts: []
  });

  test('renders trend table', () => {
    render(<ScopeChangeTrend scopeChange={createMockTrend()} />);

    expect(screen.getByText('Jan 15')).toBeInTheDocument();
    expect(screen.getByText('Jan 22')).toBeInTheDocument();
    expect(screen.getByText('Jan 29')).toBeInTheDocument();
    expect(screen.getByText('Feb 5')).toBeInTheDocument();
  });

  test('displays added/removed/net values', () => {
    render(<ScopeChangeTrend scopeChange={createMockTrend()} />);

    // First week values
    expect(screen.getByText('+30')).toBeInTheDocument();
    expect(screen.getByText('-10')).toBeInTheDocument();
    expect(screen.getByText('+20')).toBeInTheDocument();
  });

  test('displays total scope per week', () => {
    render(<ScopeChangeTrend scopeChange={createMockTrend()} />);

    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('110')).toBeInTheDocument();
    expect(screen.getByText('115')).toBeInTheDocument();
    expect(screen.getByText('125')).toBeInTheDocument();
  });

  test('renders bar chart', () => {
    render(<ScopeChangeTrend scopeChange={createMockTrend()} />);

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-count', '4');
  });

  test('renders added and removed bars', () => {
    render(<ScopeChangeTrend scopeChange={createMockTrend()} />);

    expect(screen.getByTestId('bar-added')).toBeInTheDocument();
    expect(screen.getByTestId('bar-removed')).toBeInTheDocument();
  });

  test('displays alerts when present', () => {
    render(<ScopeChangeTrend scopeChange={{
      ...createMockTrend(),
      alerts: [
        { week: 'Jan 22', message: 'Significant scope growth detected', severity: 'warning' }
      ]
    }} />);

    expect(screen.getByText(/significant scope growth/i)).toBeInTheDocument();
  });

  test('handles empty trend', () => {
    render(<ScopeChangeTrend scopeChange={{ trend: [], alerts: [] }} />);

    expect(screen.getByText(/no trend data/i)).toBeInTheDocument();
  });

  test('handles null scopeChange', () => {
    render(<ScopeChangeTrend scopeChange={null} />);

    expect(screen.getByText(/no trend data/i)).toBeInTheDocument();
  });

  test('renders table headers', () => {
    render(<ScopeChangeTrend scopeChange={createMockTrend()} />);

    expect(screen.getByText('Week')).toBeInTheDocument();
    expect(screen.getByText('Added')).toBeInTheDocument();
    expect(screen.getByText('Removed')).toBeInTheDocument();
    expect(screen.getByText('Net Change')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  test('applies positive/negative styling to net change', () => {
    const { container } = render(<ScopeChangeTrend scopeChange={createMockTrend()} />);

    // All net changes in mock data are positive
    const positiveChanges = container.querySelectorAll('.net-positive');
    expect(positiveChanges.length).toBeGreaterThan(0);
  });
});
