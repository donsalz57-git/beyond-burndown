/**
 * Tests for StatusReport component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusReport from './StatusReport';

describe('StatusReport', () => {
  const createMockReport = (overrides = {}) => ({
    generatedAt: '2024-02-01T10:00:00Z',
    headline: {
      feasibility: { score: 82, status: 'green', trend: null },
      forecast: { date: null, extraDays: 0, status: 'on_track', message: 'On track' },
      capacityUtilization: { percent: 85, status: 'green' },
      completion: { percent: 45, status: 'info' }
    },
    schedule: {
      deadline: '2024-02-28T00:00:00Z',
      forecast: '2024-02-28T00:00:00Z',
      buffer: 0,
      bufferLabel: 'On time'
    },
    capacity: {
      available: 100,
      demand: 85,
      timeSpent: 45,
      gap: -15,
      utilizationPercent: 85
    },
    progress: {
      closedCount: 10,
      closedHours: 45,
      remainingCount: 12,
      remainingHours: 55,
      completionPercent: 45
    },
    risks: {
      overloadedPeriods: { count: 1, details: [] },
      complianceViolations: { count: 3, bySeverity: { error: 1, warning: 2, info: 0 } },
      circularDependencies: { count: 0, details: [] },
      overdueIssues: { count: 2, hours: 16 }
    },
    decisions: [],
    confidence: { overallScore: 85, level: 'high', breakdown: {} },
    ...overrides
  });

  test('renders headline metrics', () => {
    render(<StatusReport report={createMockReport()} />);

    expect(screen.getByText('82%')).toBeInTheDocument(); // feasibility
    expect(screen.getByText('85%')).toBeInTheDocument(); // utilization
    expect(screen.getByText('45%')).toBeInTheDocument(); // completion
  });

  test('renders schedule section', () => {
    render(<StatusReport report={createMockReport()} />);

    expect(screen.getByText(/deadline/i)).toBeInTheDocument();
    expect(screen.getByText(/on time/i)).toBeInTheDocument();
  });

  test('renders capacity section', () => {
    render(<StatusReport report={createMockReport()} />);

    expect(screen.getByText(/available.*100/)).toBeInTheDocument();
    expect(screen.getByText(/demand.*85/)).toBeInTheDocument();
  });

  test('renders progress section', () => {
    render(<StatusReport report={createMockReport()} />);

    expect(screen.getByText(/closed.*10/i)).toBeInTheDocument();
    expect(screen.getByText(/remaining.*12/i)).toBeInTheDocument();
  });

  test('renders risks section', () => {
    render(<StatusReport report={createMockReport()} />);

    expect(screen.getByText(/overloaded periods/i)).toBeInTheDocument();
    expect(screen.getByText(/compliance.*3/i)).toBeInTheDocument();
    expect(screen.getByText(/overdue.*2/i)).toBeInTheDocument();
  });

  test('renders decisions when present', () => {
    render(<StatusReport report={createMockReport({
      decisions: [
        {
          priority: 'high',
          title: 'Critical Capacity Shortfall',
          description: 'Feasibility at 40%',
          options: ['Add developers', 'Reduce scope']
        }
      ]
    })} />);

    expect(screen.getByText('Critical Capacity Shortfall')).toBeInTheDocument();
  });

  test('shows forecast warning when behind schedule', () => {
    render(<StatusReport report={createMockReport({
      headline: {
        feasibility: { score: 65, status: 'yellow' },
        forecast: { date: '2024-03-05T00:00:00Z', extraDays: 5, status: 'warning', message: '5 days late' },
        capacityUtilization: { percent: 100, status: 'yellow' },
        completion: { percent: 45, status: 'info' }
      }
    })} />);

    expect(screen.getByText(/5 days late/i)).toBeInTheDocument();
  });

  test('displays generated timestamp', () => {
    render(<StatusReport report={createMockReport()} />);

    expect(screen.getByText(/generated/i)).toBeInTheDocument();
  });

  test('handles critical status', () => {
    const { container } = render(<StatusReport report={createMockReport({
      headline: {
        feasibility: { score: 35, status: 'red' },
        forecast: { date: '2024-03-20T00:00:00Z', extraDays: 20, status: 'critical' },
        capacityUtilization: { percent: 150, status: 'red' },
        completion: { percent: 25, status: 'info' }
      }
    })} />);

    expect(container.querySelector('.status-red')).toBeInTheDocument();
  });

  test('handles null report gracefully', () => {
    render(<StatusReport report={null} />);

    expect(screen.getByText(/no report/i)).toBeInTheDocument();
  });

  test('shows confidence indicator', () => {
    render(<StatusReport report={createMockReport()} />);

    expect(screen.getByText(/confidence.*85/i)).toBeInTheDocument();
  });
});
