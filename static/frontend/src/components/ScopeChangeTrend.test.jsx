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
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ReferenceLine: () => <div data-testid="reference-line" />
}));

describe('ScopeChangeTrend', () => {
  const createMockTrend = () => [
    { weekLabel: 'Jan 15', added: 30, removed: 10, netChange: 20, totalScope: 100 },
    { weekLabel: 'Jan 22', added: 15, removed: 5, netChange: 10, totalScope: 110 }
  ];

  test('renders trend table', () => {
    render(<ScopeChangeTrend trend={createMockTrend()} alerts={[]} />);
    expect(screen.getByText('Jan 15')).toBeInTheDocument();
    expect(screen.getByText('Jan 22')).toBeInTheDocument();
  });

  test('handles empty trend', () => {
    render(<ScopeChangeTrend trend={[]} alerts={[]} />);
    expect(screen.getByText(/no trend data/i)).toBeInTheDocument();
  });

  test('handles null trend', () => {
    render(<ScopeChangeTrend trend={null} alerts={[]} />);
    expect(screen.getByText(/no trend data/i)).toBeInTheDocument();
  });
});
