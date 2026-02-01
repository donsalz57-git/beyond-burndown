/**
 * Tests for StatusReport component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusReport from './StatusReport';

describe('StatusReport', () => {
  const createMockReport = () => ({
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
    confidence: { overallScore: 85, level: 'high', breakdown: {} }
  });

  test('renders headline metrics', () => {
    render(<StatusReport report={createMockReport()} />);
    // Report should contain feasibility score
    expect(screen.getByText(/82/)).toBeInTheDocument();
  });

  test('handles null report gracefully', () => {
    render(<StatusReport report={null} />);
    expect(screen.getByText(/no report/i)).toBeInTheDocument();
  });
});
