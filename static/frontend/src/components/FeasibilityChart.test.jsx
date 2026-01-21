import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FeasibilityChart from './FeasibilityChart';

// Mock Recharts components to avoid canvas issues in tests
jest.mock('recharts', () => ({
  ComposedChart: ({ children }) => <div data-testid="composed-chart">{children}</div>,
  Area: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  ReferenceLine: () => null
}));

describe('FeasibilityChart', () => {
  const mockEnvelope = {
    timeline: [
      {
        date: '2026-01-19',
        displayDate: 'Jan 19',
        capacity: 8,
        demand: 6,
        originalEstimate: 10,
        timeSpent: 4,
        cumulativeCapacity: 8,
        cumulativeDemand: 6,
        cumulativeOriginalEstimate: 10,
        cumulativeTimeSpent: 4,
        completionPercent: 40,
        overload: 0,
        isOverloaded: false
      },
      {
        date: '2026-01-20',
        displayDate: 'Jan 20',
        capacity: 8,
        demand: 10,
        originalEstimate: 10,
        timeSpent: 6,
        cumulativeCapacity: 16,
        cumulativeDemand: 16,
        cumulativeOriginalEstimate: 20,
        cumulativeTimeSpent: 10,
        completionPercent: 50,
        overload: 0,
        isOverloaded: false
      }
    ],
    overloadedPeriods: [],
    feasibilityScore: 85,
    totals: {
      totalDemand: 16,
      totalCapacity: 16,
      totalTimeSpent: 10
    }
  };

  test('renders empty state when no envelope', () => {
    render(<FeasibilityChart envelope={null} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  test('renders empty state when envelope has no timeline', () => {
    render(<FeasibilityChart envelope={{ timeline: [] }} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  test('renders feasibility score', () => {
    render(<FeasibilityChart envelope={mockEnvelope} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  test('renders totals summary', () => {
    render(<FeasibilityChart envelope={mockEnvelope} />);
    expect(screen.getByText(/16.0h demand/)).toBeInTheDocument();
    expect(screen.getByText(/16.0h capacity/)).toBeInTheDocument();
  });

  test('renders period selector with all options', () => {
    render(<FeasibilityChart envelope={mockEnvelope} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();
  });

  test('changes period when selector changes', () => {
    render(<FeasibilityChart envelope={mockEnvelope} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'weekly' } });
    expect(select.value).toBe('weekly');
  });

  test('renders chart container', () => {
    render(<FeasibilityChart envelope={mockEnvelope} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  test('renders legend items', () => {
    render(<FeasibilityChart envelope={mockEnvelope} />);
    expect(screen.getByText('Cumulative Capacity')).toBeInTheDocument();
    expect(screen.getByText('Cumulative Demand')).toBeInTheDocument();
    expect(screen.getByText('Cumulative Time Spent')).toBeInTheDocument();
    expect(screen.getByText('Completion %')).toBeInTheDocument();
  });

  test('renders overloaded period warnings when present', () => {
    const envelopeWithOverload = {
      ...mockEnvelope,
      overloadedPeriods: [
        {
          startDate: 'Jan 21',
          endDate: 'Jan 23',
          days: 3,
          maxOverload: 5
        }
      ]
    };
    render(<FeasibilityChart envelope={envelopeWithOverload} />);
    expect(screen.getByText(/Overloaded:/)).toBeInTheDocument();
    expect(screen.getByText(/3 days/)).toBeInTheDocument();
  });

  test('applies correct color for low feasibility score', () => {
    const lowScoreEnvelope = {
      ...mockEnvelope,
      feasibilityScore: 30
    };
    render(<FeasibilityChart envelope={lowScoreEnvelope} />);
    const scoreElement = screen.getByText('30%');
    expect(scoreElement).toHaveStyle({ color: '#DE350B' });
  });

  test('applies correct color for medium feasibility score', () => {
    const mediumScoreEnvelope = {
      ...mockEnvelope,
      feasibilityScore: 65
    };
    render(<FeasibilityChart envelope={mediumScoreEnvelope} />);
    const scoreElement = screen.getByText('65%');
    expect(scoreElement).toHaveStyle({ color: '#FF8B00' });
  });

  test('applies correct color for high feasibility score', () => {
    render(<FeasibilityChart envelope={mockEnvelope} />);
    const scoreElement = screen.getByText('85%');
    expect(scoreElement).toHaveStyle({ color: '#00875A' });
  });
});

describe('aggregateTimeline function', () => {
  // Test the aggregation logic by observing component behavior
  const mockTimelineData = {
    timeline: [
      { date: '2026-01-19', displayDate: 'Jan 19', capacity: 8, demand: 6, originalEstimate: 10, timeSpent: 4 },
      { date: '2026-01-20', displayDate: 'Jan 20', capacity: 8, demand: 10, originalEstimate: 10, timeSpent: 6 },
      { date: '2026-01-21', displayDate: 'Jan 21', capacity: 8, demand: 8, originalEstimate: 10, timeSpent: 5 },
      { date: '2026-01-22', displayDate: 'Jan 22', capacity: 8, demand: 7, originalEstimate: 10, timeSpent: 5 },
      { date: '2026-01-23', displayDate: 'Jan 23', capacity: 8, demand: 9, originalEstimate: 10, timeSpent: 6 }
    ],
    overloadedPeriods: [],
    feasibilityScore: 75,
    totals: { totalDemand: 40, totalCapacity: 40, totalTimeSpent: 26 }
  };

  test('renders daily view by default', () => {
    render(<FeasibilityChart envelope={mockTimelineData} />);
    const select = screen.getByRole('combobox');
    expect(select.value).toBe('daily');
  });

  test('can switch to weekly aggregation', () => {
    render(<FeasibilityChart envelope={mockTimelineData} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'weekly' } });
    expect(select.value).toBe('weekly');
  });

  test('can switch to monthly aggregation', () => {
    render(<FeasibilityChart envelope={mockTimelineData} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'monthly' } });
    expect(select.value).toBe('monthly');
  });
});
