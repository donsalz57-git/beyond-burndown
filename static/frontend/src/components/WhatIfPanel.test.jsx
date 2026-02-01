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
    forecast: {
      forecastDate: null,
      extraDays: 0,
      status: 'on_track'
    }
  });

  const createMockDemandIssues = () => [
    { key: 'TEST-1', summary: 'Issue 1', remainingEstimate: 20, status: { category: 'new' } },
    { key: 'TEST-2', summary: 'Issue 2', remainingEstimate: 30, status: { category: 'in_progress' } },
    { key: 'TEST-3', summary: 'Issue 3', remainingEstimate: 15, status: { category: 'new' } }
  ];

  test('renders scenario type selector', () => {
    render(
      <WhatIfPanel
        envelope={createMockEnvelope()}
        demandIssues={createMockDemandIssues()}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/add capacity/i)).toBeInTheDocument();
    expect(screen.getByText(/remove scope/i)).toBeInTheDocument();
    expect(screen.getByText(/extend deadline/i)).toBeInTheDocument();
  });

  test('shows current feasibility score', () => {
    render(
      <WhatIfPanel
        envelope={createMockEnvelope()}
        demandIssues={createMockDemandIssues()}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/current.*75/i)).toBeInTheDocument();
  });

  test('add capacity scenario shows developer input', () => {
    render(
      <WhatIfPanel
        envelope={createMockEnvelope()}
        demandIssues={createMockDemandIssues()}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByText(/add capacity/i));

    expect(screen.getByLabelText(/developers/i)).toBeInTheDocument();
  });

  test('add capacity calculates new score', () => {
    render(
      <WhatIfPanel
        envelope={createMockEnvelope()}
        demandIssues={createMockDemandIssues()}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByText(/add capacity/i));
    const input = screen.getByLabelText(/developers/i);
    fireEvent.change(input, { target: { value: '2' } });

    // Should show new calculated score
    expect(screen.getByText(/new.*score/i)).toBeInTheDocument();
  });

  test('remove scope scenario shows issue checkboxes', () => {
    render(
      <WhatIfPanel
        envelope={createMockEnvelope()}
        demandIssues={createMockDemandIssues()}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByText(/remove scope/i));

    expect(screen.getByText('TEST-1')).toBeInTheDocument();
    expect(screen.getByText('TEST-2')).toBeInTheDocument();
    expect(screen.getByText('TEST-3')).toBeInTheDocument();
  });

  test('remove scope shows hours saved when issues selected', () => {
    render(
      <WhatIfPanel
        envelope={createMockEnvelope()}
        demandIssues={createMockDemandIssues()}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByText(/remove scope/i));
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);

    expect(screen.getByText(/hours saved/i)).toBeInTheDocument();
  });

  test('extend deadline scenario shows weeks input', () => {
    render(
      <WhatIfPanel
        envelope={createMockEnvelope()}
        demandIssues={createMockDemandIssues()}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByText(/extend deadline/i));

    expect(screen.getByLabelText(/weeks/i)).toBeInTheDocument();
  });

  test('close button calls onClose', () => {
    const onClose = jest.fn();
    render(
      <WhatIfPanel
        envelope={createMockEnvelope()}
        demandIssues={createMockDemandIssues()}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText(/close/i));

    expect(onClose).toHaveBeenCalled();
  });

  test('handles null envelope gracefully', () => {
    render(
      <WhatIfPanel
        envelope={null}
        demandIssues={createMockDemandIssues()}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });
});
