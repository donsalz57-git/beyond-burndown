/**
 * Tests for ExportMenu component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExportMenu from './ExportMenu';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined)
  }
});

describe('ExportMenu', () => {
  const createMockData = () => ({
    envelope: {
      feasibilityScore: 82,
      totals: { totalCapacity: 100, totalDemand: 85, totalTimeSpent: 45 },
      forecast: { message: 'On track' },
      overloadedPeriods: []
    },
    compliance: { summary: { total: 3 } },
    dependencies: { circularDependencies: [] },
    statusReport: {
      headline: {
        capacityUtilization: { percent: 85 },
        completion: { percent: 45 }
      },
      schedule: { deadline: '2024-02-28', bufferLabel: 'On time' },
      progress: { closedCount: 10, remainingCount: 12, closedHours: 45, remainingHours: 55 }
    }
  });

  test('renders export button', () => {
    render(<ExportMenu data={createMockData()} />);
    expect(screen.getByText(/export/i)).toBeInTheDocument();
  });

  test('shows dropdown menu on click', () => {
    render(<ExportMenu data={createMockData()} />);
    fireEvent.click(screen.getByText(/export/i));
    // Menu should open with copy options
    expect(screen.getByText(/text/i)).toBeInTheDocument();
  });

  test('renders nothing when data is null', () => {
    const { container } = render(<ExportMenu data={null} />);
    // Component returns null when data is null
    expect(container.firstChild).toBeNull();
  });
});
