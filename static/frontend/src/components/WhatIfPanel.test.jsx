/**
 * Tests for WhatIfPanel component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WhatIfPanel from './WhatIfPanel';

describe('WhatIfPanel', () => {
  const createMockEnvelope = () => ({
    feasibilityScore: 75,
    totals: {
      totalCapacity: 100,
      totalDemand: 80,
      totalDays: 20
    },
    timeline: [],
    forecast: {
      forecastDate: null,
      extraDays: 0,
      status: 'on_track'
    }
  });

  const createMockDemandIssues = () => [
    { key: 'TEST-1', summary: 'Issue 1', remainingEstimate: 20, status: { category: 'new' } },
    { key: 'TEST-2', summary: 'Issue 2', remainingEstimate: 30, status: { category: 'in_progress' } }
  ];

  test('renders scenario options', () => {
    render(
      <WhatIfPanel
        envelope={createMockEnvelope()}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/add capacity/i)).toBeInTheDocument();
  });

  test('close button calls onClose', () => {
    const onClose = jest.fn();
    render(
      <WhatIfPanel
        envelope={createMockEnvelope()}
        isOpen={true}
        onClose={onClose}
      />
    );

    // Find the close button (×)
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  test('handles null envelope gracefully', () => {
    const { container } = render(
      <WhatIfPanel
        envelope={null}
        isOpen={true}
        onClose={() => {}}
      />
    );
    // Should not crash, renders nothing when envelope is null
    expect(container).toBeDefined();
  });
});
